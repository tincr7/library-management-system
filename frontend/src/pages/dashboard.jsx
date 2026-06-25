import React, { useState, useEffect } from 'react';
import { Layout, Menu, Typography } from 'antd';
import { 
  DashboardOutlined, 
  BookOutlined, 
  UserOutlined, 
  LogoutOutlined,
  SwapOutlined,
  CalendarOutlined, // Icon cho Đặt trước
  AlertOutlined,    // Icon cho Vi phạm
  HistoryOutlined   // Icon cho Lịch sử gia hạn
} from '@ant-design/icons';
import BookManagement from './BookManagement'; 
import UserManagement from './UserManagement';
import BorrowManagement from './BorrowManagement';
import ReservationManagement from './ReservationManagement';
import ViolationsManagement from './ViolationsManagement';
import RenewHistoryManagement from './RenewHistoryManagement';
import AdminDashboard from './AdminDashboard';

const { Content, Sider } = Layout;

const AdminPage = () => {
  // State để quản lý việc hiển thị nội dung theo Menu
  // 1. Đọc key từ localStorage khi component được tải, nếu không có thì mặc định là '1'
  const [selectedKey, setSelectedKey] = useState(
    () => localStorage.getItem('adminSelectedNavKey') || '1'
  );

  // 2. Tự động lưu lại key vào localStorage mỗi khi người dùng chọn menu mới
  useEffect(() => {
    localStorage.setItem('adminSelectedNavKey', selectedKey);
  }, [selectedKey]);

  // Hàm render nội dung dựa trên key được chọn
  const renderContent = () => {
    switch (selectedKey) {
      case '1':
        return <AdminDashboard onNavigate={setSelectedKey} />;
      case '2':
        return <BookManagement />; 
      case '3':
        return <UserManagement />;
      case '4':
        return <BorrowManagement />;
      case '5':
        return <ReservationManagement />; 
      case '6':
        return <ViolationsManagement />;
      case '7':
        return <RenewHistoryManagement />;            
      default:
        return <Typography.Title level={2}>Chào mừng Admin!</Typography.Title>;
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      
      {/* 🔥 SỬA TẠI ĐÂY: Thêm style sticky giúp cố định Sider hoàn toàn khi cuộn trang nội dung */}
      <Sider 
        collapsible 
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'sticky',
          top: 0,
          left: 0,
        }}
      >
        <div style={{ color: 'white', padding: '16px', textAlign: 'center', fontWeight: 'bold', letterSpacing: '1px' }}>
          ADMIN PANEL
        </div>
        <Menu 
          theme="dark" 
          mode="inline" 
          // 3. Sử dụng selectedKeys để Menu luôn đồng bộ với state
          selectedKeys={[selectedKey]}
          onClick={(e) => setSelectedKey(e.key)} // Cập nhật state khi click menu
        >
          <Menu.Item key="1" icon={<DashboardOutlined />}>Thống kê</Menu.Item>
          <Menu.Item key="2" icon={<BookOutlined />}>Quản lý đầu sách</Menu.Item>
          <Menu.Item key="4" icon={<SwapOutlined />}>Duyệt mượn/trả</Menu.Item>
          <Menu.Item key="3" icon={<UserOutlined />}>Quản lý Sinh viên</Menu.Item>
          
          {/* 🔥 SỬA ICON CHUẨN KHỚP VỚI TÊN MỤC QUẢN LÝ */}
          <Menu.Item key="5" icon={<CalendarOutlined />}>Quản lý đặt trước</Menu.Item>
          <Menu.Item key="6" icon={<AlertOutlined />}>Quản lý vi phạm</Menu.Item>
          <Menu.Item key="7" icon={<HistoryOutlined />}>Lịch sử gia hạn</Menu.Item>
          
          <Menu.Item 
            key="logout" 
            icon={<LogoutOutlined />} 
            onClick={() => {
              sessionStorage.clear(); 
              window.location.href = '/login';
            }}
          >
            Đăng xuất
          </Menu.Item>
        </Menu>
      </Sider>
      
      <Layout style={{ background: '#f0f2f5' }}>
        <Content style={{ margin: '16px' }}>
          <div style={{ padding: 24, background: '#fff', borderRadius: '8px', minHeight: 'calc(100vh - 32px)' }}>
            {renderContent()}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default AdminPage;