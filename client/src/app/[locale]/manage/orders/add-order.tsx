'use client'

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { PlusCircle } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Form, FormField, FormItem, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { TablesDialog } from '@/app/[locale]/manage/orders/tables-dialog'
import { GetListGuestsResType } from '@/schemaValidations/account.schema'
import { Switch } from '@/components/ui/switch'
import GuestsDialog from '@/app/[locale]/manage/orders/guests-dialog'
import { CreateOrdersBodyType } from '@/schemaValidations/order.schema'
import Quantity from '@/app/[locale]/guest/menu/quantity'
import Image from 'next/image'
import { cn, formatCurrency, handleErrorApi } from '@/lib/utils'
import { DishStatus } from '@/constants/type'
import { useDishListQuery } from '@/queries/useDish'
import { useCreateOrderMutation } from '@/queries/useOrder'
import { useCreateGuestMutation } from '@/queries/useAccount'
import { toast } from '@/components/ui/use-toast'

// 1. Schema Validate (Giữ nguyên như đã sửa)
const AddGuestSchema = z.object({
  name: z.string().min(2, 'Tên khách hàng phải từ 2 ký tự'),
  tableNumber: z.number().min(1, 'Vui lòng chọn bàn')
})
type AddGuestSchemaType = z.infer<typeof AddGuestSchema>

