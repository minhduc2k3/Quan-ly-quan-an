'use client'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input' // Nhớ import Input
import { useDishListQuery } from '@/queries/useDish'
import { cn, formatCurrency, handleErrorApi } from '@/lib/utils'
import Quantity from '@/app/[locale]/guest/menu/quantity'
import { useMemo, useState } from 'react'
import { GuestCreateOrdersBodyType } from '@/schemaValidations/guest.schema'
import { useGuestOrderMutation } from '@/queries/useGuest'
import { DishStatus } from '@/constants/type'
import { useRouter } from '@/i18n/routing'

export default function MenuOrder() {
  const { data } = useDishListQuery()
  const dishes = useMemo(() => data?.payload.data ?? [], [data])
  const [orders, setOrders] = useState<GuestCreateOrdersBodyType>([])
  const { mutateAsync } = useGuestOrderMutation()
  const router = useRouter()
  
  // State cho thanh tìm kiếm
  const [searchValue, setSearchValue] = useState('')

  const totalPrice = useMemo(() => {
    return dishes.reduce((result, dish) => {
      const order = orders.find((order) => order.dishId === dish.id)
      if (!order) return result
      return result + order.quantity * dish.price
    }, 0)
  }, [dishes, orders])

  // Lọc món ăn dựa trên trạng thái và từ khóa tìm kiếm
  const filteredDishes = useMemo(() => {
    return dishes.filter((dish) => {
      const isVisible = dish.status !== DishStatus.Hidden
      const matchesSearch = dish.name.toLowerCase().includes(searchValue.toLowerCase())
      return isVisible && matchesSearch
    })
  }, [dishes, searchValue])

  const handleQuantityChange = (dishId: number, quantity: number) => {
    setOrders((prevOrders) => {
      if (quantity === 0) {
        return prevOrders.filter((order) => order.dishId !== dishId)
      }
      const index = prevOrders.findIndex((order) => order.dishId === dishId)
      if (index === -1) {
        // Mặc định thêm note rỗng khi chọn món mới
        // @ts-ignore: Nếu TypeScript báo lỗi thiếu trường note, hãy update schema của bạn
        return [...prevOrders, { dishId, quantity, note: '' }]
      }
      const newOrders = [...prevOrders]
      newOrders[index] = { ...newOrders[index], quantity }
      return newOrders
    })
  }

  

  const handleOrder = async () => {
    try {
      await mutateAsync(orders)
      router.push(`/guest/orders`)
    } catch (error) {
      handleErrorApi({
        error
      })
    }
  }

  return (
    <>
      {/* Thanh tìm kiếm */}
      <div className="mb-4 sticky top-0 z-10 bg-white py-2">
         <Input 
            placeholder="Tìm kiếm món ăn..." 
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
                // h-9: Chiều cao nhỏ (36px). rounded-full: Bo tròn hiện đại.
                // text-black: Chữ đen rõ. bg-gray-100: Nền xám nhạt dịu mắt.
            className="w-full h-9 text-sm font-medium text-black placeholder:text-gray-400 border-none bg-gray-100 focus-visible:ring-1 focus-visible:ring-primary rounded-full px-4"
            
         />
      </div>

      {filteredDishes.map((dish) => {
         // Tìm order hiện tại của món này để lấy quantity và note
         const currentOrder = orders.find((order) => order.dishId === dish.id)
         
         return (
          <div
            key={dish.id}
            className={cn('flex flex-col gap-2 mb-4 p-2 border-b pb-4', {
              'pointer-events-none': dish.status === DishStatus.Unavailable
            })}
          >
            {/* Hàng hiển thị thông tin món và nút tăng giảm */}
            <div className='flex gap-4'>
                <div className='flex-shrink-0 relative'>
                {dish.status === DishStatus.Unavailable && (
                    <span className='absolute inset-0 flex items-center justify-center text-sm bg-black/50 text-white rounded-md z-10'>
                    Hết hàng
                    </span>
                )}
                <Image
                    src={dish.image}
                    alt={dish.name}
                    height={100}
                    width={100}
                    quality={100}
                    className='object-cover w-[80px] h-[80px] rounded-md'
                />
                </div>
                <div className='space-y-1 flex-1'>
                <h3 className='text-sm font-bold'>{dish.name}</h3>
                <p className='text-xs text-gray-500 line-clamp-2'>{dish.description}</p>
                <p className='text-xs font-semibold'>
                    {formatCurrency(dish.price)}
                </p>
                </div>
                <div className='flex-shrink-0 ml-auto flex justify-center items-center'>
                <Quantity
                    onChange={(value) => handleQuantityChange(dish.id, value)}
                    value={currentOrder?.quantity ?? 0}
                />
                </div>
            </div>

            
          </div>
        )
      })}
      
      {/* Spacer để không bị nút Đặt hàng che mất món cuối */}
      <div className='sticky bottom-0'>
        <Button
          className='w-full justify-between'
          onClick={handleOrder}
          disabled={orders.length === 0}
        >
          <span>Đặt hàng · {orders.length} món</span>
          <span>{formatCurrency(totalPrice)}</span>
        </Button>
      </div>
    </>
  )
}