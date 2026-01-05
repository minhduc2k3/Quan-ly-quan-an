// Dữ liệu cho từng món ăn
export interface InvoiceItem {
  id: number;
  name: string;
  quantity: number;
  price: number;
}

// Dữ liệu cho toàn bộ hóa đơn
export interface InvoiceData {
  id: string;         // Mã hóa đơn (VD: HD-123456)
  customerName: string;
  tableNumber: number;
  date: string;       // Ngày giờ thanh toán
  items: InvoiceItem[];
  subtotal: number; 
  discount?: number;
  total: number;      // Tổng phải trả
}