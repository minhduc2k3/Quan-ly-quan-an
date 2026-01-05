import React, { useRef, useMemo } from 'react';
import { useReactToPrint } from 'react-to-print';
import InvoiceUI from './InvoiceUI';
import { InvoiceData } from '@/types/invoice.types';

// --- Dữ liệu giả lập (Mock Data) ---
const mockOrderData = {
    customerName: 'lan (#3)',
    tableNumber: 1,
    checkInTime: '23:29:27 20/11/2025',
    items: [
        { id: 1, name: 'Phở Bò', quantity: 1, price: 60000 },
    ],
    totalAmount: 60000,
};

interface PaymentModalProps {
    onClose: () => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ onClose }) => {
    // 1. Tạo Ref cho hóa đơn ẩn
    const invoiceRef = useRef<HTMLDivElement>(null);

    // 2. Chuẩn bị dữ liệu hóa đơn (Convert từ Order sang Invoice)
    // Dùng useMemo để dữ liệu luôn sẵn sàng, không cần chờ state update
    const invoiceData: InvoiceData = useMemo(() => ({
        id: `HD-${Date.now().toString().slice(-6)}`,
        customerName: mockOrderData.customerName,
        tableNumber: mockOrderData.tableNumber,
        date: new Date().toLocaleString('vi-VN'),
        items: mockOrderData.items.map(item => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
        })),
        subtotal: mockOrderData.totalAmount,
        total: mockOrderData.totalAmount,
        discount: 0
    }), []);

    // 3. Cấu hình in ấn: Bấm là in ngay
    const handlePrintAndPay = useReactToPrint({
        contentRef: invoiceRef, // Lấy nội dung từ Ref ẩn
        documentTitle: `Bill-${mockOrderData.customerName}`,
        onAfterPrint: () => {
            // Sau khi in xong (hoặc tắt bảng in) thì mới đóng Modal và báo thành công
            console.log("Thanh toán và In thành công!");
            onClose(); 
        },
    });

    return (
        <>
            {/* ========================================================== */}
            {/* PHẦN 1: HÓA ĐƠN ẨN (LUÔN CÓ SẴN ĐỂ CHỜ IN)                 */}
            {/* style display: none giúp nó không hiện ra làm rối mắt      */}
            {/* ========================================================== */}
            <div style={{ display: "none" }}>
                <InvoiceUI ref={invoiceRef} data={invoiceData} />
            </div>

            {/* ========================================================== */}
            {/* PHẦN 2: GIAO DIỆN THANH TOÁN (DARK MODE)                   */}
            {/* ========================================================== */}
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
                <div className="bg-[#0f111a] text-white rounded-lg w-[600px] max-w-full shadow-2xl border border-gray-800">
                    
                    {/* Header Modal */}
                    <div className="flex justify-between items-center p-4 border-b border-gray-800">
                        <h3 className="font-bold text-lg">Khách đang ngồi tại bàn {mockOrderData.tableNumber}</h3>
                        <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">&times;</button>
                    </div>

                    {/* Nội dung chi tiết đơn hàng */}
                    <div className="p-6 space-y-4">
                        <p className="font-bold">
                            Tên: {mockOrderData.customerName} | Bàn: {mockOrderData.tableNumber}
                        </p>
                        <p className="text-sm text-gray-400">Ngày đăng ký: {mockOrderData.checkInTime}</p>
                        
                        {/* Danh sách món */}
                        <div className="bg-[#1a1c26] rounded p-3 mt-2 max-h-60 overflow-y-auto">
                            {mockOrderData.items.map(item => (
                                <div key={item.id} className="flex justify-between items-center border-b border-gray-700 py-2 last:border-0">
                                    <div>
                                        <span className="font-bold">{item.name}</span>
                                        <span className="text-gray-400 text-sm ml-2">x{item.quantity}</span>
                                    </div>
                                    <div className="font-mono">
                                        {(item.price * item.quantity).toLocaleString('vi-VN')} đ
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Tổng tiền */}
                        <div className="flex gap-4 mt-4 text-sm items-center justify-between pt-2 border-t border-gray-800">
                            <span className="text-gray-400">Tổng cộng:</span>
                            <div className="bg-white text-black px-3 py-1 rounded font-bold text-lg">
                                {mockOrderData.totalAmount.toLocaleString('vi-VN')} đ
                            </div>
                        </div>
                    </div>

                    {/* Footer: Nút Thanh Toán & In */}
                    <div className="p-4 border-t border-gray-800">
                        <button 
                            onClick={() => handlePrintAndPay()} 
                            className="w-full bg-[#1e293b] hover:bg-green-700 text-white font-bold py-4 rounded transition-colors text-lg shadow-lg flex justify-center items-center gap-3"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                            Thanh toán & In Hóa Đơn
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default PaymentModal;