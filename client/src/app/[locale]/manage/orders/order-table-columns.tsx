'use client'

import { DotsHorizontalIcon } from '@radix-ui/react-icons'
import { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { GetOrdersResType } from '@/schemaValidations/order.schema'
import { useContext } from 'react'
import {
  formatCurrency,
  formatDateTimeToLocaleString,
  getVietnameseOrderStatus,
  simpleMatchText
} from '@/lib/utils'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { OrderStatus, OrderStatusValues } from '@/constants/type'
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover'
import { OrderTableContext } from '@/app/[locale]/manage/orders/order-table'
import OrderGuestDetail from '@/app/[locale]/manage/orders/order-guest-detail'

type OrderItem = GetOrdersResType['data'][0]

const orderTableColumns: ColumnDef<OrderItem>[] = [
  {
    accessorKey: 'tableNumber',
    header: 'Bàn',
    cell: ({ row }) => <div>{row.getValue('tableNumber')}</div>,
    filterFn: (row, columnId, filterValue: string) => {
      if (filterValue === undefined) return true
      return simpleMatchText(
        String(row.getValue(columnId)),
        String(filterValue)
      )
    }
  },
  {
    id: 'guestName',
    header: 'Khách hàng',
    cell: function Cell({ row }) {
      const { orderObjectByGuestId } = useContext(OrderTableContext)
      const guest = row.original.guest
      return (
        <div>
          {!guest && (
            <div>
              <span>Đã bị xóa</span>
            </div>
          )}
          {guest && (
            <Popover>
              <PopoverTrigger>
                <div>
                  <span>{guest.name}</span>
                  <span className='font-semibold'>(#{guest.id})</span>
                </div>
              </PopoverTrigger>
              <PopoverContent className='w-[320px] sm:w-[440px]'>
                <OrderGuestDetail
                  guest={guest}
                  orders={orderObjectByGuestId[guest.id]}
                />
              </PopoverContent>
            </Popover>
          )}
        </div>
      )
    },
    filterFn: (row, columnId, filterValue: string) => {
      if (filterValue === undefined) return true
      return simpleMatchText(
        row.original.guest?.name ?? 'Đã bị xóa',
        String(filterValue)
      )
    }
  },
  {
    id: 'dishName',
    header: 'Món ăn',
    cell: ({ row }) => (
      <div className='flex items-center gap-2'>
        <Popover>
          <PopoverTrigger asChild>
            <Image
              src={row.original.dishSnapshot.image}
              alt={row.original.dishSnapshot.name}
              width={50}
              height={50}
              className='rounded-md object-cover w-[50px] h-[50px] cursor-pointer'
            />
          </PopoverTrigger>
          <PopoverContent>
            <div className='flex flex-wrap gap-2'>
              <Image
                src={row.original.dishSnapshot.image}
                alt={row.original.dishSnapshot.name}
                width={100}
                height={100}
                className='rounded-md object-cover w-[100px] h-[100px]'
              />
              <div className='space-y-1 text-sm'>
                <h3 className='font-semibold'>
                  {row.original.dishSnapshot.name}
                </h3>
                <div className='italic'>
                  {formatCurrency(row.original.dishSnapshot.price)}
                </div>
                <div>{row.original.dishSnapshot.description}</div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <div className='space-y-2'>
          <div className='flex items-center gap-2'>
            <span>{row.original.dishSnapshot.name}</span>
            <Badge className='px-1' variant={'secondary'}>
              x{row.original.quantity}
            </Badge>
          </div>
          <span className='italic'>
            {formatCurrency(
              row.original.dishSnapshot.price * row.original.quantity
            )}
          </span>
        </div>
      </div>
    )
  },
  {
    accessorKey: 'status',
    header: 'Trạng thái',
    cell: function Cell({ row }) {
      const { changeStatus } = useContext(OrderTableContext)
      const currentStatus = row.getValue('status') as string

      // Logic: Khóa Select nếu đơn đã Thanh toán hoặc đơn cũ đã Từ chối
      const isFinalStatus = currentStatus === OrderStatus.Paid || currentStatus === OrderStatus.Rejected

      const changeOrderStatus = async (
        status: (typeof OrderStatusValues)[number]
      ) => {
        changeStatus({
          orderId: row.original.id,
          dishId: row.original.dishSnapshot.dishId!,
          status: status,
          quantity: row.original.quantity
        })
      }

      return (
        <Select
          onValueChange={(value: (typeof OrderStatusValues)[number]) => {
            changeOrderStatus(value)
          }}
          value={currentStatus}
          disabled={isFinalStatus}
        >
          <SelectTrigger className='w-[140px]'>
            <SelectValue placeholder='Trạng thái' />
          </SelectTrigger>
          <SelectContent>
            {OrderStatusValues.map((status) => {
              // Bỏ trạng thái "Từ chối" ra khỏi menu lựa chọn
              if (status === OrderStatus.Rejected) return null

              let isDisabled = true

              // 1. Luôn cho phép hiển thị trạng thái hiện tại
              if (status === currentStatus) isDisabled = false

              // 2. Chờ xử lý -> Đang nấu
              if (currentStatus === OrderStatus.Pending && status === OrderStatus.Processing) {
                isDisabled = false
              }

              // 3. Đang nấu -> Đã phục vụ
              if (currentStatus === OrderStatus.Processing && status === OrderStatus.Delivered) {
                isDisabled = false
              }

              // 4. Đã phục vụ -> Đã thanh toán
              if (currentStatus === OrderStatus.Delivered && status === OrderStatus.Paid) {
                isDisabled = false
              }

              return (
                <SelectItem key={status} value={status} disabled={isDisabled}>
                  {getVietnameseOrderStatus(status)}
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      )
    }
  },
  {
    id: 'orderHandlerName',
    header: 'Người xử lý',
    cell: ({ row }) => <div>{row.original.orderHandler?.name ?? ''}</div>
  },
  {
    accessorKey: 'createdAt',
    header: () => <div>Tạo/Cập nhật</div>,
    cell: ({ row }) => (
      <div className='space-y-2 text-sm'>
        <div className='flex items-center space-x-4'>
          {formatDateTimeToLocaleString(row.getValue('createdAt'))}
        </div>
        <div className='flex items-center space-x-4'>
          {formatDateTimeToLocaleString(
            row.original.updatedAt as unknown as string
          )}
        </div>
      </div>
    )
  },
  {
    id: 'actions',
    enableHiding: false,
    cell: function Actions({ row }) {
      const { setOrderIdEdit } = useContext(OrderTableContext)
      const currentStatus = row.getValue('status') as string

      // Khóa nút "Sửa" nếu đơn hàng đã vào trạng thái cuối (Paid/Rejected)
      const isLocked = currentStatus === OrderStatus.Paid || currentStatus === OrderStatus.Rejected

      const openEditOrder = () => {
        if (!isLocked) {
          setOrderIdEdit(row.original.id)
        }
      }

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='ghost' className='h-8 w-8 p-0'>
              <span className='sr-only'>Open menu</span>
              <DotsHorizontalIcon className='h-4 w-4' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={openEditOrder} 
              disabled={isLocked}
              className={isLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            >
              Sửa
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }
  }
]

export default orderTableColumns