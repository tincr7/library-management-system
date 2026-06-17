import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/login';
import Home from './pages/home';
import AdminPage from './pages/dashboard'; // Trang bọc Sidebar Admin chứa renderContent

// 🔥 1. COMPONENT BẢO VỆ & PHÂN QUYỀN ROUTE (VIẾT RIÊNG BÊN NGOÀI)
const ProtectedRoute = ({ allowedRoles, children }) => {
  const token = sessionStorage.getItem('token');
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');

  // Nếu chưa đăng nhập, đá văng ra trang Login ngay lập tức (Dùng replace để xóa lịch sử duyệt lỗi)
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Nếu vai trò (Role) không nằm trong danh sách được phép vào Route này
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Nếu là Admin đi lạc thì đá về /dashboard, Sinh viên đi lạc đá về /home
    return user.role === 'ADMIN' 
      ? <Navigate to="/dashboard" replace /> 
      : <Navigate to="/home" replace />;
  }

  // Nếu hợp lệ thì cho phép hiển thị Component coninside
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Điều hướng mặc định khi mở trang web */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        {/* Trang Login công cộng */}
        <Route path="/login" element={<Login />} />

        {/* 👮 TUYẾN ĐƯỜNG DÀNH RIÊNG CHO ADMIN */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AdminPage /> {/* Chứa giao diện thống kê biểu đồ & Sidebar Admin */}
            </ProtectedRoute>
          } 
        />

        {/* 🎓 TUYẾN ĐƯỜNG DÀNH RIÊNG CHO SINH VIÊN */}
        <Route 
          path="/home" 
          element={
            <ProtectedRoute allowedRoles={['STUDENT']}>
              <Home /> {/* Chứa giao diện Tìm sách, Gia hạn & Sidebar Sinh viên */}
            </ProtectedRoute>
          } 
        />

        {/* Bọc lót nếu Admin hoặc Sinh viên gõ bậy URL không tồn tại */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;