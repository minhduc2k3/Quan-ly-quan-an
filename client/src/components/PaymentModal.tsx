import React, { useRef, useMemo } from 'react';
import { useReactToPrint } from 'react-to-print';
import InvoiceUI from './InvoiceUI';
import { InvoiceData } from '@/types/invoice.types';
import { OrderStatus } from '@/constants/type'; // Import hằng số OrderStatus

// --- DỮ LIỆU MẪU ĐỂ KIỂM TRA ---
const mockOrderData = {
    customerName: 'duc',
    tableNumber: 2,
    checkInTime: '21:18:08 06/01/2026',
    items: [
        { id: 1, name: 'Cơm gà', quantity: 1, price: 50000, status: OrderStatus.Paid },
        { id: 2, name: 'Bún riêu cua', quantity: 1, price: 70000, status: OrderStatus.Rejected }, // Món bị từ chối
    ],
};

interface PaymentModalProps {
    onClose: () => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ onClose }) => {
    const invoiceRef = useRef<HTMLDivElement>(null);

    // BƯỚC 1: LỌC MÓN - Đưa validItems ra ngoài cấp độ component để cả file đều dùng được
    const validItems = useMemo(() => {
        // Lọc bỏ tất cả món có trạng thái Rejected (Từ chối)
        return mockOrderData.items.filter(item => item.status !== OrderStatus.Rejected);
    }, []);

    // BƯỚC 2: TÍNH TỔNG TIỀN - Dựa trên danh sách đã lọc
    const calculatedTotal = useMemo(() => {
        return validItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }, [validItems]);

    // BƯỚC 3: CHUẨN BỊ DỮ LIỆU HÓA ĐƠN (Gửi vào InvoiceUI)
    const invoiceData: InvoiceData = useMemo(() => ({
        id: `HD-15`,
        customerName: mockOrderData.customerName,
        tableNumber: mockOrderData.tableNumber,
        date: new Date().toLocaleString('vi-VN'),
        items: validItems.map(item => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
        })),
        subtotal: calculatedTotal,
        total: calculatedTotal,
        discount: 0
    }), [validItems, calculatedTotal]);

    // BƯỚC 4: CẤU HÌNH LỆNH IN
    const handlePrint = useReactToPrint({
        contentRef: invoiceRef,
        documentTitle: `Hoa_don_${mockOrderData.customerName}`,
        onAfterPrint: () => onClose(),
    });

    return (
        <div className="fixed inset-0 bg-black/80 z-[999] flex items-center justify-center p-4">
            {/* Modal lớn chia làm 2 phần: Trái là thông tin, Phải là Preview hóa đơn */}
            <div className="bg-[#0f111a] text-white rounded-xl w-[1100px] max-w-full h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-gray-800">
                
                {/* Header Modal */}
                <div className="flex justify-between items-center p-4 border-b border-gray-800 bg-[#161925]">
                    <h3 className="font-bold text-xl text-blue-400 uppercase tracking-wide">Xác nhận & Xem trước hóa đơn</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-3xl transition-colors">&times;</button>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* CỘT TRÁI: Danh sách món hợp lệ (Dark Mode) */}
                    <div className="w-1/2 p-6 overflow-y-auto border-r border-gray-800 bg-[#11131f]">
                        <h4 className="text-xs font-bold text-gray-500 uppercase mb-4 tracking-widest">Chi tiết đơn hàng thực tế</h4>
                        <div className="space-y-3">
                            {validItems.map(item => (
                                <div key={item.id} className="p-4 bg-[#1a1c26] rounded-lg border border-gray-700 flex justify-between items-center shadow-sm">
                                    <div>
                                        <p className="font-bold text-gray-200">{item.name}</p>
                                        <p className="text-xs text-gray-500">Số lượng: {item.quantity}</p>
                                    </div>
                                    <span className="font-mono text-green-400 font-bold">{(item.price * item.quantity).toLocaleString()}đ</span>
                                </div>
                            ))}
                        </div>
                        <div className="mt-8 pt-4 border-t border-gray-800">
                            <div className="flex justify-between items-center text-2xl font-bold">
                                <span className="text-gray-400">TỔNG CỘNG:</span>
                                <span className="text-yellow-500">{calculatedTotal.toLocaleString()} đ</span>
                            </div>
                        </div>
                    </div>

                    {/* CỘT PHẢI: XEM TRƯỚC HÓA ĐƠN TRẮNG (PREVIEW) */}
                    <div className="w-1/2 bg-[#2d2d2d] p-8 flex justify-center overflow-y-auto border-l border-black relative">
                        {/* Vùng xem trước tờ hóa đơn giấy */}
                        <div className="shadow-[0_0_60px_rgba(0,0,0,0.6)] transform scale-[0.85] origin-top bg-white">
                            {/* InvoiceUI hiển thị trực tiếp để kiểm tra trước khi bấm In */}
                            <InvoiceUI ref={invoiceRef} data={invoiceData} />
                        </div>
                    </div>
                </div>

                {/* Footer Modal: Nút điều khiển */}
                <div className="p-4 bg-[#161925] border-t border-gray-800 flex justify-end gap-4 shadow-inner">
                    <button onClick={onClose} className="px-8 py-2 rounded bg-gray-800 hover:bg-gray-700 font-medium transition-all text-gray-300">
                        Hủy bỏ
                    </button>
                    <button 
                        onClick={() => handlePrint()} 
                        className="px-12 py-3 rounded bg-green-600 hover:bg-green-500 font-bold flex items-center gap-2 shadow-lg transition-all active:scale-95 text-white"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm-1 9H8v2h4v-2z" clipRule="evenodd" />
                        </svg>
                        XÁC NHẬN VÀ IN HÓA ĐƠN
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PaymentModal;