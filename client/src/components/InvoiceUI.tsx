import React from 'react';
import { InvoiceData } from '@/types/invoice.types';

// --- HÀM ĐỌC SỐ TIỀN THÀNH CHỮ TIẾNG VIỆT ---
const readMoney = (number: number): string => {
  const str = number.toString();
  const units = ['', ' nghìn', ' triệu', ' tỷ'];
  const digits = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
  
  // Hàm đọc nhóm 3 số
  const readGroup = (group: string) => {
    let read = '';
    const [a, b, c] = [parseInt(group[0]), parseInt(group[1]), parseInt(group[2])];

    // Đọc số hàng trăm
    read += digits[a] + ' trăm';

    // Đọc số hàng chục
    if (b === 0 && c === 0) return read; 
    if (b === 0 && c !== 0) {
      read += ' lẻ ' + digits[c]; 
    } else if (b === 1) {
      read += ' mười'; 
      if (c === 1) read += ' một';
      else if (c === 5) read += ' lăm';
      else if (c !== 0) read += ' ' + digits[c];
    } else {
      read += ' ' + digits[b] + ' mươi'; 
      if (c === 1) read += ' mốt';
      else if (c === 4) read += ' tư';
      else if (c === 5) read += ' lăm';
      else if (c !== 0) read += ' ' + digits[c];
    }
    return read;
  };

  if (number === 0) return 'Không đồng';
  
  const padding = 3 - (str.length % 3);
  const paddedStr = (padding < 3 ? '0'.repeat(padding) : '') + str;
  
  let result = '';
  for (let i = 0; i < paddedStr.length; i += 3) {
    const group = paddedStr.substring(i, i + 3);
    const unitIndex = (paddedStr.length - i) / 3 - 1;
    
    if (parseInt(group) !== 0) {
      result += ' ' + readGroup(group) + units[unitIndex];
    }
  }
  result = result.trim().replace(/\s+/g, ' ');
  result = result.charAt(0).toUpperCase() + result.slice(1);
  
  return result + ' đồng';
};
// ---------------------------------------------

interface InvoiceUIProps {
  data: InvoiceData;
}

const InvoiceUI = React.forwardRef<HTMLDivElement, InvoiceUIProps>(({ data }, ref) => {
  if (!data) return null;

  return (
    <div 
      ref={ref}
      style={{
        backgroundColor: '#ffffff',
        color: '#000000',
        width: '148mm', 
        minHeight: '210mm',
        padding: '10mm 15mm',
        fontFamily: '"Times New Roman", serif', 
        fontSize: '15px',
        lineHeight: '1.5',
        boxSizing: 'border-box',
        position: 'relative'
      }}
    >
      {/* --- HEADER --- */}
      <div style={{ textAlign: 'center', marginBottom: '15px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 'bold', textTransform: 'uppercase', margin: 0, letterSpacing: '1px' }}>
          NHÀ HÀNG MỘC QUÁN
        </h1>
        <p style={{ margin: '4px 0', fontStyle: 'italic' }}>
          Địa chỉ: Số 477A, đường Lạc Long Quân, thành phố Hà Nội
        </p>
        <p style={{ margin: '2px 0' }}>
          Điện thoại: <strong>0988.666.888</strong>
        </p>
      </div>

      {/* --- TITLE HÓA ĐƠN --- */}
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 'bold', textTransform: 'uppercase', margin: '10px 0 5px 0' }}>
          HÓA ĐƠN THANH TOÁN
        </h2>
        <div style={{ fontSize: '13px', color: '#333' }}>Mã HĐ: {data.id}</div>
        <div style={{ fontSize: '13px', color: '#333' }}>Ngày: {data.date}</div>
      </div>

      {/* --- ĐƯỜNG KẺ --- */}
      

      {/* --- THÔNG TIN KHÁCH HÀNG --- */}
      <div style={{ marginBottom: '15px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
           <span>Khách hàng: <strong>{data.customerName}</strong></span>
           
        </div>
        <div>
           <span>Bàn phục vụ: <strong> {data.tableNumber}</strong></span>
        </div>
      </div>

      {/* --- BẢNG MÓN ĂN --- */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '15px' }}>
        <thead>
          <tr style={{ borderTop: '1px solid #000', borderBottom: '1px solid #000' }}>
            <th style={{ textAlign: 'left', padding: '8px 0', width: '45%' }}>Tên món</th>
            <th style={{ textAlign: 'center', padding: '8px 0', width: '15%' }}>SL</th>
            <th style={{ textAlign: 'right', padding: '8px 0', width: '20%' }}>Đơn giá</th>
            <th style={{ textAlign: 'right', padding: '8px 0', width: '20%' }}>Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((item, index) => (
            <tr key={index} style={{ borderBottom: '1px dashed #888' }}>
              <td style={{ padding: '8px 0', verticalAlign: 'top' }}>{item.name}</td>
              <td style={{ textAlign: 'center', padding: '8px 0', verticalAlign: 'top' }}>{item.quantity}</td>
              <td style={{ textAlign: 'right', padding: '8px 0', verticalAlign: 'top' }}>
                 {item.price.toLocaleString('vi-VN')}
              </td>
              <td style={{ textAlign: 'right', padding: '8px 0', verticalAlign: 'top', fontWeight: 'bold' }}>
                {(item.price * item.quantity).toLocaleString('vi-VN')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* --- TỔNG KẾT --- */}
      <div style={{ borderTop: '2px solid #000', paddingTop: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
            <span>Tổng tiền :</span>
            <span>{data.subtotal.toLocaleString('vi-VN')}</span>
        </div>
        
        {data.discount ? (
             <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontStyle: 'italic' }}>
                <span>Giảm giá:</span>
                <span>-{data.discount.toLocaleString('vi-VN')}</span>
            </div>
        ) : null}

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 'bold', marginTop: '10px' }}>
            <span>TỔNG THANH TOÁN:</span>
            <span>{data.total.toLocaleString('vi-VN')} đ</span>
        </div>
        
        {/* SỐ TIỀN BẰNG CHỮ */}
        <div style={{ marginTop: '5px', fontStyle: 'italic', fontSize: '14px' }}>
            (Bằng chữ: {readMoney(data.total)})
        </div>
      </div>

      {/* --- FOOTER --- */}
      <div style={{ textAlign: 'center', marginTop: '40px' }}>
        <p style={{ fontStyle: 'italic', marginBottom: '5px' }}>Cảm ơn quý khách đã sử dụng dịch vụ !</p>
        
      </div>
    </div>
  );
});

InvoiceUI.displayName = 'InvoiceUI';
export default InvoiceUI;