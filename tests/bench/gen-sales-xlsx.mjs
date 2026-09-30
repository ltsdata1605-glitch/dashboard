// Tạo file Excel doanh số GIẢ cỡ lớn để đo hiệu năng Phân tích (không phải dữ liệu thật).
// Dùng: node tests/bench/gen-sales-xlsx.mjs 200000 /đường/dẫn/sales-200k.xlsx  (40 NV, 5 kho, 6 nhóm hàng)
import * as fs from 'node:fs';
import * as XLSX from 'xlsx';
if (typeof XLSX.set_fs === 'function') XLSX.set_fs(fs);
const N = Number(process.argv[2] || 200000);
const khos = ['90001','90002','90003','90004','90005'];
const nhom = [['ICT','1491'],['Phụ kiện','4219'],['Phụ kiện','12'],['Phụ kiện','1031'],['Gia dụng','4171'],['Gia dụng','4156']];
const now = new Date();
const rows = new Array(N);
for (let i = 0; i < N; i++) {
  const d = new Date(now.getFullYear(), now.getMonth(), 1 + (i % 28), 8 + (i % 12), i % 60);
  const ds = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  const [nganh, nh] = nhom[i % nhom.length];
  const k = khos[i % 5]; const nv = 195000 + (i % 40);
  const gia = 100000 + (i * 7919) % 30000000;
  rows[i] = { 'Mã Đơn Hàng': `SO${i}`, 'Tên Sản Phẩm': `Sản phẩm mẫu số ${i % 5000} dung lượng lớn`, 'Tên Khách Hàng': `KHÁCH HÀNG ${i % 20000}`,
    'Số Lượng': 1 + (i % 3), 'Giá bán_1': gia, 'Giá bán': gia, 'Mã kho tạo': k, 'Kho tạo': `Kho ${k}`, 'Người tạo': `${nv} - Nhân Viên ${nv}`,
    'Trạng thái xuất': 'Đã xuất', 'Ngày tạo': ds, 'Thời gian hẹn giao': ds, 'Hình thức xuất': 'Xuất bán hàng tại siêu thị',
    'Tình trạng nhập trả của sản phẩm đổi với sản phẩm chính': 'Chưa trả', 'Trạng thái thu tiền': 'Đã thu', 'Trạng thái hủy': 'Chưa hủy',
    'Trạng thái hồ sơ': '1 - Mới', 'Ngành Hàng': nganh, 'Nhóm Hàng': nh, 'Nhà sản xuất': 'Khác', 'Mã sản phẩm': `SP${i % 5000}` };
}
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Data');
XLSX.writeFile(wb, process.argv[3]);
console.log('ok', N, fs.statSync(process.argv[3]).size);
