import { DishStatus, OrderStatus, TableStatus } from '@/constants/type'
import prisma from '@/database'
import { CreateOrdersBodyType, UpdateOrderBodyType } from '@/schemaValidations/order.schema'

export const createOrdersController = async (orderHandlerId: number, body: CreateOrdersBodyType) => {
  const { guestId, orders } = body
  const guest = await prisma.guest.findUniqueOrThrow({
    where: {
      id: guestId
    }
  })
  if (guest.tableNumber === null) {
    throw new Error('Bàn gắn liền với khách hàng này đã bị xóa, vui lòng chọn khách hàng khác!')
  }
  const table = await prisma.table.findUniqueOrThrow({
    where: {
      number: guest.tableNumber
    }
  })
  if (table.status === TableStatus.Hidden) {
    throw new Error(`Bàn ${table.number} gắn liền với khách hàng đã bị ẩn, vui lòng chọn khách hàng khác!`)
  }

  const [ordersRecord, socketRecord] = await Promise.all([
    prisma.$transaction(async (tx) => {
      const ordersRecord = await Promise.all(
        orders.map(async (order) => {
          const dish = await tx.dish.findUniqueOrThrow({
            where: {
              id: order.dishId
            }
          })
          if (dish.status === DishStatus.Unavailable) {
            throw new Error(`Món ${dish.name} đã hết`)
          }
          if (dish.status === DishStatus.Hidden) {
            throw new Error(`Món ${dish.name} không thể đặt`)
          }
          const dishSnapshot = await tx.dishSnapshot.create({
            data: {
              description: dish.description,
              image: dish.image,
              name: dish.name,
              price: dish.price,
              dishId: dish.id,
              status: dish.status
            }
          })
          const orderRecord = await tx.order.create({
            data: {
              dishSnapshotId: dishSnapshot.id,
              guestId,
              quantity: order.quantity,
              tableNumber: guest.tableNumber,
              orderHandlerId,
              status: OrderStatus.Pending
            },
            include: {
              dishSnapshot: true,
              guest: true,
              orderHandler: true
            }
          })
          type OrderRecord = typeof orderRecord
          return orderRecord as OrderRecord & {
            status: (typeof OrderStatus)[keyof typeof OrderStatus]
            dishSnapshot: OrderRecord['dishSnapshot'] & {
              status: (typeof DishStatus)[keyof typeof DishStatus]
            }
          }
        })
      )
      return ordersRecord
    }),
    prisma.socket.findUnique({
      where: {
        guestId: body.guestId
      }
    })
  ])
  return {
    orders: ordersRecord,
    socketId: socketRecord?.socketId
  }
}

export const getOrdersController = async ({ fromDate, toDate }: { fromDate?: Date; toDate?: Date }) => {
  const orders = await prisma.order.findMany({
    include: {
      dishSnapshot: true,
      orderHandler: true,
      guest: true
    },
    orderBy: {
      createdAt: 'desc'
    },
    where: {
      createdAt: {
        gte: fromDate,
        lte: toDate
      }
    }
  })
  return orders
}