export default function AddOrder() {
  const [open, setOpen] = useState(false)
  const [selectedGuest, setSelectedGuest] = useState<GetListGuestsResType['data'][0] | null>(null)
  const [isNewGuest, setIsNewGuest] = useState(true)
  const [orders, setOrders] = useState<CreateOrdersBodyType['orders']>([])
  
  const { data } = useDishListQuery()
  const dishes = useMemo(() => data?.payload.data ?? [], [data])

  // Tính tổng tiền (Giống bên MenuOrder)
  const totalPrice = useMemo(() => {
    return dishes.reduce((result, dish) => {
      const order = orders.find((order) => order.dishId === dish.id)
      if (!order) return result
      return result + order.quantity * dish.price
    }, 0)
  }, [dishes, orders])

  const createOrderMutation = useCreateOrderMutation()
  const createGuestMutation = useCreateGuestMutation()

  const form = useForm<AddGuestSchemaType>({
    resolver: zodResolver(AddGuestSchema),
    defaultValues: {
      name: '',
      tableNumber: 0
    }
  })

  // Hàm xử lý tăng giảm số lượng (Giống bên MenuOrder)
  const handleQuantityChange = (dishId: number, quantity: number) => {
    setOrders((prevOrders) => {
      if (quantity === 0) {
        return prevOrders.filter((order) => order.dishId !== dishId)
      }
      const index = prevOrders.findIndex((order) => order.dishId === dishId)
      if (index === -1) {
        return [...prevOrders, { dishId, quantity }]
      }
      const newOrders = [...prevOrders]
      newOrders[index] = { ...newOrders[index], quantity }
      return newOrders
    })
  }

  // Hàm gọi API tạo đơn (Bước cuối)
  const createOrder = async (guestId: number) => {
    try {
      await createOrderMutation.mutateAsync({
        guestId,
        orders
      })
      toast({
        title: 'Thành công',
        description: 'Đã tạo đơn hàng thành công!',
        className: 'bg-green-600 text-white'
      })
      reset() // Đóng modal và reset form để lộ ra danh sách đơn hàng bên dưới
    } catch (error) {
      handleErrorApi({
        error,
        setError: form.setError
      })
    }
  }

  // Xử lý tạo khách mới và đặt hàng
  const handleNewGuestOrder = form.handleSubmit(
    async (values) => {
      try {
        const guestRes = await createGuestMutation.mutateAsync({
          name: values.name,
          tableNumber: values.tableNumber,
          // @ts-ignore
          token: '' 
        })
        const guestId = guestRes?.payload.data.id
        if (guestId) {
          await createOrder(guestId)
        }
      } catch (error) {
        handleErrorApi({ error, setError: form.setError })
      }
    },
    (errors) => {
       // Báo lỗi nếu form chưa đúng (Validation)
       const errorKeys = Object.keys(errors);
       const errorMessage = errorKeys.map((key) => 
        // @ts-ignore
        `Lỗi tại '${key}': ${errors[key]?.message}`
       ).join('\n');
       
       toast({
         title: 'Dữ liệu không hợp lệ',
         description: errorMessage,
         variant: 'destructive',
       })
    }
  )

  // Xử lý đặt hàng cho khách cũ
  const handleOldGuestOrder = () => {
    if (!selectedGuest) {
      toast({
        description: 'Vui lòng chọn một khách hàng có sẵn',
        variant: 'destructive'
      })
      return
    }
    createOrder(selectedGuest.id)
  }

  // --- HÀM TỔNG HỢP: GIỐNG handleOrder BÊN GUEST ---
  // Hàm này điều phối logic dựa trên trạng thái hiện tại
  const handleOrder = () => {
    if (orders.length === 0) {
      toast({
        description: 'Vui lòng chọn ít nhất 1 món ăn',
        variant: 'destructive'
      })
      return
    }

    if (isNewGuest) {
      handleNewGuestOrder()
    } else {
      handleOldGuestOrder()
    }
  }

  const reset = () => {
    form.reset({ name: '', tableNumber: 0 })
    setSelectedGuest(null)
    setIsNewGuest(true)
    setOrders([])
    setOpen(false)
  }

  return (
    <Dialog
      onOpenChange={(value) => {
        if (!value) reset()
        setOpen(value)
      }}
      open={open}
    >
      <DialogTrigger asChild>
        <Button size='sm' className='h-7 gap-1'>
          <PlusCircle className='h-3.5 w-3.5' />
          <span className='sr-only sm:not-sr-only sm:whitespace-nowrap'>
            Tạo đơn hàng
          </span>
        </Button>
      </DialogTrigger>
      
      {/* Thêm flex và flex-col để footer luôn nằm dưới cùng ngay cả khi scroll */}
      <DialogContent className='sm:max-w-[600px] max-h-screen overflow-hidden flex flex-col'>
        <DialogHeader>
          <DialogTitle>Tạo đơn hàng</DialogTitle>
        </DialogHeader>

        {/* Phần nội dung cuộn (Scrollable Area) */}
        <div className='flex-1 overflow-y-auto pr-2'>
          <div className='grid grid-cols-4 items-center justify-items-start gap-4 mb-4'>
            <Label htmlFor='isNewGuest'>Khách hàng mới</Label>
            <div className='col-span-3 flex items-center'>
              <Switch
                id='isNewGuest'
                checked={isNewGuest}
                onCheckedChange={setIsNewGuest}
              />
            </div>
          </div>

          {/* Form Khách Mới */}
          {isNewGuest && (
            <Form {...form}>
              <form noValidate className='grid gap-4 py-4'>
                <FormField
                  control={form.control}
                  name='name'
                  render={({ field }) => (
                    <FormItem>
                      <div className='grid grid-cols-4 items-center justify-items-start gap-4'>
                        <Label htmlFor='name'>Tên khách hàng</Label>
                        <div className='col-span-3 w-full space-y-2'>
                          <Input 
                            id='name' 
                            className='w-full' 
                            {...field} 
                            placeholder="Nhập tên khách..." 
                          />
                          <FormMessage />
                        </div>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='tableNumber'
                  render={({ field }) => (
                    <FormItem>
                      <div className='grid grid-cols-4 items-center justify-items-start gap-4'>
                        <Label htmlFor='tableNumber'>Chọn bàn</Label>
                        <div className='col-span-3 w-full space-y-2'>
                          <div className='flex items-center gap-4'>
                            <div className='font-medium'>
                              {field.value && field.value !== 0 ? `Bàn ${field.value}` : 'Chưa chọn'}
                            </div>
                            <TablesDialog
                              onChoose={(table) => {
                                const tableNum = parseInt(String(table.number), 10)
                                field.onChange(tableNum)
                              }}
                            />
                          </div>
                          <FormMessage />
                        </div>
                      </div>
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          )}

          {/* Form Khách Cũ */}
          {!isNewGuest && <GuestsDialog onChoose={setSelectedGuest} />}
          {!isNewGuest && selectedGuest && (
            <div className='grid grid-cols-4 items-center justify-items-start gap-4 mb-4'>
              <Label>Khách đã chọn</Label>
              <div className='col-span-3 w-full gap-4 flex items-center'>
                <div>{selectedGuest.name} (#{selectedGuest.id})</div>
                <div>Bàn: {selectedGuest.tableNumber}</div>
              </div>
            </div>
          )}

          {/* Danh sách món ăn */}
          <div className='space-y-4 pb-4'>
            {dishes
              .filter((dish) => dish.status !== DishStatus.Hidden)
              .map((dish) => (
                <div
                  key={dish.id}
                  className={cn('flex gap-4 border-b pb-4 last:border-0 last:pb-0', {
                    'pointer-events-none opacity-50': dish.status === DishStatus.Unavailable
                  })}
                >
                  <div className='flex-shrink-0 relative'>
                    {dish.status === DishStatus.Unavailable && (
                      <span className='absolute inset-0 flex items-center justify-center text-xs font-bold bg-black/60 text-white rounded z-10'>
                        Hết hàng
                      </span>
                    )}
                    <Image
                      src={dish.image}
                      alt={dish.name}
                      height={100}
                      width={100}
                      quality={100}
                      className='object-cover w-[80px] h-[80px] rounded-md border'
                    />
                  </div>
                  <div className='space-y-1 flex-1'>
                    <h3 className='text-sm font-medium'>{dish.name}</h3>
                    <p className='text-xs text-muted-foreground line-clamp-2'>{dish.description}</p>
                    <p className='text-sm font-semibold text-primary'>
                      {formatCurrency(dish.price)}
                    </p>
                  </div>
                  <div className='flex-shrink-0 flex justify-center items-center'>
                    <Quantity
                      onChange={(value) => handleQuantityChange(dish.id, value)}
                      value={orders.find((o) => o.dishId === dish.id)?.quantity ?? 0}
                    />
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* --- PHẦN NÚT BẤM (Đã sửa cho giống MenuOrder) --- */}
        {/* Sử dụng DialogFooter nhưng style giống nút bên Guest */}
        <DialogFooter className="pt-4 border-t mt-auto">
          <Button
            className='w-full justify-between h-12 text-lg'
            onClick={handleOrder}
            disabled={orders.length === 0}
            type='button'
          >
            <span>Đặt hàng · {orders.length} món</span>
            <span>{formatCurrency(totalPrice)}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}