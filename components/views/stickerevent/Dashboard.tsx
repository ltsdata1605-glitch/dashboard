import React, { useRef, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import html2canvas from 'html2canvas';
import { ExportIcon, Loader2Icon } from './Icons';
import AlertModal from './AlertModal';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export const Dashboard: React.FC = () => {
  const dashboardRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ isOpen: false, message: '' });

  // Mock data for now, since we don't have real sales data
  const salesByBrand = [
    { name: 'Samsung', sales: 4000 },
    { name: 'Apple', sales: 3000 },
    { name: 'Oppo', sales: 2000 },
    { name: 'Xiaomi', sales: 2780 },
    { name: 'Vivo', sales: 1890 },
  ];

  const categoryShare = [
    { name: 'Điện thoại', value: 400 },
    { name: 'Laptop', value: 300 },
    { name: 'Tablet', value: 300 },
    { name: 'Phụ kiện', value: 200 },
  ];

  const orderEfficiency = [
    { name: 'Tuần 1', orders: 400, completed: 240 },
    { name: 'Tuần 2', orders: 300, completed: 139 },
    { name: 'Tuần 3', orders: 200, completed: 980 },
    { name: 'Tuần 4', orders: 278, completed: 390 },
  ];

  const employeeEfficiency = [
    { name: 'NV A', score: 85 },
    { name: 'NV B', score: 90 },
    { name: 'NV C', score: 78 },
    { name: 'NV D', score: 95 },
  ];

  const handleExportImage = async () => {
    if (!dashboardRef.current) return;
    
    setIsExporting(true);
    try {
      const canvas = await html2canvas(dashboardRef.current, {
        scale: 2, // Higher resolution
        useCORS: true,
        backgroundColor: '#f8fafc', // match slate-50
      });
      
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `bao-cao-doanh-thu-${new Date().toISOString().slice(0, 10)}.png`;
      link.click();
    } catch (error) {
      console.error('Error exporting image:', error);
      setAlertConfig({ isOpen: true, message: 'Có lỗi xảy ra khi xuất ảnh báo cáo.' });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
        <h1 className="text-2xl font-bold text-slate-900">Báo cáo Quản trị</h1>
        <button
          onClick={handleExportImage}
          disabled={isExporting}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 font-medium text-sm"
        >
          {isExporting ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <ExportIcon className="h-4 w-4" />}
          Xuất ảnh
        </button>
      </div>

      <div ref={dashboardRef} className="space-y-6 p-4 bg-slate-50 rounded-2xl">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Biểu đồ doanh số theo hãng</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesByBrand}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="sales" fill="#8884d8" name="Doanh số" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Tỉ trọng ngành hàng</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryShare}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryShare.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Hiệu quả khai thác nhân viên</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={employeeEfficiency} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis dataKey="name" type="category" />
                  <Tooltip />
                  <Bar dataKey="score" fill="#82ca9d" name="Điểm hiệu quả" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Hiệu quả đơn hàng</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={orderEfficiency}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="orders" fill="#8884d8" name="Tổng đơn" />
                <Bar dataKey="completed" fill="#82ca9d" name="Hoàn thành" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <AlertModal
        isOpen={alertConfig.isOpen}
        onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })}
        message={alertConfig.message}
      />
    </div>
  );
};

export default Dashboard;