// Controller thanh toán các hóa đơn dựa trên guestId
export const payOrdersController = async ({ guestId, orderHandlerId }: { guestId: number; orderHandlerId: number }) => {
  const orders = await prisma.order.findMany({
    where: {
      guestId,
      status: {
        in: [OrderStatus.Pending, OrderStatus.Processing, OrderStatus.Delivered]
      }
    }
  })
  if (orders.length === 0) {
    throw new Error('Không có hóa đơn nào cần thanh toán')
  }
  await prisma.$transaction(async (tx) => {
    const orderIds = orders.map((order) => order.id)
    const updatedOrders = await tx.order.updateMany({
      where: {
        id: {
          in: orderIds
        }
      },
      data: {
        status: OrderStatus.Paid,
        orderHandlerId
      }
    })

    // [ĐÃ THÊM FIX 1] - Ép vị khách này đăng xuất (xóa token) để giải phóng bàn
    await tx.guest.update({
      where: {
        id: guestId
      },
      data: {
        refreshToken: null,
        refreshTokenExpiresAt: null
      }
    })

    return updatedOrders
  })
  const [ordersResult, sockerRecord] = await Promise.all([
    prisma.order.findMany({
      where: {
        id: {
          in: orders.map((order) => order.id)
        }
      },
      include: {
        dishSnapshot: true,
        orderHandler: true,
        guest: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    }),
    prisma.socket.findUnique({
      where: {
        guestId
      }
    })
  ])
  return {
    orders: ordersResult,
    socketId: sockerRecord?.socketId
  }
}

export const getOrderDetailController = (orderId: number) => {
  return prisma.order.findUniqueOrThrow({
    where: {
      id: orderId
    },
    include: {
      dishSnapshot: true,
      orderHandler: true,
      guest: true,
      table: true
    }
  })
}

export const updateOrderController = async (
  orderId: number,
  body: UpdateOrderBodyType & { orderHandlerId: number }
) => {
  const { status, dishId, quantity, orderHandlerId } = body
  const result = await prisma.$transaction(async (tx) => {
    // 1. Lấy thông tin đơn hàng hiện tại
    const order = await tx.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { dishSnapshot: true }
    })

    // --- BẮT ĐẦU LOGIC KIỂM TRA CHẶN TRẠNG THÁI ---
    const currentStatus = order.status

    // A. Nếu đơn đã THANH TOÁN  -> Khóa tuyệt đối
    if (currentStatus === OrderStatus.Paid || currentStatus === OrderStatus.Rejected) {
      throw new Error('Đơn hàng đã hoàn tất hoặc bị từ chối, không thể thay đổi thông tin.')
    }

    // B. Nếu đơn ĐANG NẤU (Processing) -> Chỉ được chuyển sang ĐÃ PHỤC VỤ (Delivered)
    if (currentStatus === OrderStatus.Processing && status !== OrderStatus.Delivered && status !== currentStatus) {
      throw new Error('Đơn hàng đang nấu chỉ có thể chuyển sang trạng thái "Đã phục vụ".')
    }

    // C. Nếu đơn ĐÃ PHỤC VỤ (Delivered) -> Chỉ được chuyển sang THANH TOÁN (Paid)
    if (currentStatus === OrderStatus.Delivered && status !== OrderStatus.Paid && status !== currentStatus) {
      throw new Error('Đơn hàng đã phục vụ chỉ có thể chuyển sang trạng thái "Thanh toán".')
    }
    // --- KẾT THÚC LOGIC KIỂM TRA ---

    let dishSnapshotId = order.dishSnapshotId
    if (order.dishSnapshot.dishId !== dishId) {
      const dish = await tx.dish.findUniqueOrThrow({ where: { id: dishId } })
      const dishSnapshot = await tx.dishSnapshot.create({
        data: {
          description: dish.description,
          image: dish.image,
          name: dish.name,
          price: dish.price,
          dishId: dish.id,
          status: dish.status
        }
      })
      dishSnapshotId = dishSnapshot.id
    }

    const newOrder = await tx.order.update({
      where: { id: orderId },
      data: {
        status, // Cập nhật trạng thái mới đã qua kiểm tra
        dishSnapshotId,
        quantity,
        orderHandlerId
      },
      include: {
        dishSnapshot: true,
        orderHandler: true,
        guest: true
      }
    })

    // [ĐÃ THÊM FIX 2] - Nếu nhân viên đổi trạng thái món này thành Paid thì cũng xóa token khách
    if (status === OrderStatus.Paid && newOrder.guestId) {
      await tx.guest.update({
        where: { id: newOrder.guestId },
        data: {
          refreshToken: null,
          refreshTokenExpiresAt: null
        }
      })
    }

    return newOrder
  })

  const socketRecord = await prisma.socket.findUnique({
    where: { guestId: result.guestId! }
  })
  return { order: result, socketId: socketRecord?.socketId }
}