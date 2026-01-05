import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { OrderStatus } from '@/constants/type'
import {
  OrderStatusIcon,
  formatCurrency,
  formatDateTimeToLocaleString,
  formatDateTimeToTimeString,
  getVietnameseOrderStatus,
  handleErrorApi
} from '@/lib/utils'
import { usePayForGuestMutation } from '@/queries/useOrder'
import {
  GetOrdersResType,
  PayGuestOrdersResType
} from '@/schemaValidations/order.schema'
import Image from 'next/image'
import { Fragment, useRef, useMemo } from 'react'
import InvoiceUI from '@/components/InvoiceUI'
import { InvoiceData } from '@/types/invoice.types'

type Guest = GetOrdersResType['data'][0]['guest']
type Orders = GetOrdersResType['data']

export default function OrderGuestDetail({
  guest,
  orders,
  onPaySuccess
}: {
  guest: Guest
  orders: Orders
  onPaySuccess?: (data: PayGuestOrdersResType) => void
}) {
  const ordersFilterToPurchase = guest
    ? orders.filter(
        (order) =>
          order.status !== OrderStatus.Paid &&
          order.status !== OrderStatus.Rejected
      )
    : []
  const purchasedOrderFilter = guest
    ? orders.filter((order) => order.status === OrderStatus.Paid)
    : []
  
  const payForGuestMutation = usePayForGuestMutation()
  const invoiceRef = useRef<HTMLDivElement>(null)
  const invoiceData: InvoiceData = useMemo(() => {
    const total = orders.reduce((acc, order) => {
        if (order.status !== OrderStatus.Rejected) {
            return acc + (order.quantity * order.dishSnapshot.price)
        }
        return acc
    }, 0)

    return {
      id: `HD-${guest?.id || '000'}`,
      customerName: guest?.name || 'Khách lẻ',
      tableNumber: guest?.tableNumber || 0,
      date: new Date().toLocaleString('vi-VN'),
      items: orders.map((order) => ({
        id: order.id,
        name: order.dishSnapshot.name,
        quantity: order.quantity,
        price: order.dishSnapshot.price
      })),
      subtotal: total,
      total: total,
      discount: 0
    }
  }, [guest, orders])
  const handleDownloadPDF = async () => {
    const element = invoiceRef.current;
    if (!element) {
        alert("Lỗi: Không tìm thấy hóa đơn để in!");
        return;
    }

    try {
        console.log("Đang khởi tạo thư viện in...");
        const html2pdf = (await import('html2pdf.js')).default;
        
        const opt = {
            margin: 0,
            filename: `Hoa_don_${guest?.tableNumber}_${Date.now()}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, logging: true }, // Bật logging để check lỗi
            jsPDF: { unit: 'mm', format: 'a5', orientation: 'portrait' }
        };

        console.log("Bắt đầu tạo PDF...");
      
        await (html2pdf() as any).set(opt).from(element).save();
        console.log("Đã tải xong!");

    } catch (err) {
        console.error("Lỗi khi tải PDF:", err);
        alert("Lỗi khi tạo PDF. Vui lòng kiểm tra Console (F12)");
    }
  }

  // 3. Hàm Thanh toán & Lưu hóa đơn
  const pay = async () => {
    if (payForGuestMutation.isPending || !guest) return
    try {
      // Gọi API Thanh toán
      const result = await payForGuestMutation.mutateAsync({
        guestId: guest.id
      })
      
      // Tải hóa đơn
      await handleDownloadPDF()

      // Cập nhật UI
      setTimeout(() => {
         onPaySuccess && onPaySuccess(result.payload)
      }, 1500) // Tăng thời gian đợi lên 1.5s để chắc chắn tải xong

    } catch (error) {
      handleErrorApi({ error })
    }
  }

  return (
    <div className='space-y-2 text-sm relative'>
      
      {}
      {}
      <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: '-9999px', 
          width: '148mm', 
          zIndex: -9999
      }}>
         <InvoiceUI ref={invoiceRef} data={invoiceData} />
      </div>
      {/* ----------------- */}

      {guest && (
        <Fragment>
          <div className='space-x-1'>
            <span className='font-semibold'>Tên:</span>
            <span>{guest.name}</span>
            <span className='font-semibold'>(#{guest.id})</span>
            <span>|</span>
            <span className='font-semibold'>Bàn:</span>
            <span>{guest.tableNumber}</span>
          </div>
          <div className='space-x-1'>
            <span className='font-semibold'>Ngày đăng ký:</span>
            <span>{formatDateTimeToLocaleString(guest.createdAt)}</span>
          </div>
        </Fragment>
      )}

      <div className='space-y-1'>
        <div className='font-semibold'>Đơn hàng:</div>
        {orders.map((order, index) => {
          return (
            <div key={order.id} className='flex gap-2 items-center text-xs'>
              <span className='w-[10px]'>{index + 1}</span>
              <span title={getVietnameseOrderStatus(order.status)}>
                {order.status === OrderStatus.Pending && <OrderStatusIcon.Pending className='w-4 h-4' />}
                {order.status === OrderStatus.Processing && <OrderStatusIcon.Processing className='w-4 h-4' />}
                {order.status === OrderStatus.Rejected && <OrderStatusIcon.Rejected className='w-4 h-4 text-red-400' />}
                {order.status === OrderStatus.Delivered && <OrderStatusIcon.Delivered className='w-4 h-4' />}
                {order.status === OrderStatus.Paid && <OrderStatusIcon.Paid className='w-4 h-4 text-yellow-400' />}
              </span>
              <Image
                src={order.dishSnapshot.image}
                alt={order.dishSnapshot.name}
                width={30}
                height={30}
                className='h-[30px] w-[30px] rounded object-cover'
              />
              <span className='truncate w-[70px] sm:w-[100px]'>{order.dishSnapshot.name}</span>
              <span className='font-semibold'>x{order.quantity}</span>
              <span className='italic'>{formatCurrency(order.quantity * order.dishSnapshot.price)}</span>
            </div>
          )
        })}
      </div>

      <div className='space-x-1'>
        <span className='font-semibold'>Chưa thanh toán:</span>
        <Badge>
          <span>{formatCurrency(ordersFilterToPurchase.reduce((acc, order) => acc + order.quantity * order.dishSnapshot.price, 0))}</span>
        </Badge>
      </div>
      <div className='space-x-1'>
        <span className='font-semibold'>Đã thanh toán:</span>
        <Badge variant={'outline'}>
          <span>
            {formatCurrency(
              purchasedOrderFilter.reduce((acc, order) => {
                return acc + order.quantity * order.dishSnapshot.price
              }, 0)
            )}
          </span>
        </Badge>
      </div>
      
      <div>
        <Button
          className='w-full'
          size={'sm'}
          variant={'secondary'}
          disabled={ordersFilterToPurchase.length === 0 || payForGuestMutation.isPending}
          onClick={pay}
        >
          {payForGuestMutation.isPending ? 'Đang xử lý...' : `Thanh toán `}
        </Button>
      </div>
    </div>
  )
}