import React, { useState, useEffect } from 'react'; // 🔥 Thêm useEffect ở đây
import { Form, Input, Button, Typography, message, Space } from 'antd';
import { UserOutlined, LockOutlined, BookOutlined } from '@ant-design/icons';
import axiosClient from '../api/axiosClient';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // 🔥 CHẶN LOGIC GO BACK / GO FORWARD:
  // Nếu người dùng đã đăng nhập thành công và cố tình nhấn Back về trang login,
  // useEffect này sẽ nhận diện được Token và tự động đẩy họ trở lại giao diện tương ứng.
  useEffect(() => {
    const token = sessionStorage.getItem('token');
    const storedUser = sessionStorage.getItem('user');

    if (token && storedUser) {
      try {
        const user = JSON.parse(storedUser);
        // Thay thế lịch sử duyệt (replace: true) để tránh tạo vòng lặp vô hạn khi nhấn Back
        if (user.role === 'ADMIN') {
          navigate('/dashboard', { replace: true });
        } else {
          navigate('/home', { replace: true });
        }
      } catch (e) {
        // Phòng trường hợp chuỗi JSON bị lỗi thì xóa sạch để bắt login lại
        sessionStorage.clear();
      }
    }
  }, [navigate]);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const res = await axiosClient.post('/auth/login', values);
      
      sessionStorage.setItem('token', res.data.access_token);
      sessionStorage.setItem('user', JSON.stringify(res.data.user));
      
      message.success('Đăng nhập thành công!');
      
      // Sử dụng { replace: true } khi điều hướng để ghi đè lịch sử cũ,
      // giúp nút Back/Forward của trình duyệt hoạt động chuẩn xác nhất.
      if (res.data.user?.role === 'ADMIN') {
        navigate('/dashboard', { replace: true }); 
      } else {
        navigate('/home', { replace: true });
      }
    } catch (error) {
      message.error(error.response?.data?.message || 'Sai MSSV hoặc mật khẩu!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', fontFamily: 'Segoe UI, sans-serif' }}>
      
      {/* 📱 THÊM CSS RESPONSIVE CHO MOBILE VÀ TABLET */}
      <style>{`
        /* Trên màn hình điện thoại di động (< 768px) */
        @media (max-width: 767px) {
          .hidden-mobile {
            display: none !important; /* Ẩn hoàn toàn nửa ảnh nền bên trái */
          }
          .login-right-panel {
            flex: 1 !important;
            padding: 0 24px !important; /* Giảm padding cho form rộng rãi trên mobile */
          }
          .login-container-box {
            max-width: 100% !important; /* Cho phép form mở rộng tối đa màn hình điện thoại */
          }
        }
      `}</style>
      
      {/* 🏙️ NỬA BÊN TRÁI: Hình nền Background Thư viện (Sẽ tự ẩn khi vào điện thoại) */}
      <div style={{ 
        flex: 1.2, 
        backgroundImage: 'linear-gradient(rgba(0, 21, 41, 0.85), rgba(0, 21, 41, 0.9)), url("https://images.unsplash.com/photo-1507842217343-583bb7270b66?q=80&w=1920")', 
        backgroundSize: 'cover', 
        backgroundPosition: 'center',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '0 60px',
        color: '#fff'
      }} className="hidden-mobile">
        <Space direction="vertical" size="middle">
          
            <img src="/ico.png" alt="Library Logo" style={{ width: '180px', height: '160px' }} />
          
          <Title level={1} style={{ color: '#fff', margin: 0, fontWeight: 700, fontSize: '38px' }}>
            Smart Library System
          </Title>
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: '16px', maxWidth: '500px', display: 'block' }}>
            Nền tảng quản lý thư viện thông minh tích hợp AI nhận diện, tối ưu hóa quy trình mượn trả và gia hạn sách thời gian thực.
          </Text>
        </Space>
      </div>

      {/* 🔐 NỬA BÊN PHẢI: Form Đăng Nhập (Bổ sung class login-right-panel) */}
      <div 
        className="login-right-panel"
        style={{ 
          flex: 1, 
          background: '#ffffff', 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center', 
          alignItems: 'center',
          padding: '0 40px'
        }}
      >
        <div className="login-container-box" style={{ width: '100%', maxWidth: '380px' }}>
          
          {/* Header Block */}
          <div style={{ marginBottom: '35px' }}>
            <Title level={3} style={{ fontWeight: 700, marginBottom: '8px', color: '#141414' }}>
              THƯ VIỆN THÔNG MINH
            </Title>
            <Text type="secondary" style={{ fontSize: '14px' }}>
              Vui lòng đăng nhập tài khoản để tiếp tục sử dụng hệ thống.
            </Text>
          </div>

          {/* Form Ant Design */}
          <Form layout="vertical" onFinish={onFinish} size="large">
            <Form.Item 
              label={<span style={{ fontWeight: 500, color: '#434343' }}>Mã số sinh viên / Tài khoản</span>}
              name="mssv" 
              rules={[{ required: true, message: 'Vui lòng nhập mã số sinh viên!' }]}
            >
              <Input 
                prefix={<UserOutlined style={{ color: '#bfbfbf' }} />} 
                placeholder="Nhập MSSV" 
                style={{ borderRadius: '6px' }}
              />
            </Form.Item>

            <Form.Item 
              label={<span style={{ fontWeight: 500, color: '#434343' }}>Mật khẩu bảo mật</span>}
              name="password" 
              rules={[{ required: true, message: 'Vui lòng nhập mật khẩu!' }]}
            >
              <Input.Password 
                prefix={<LockOutlined style={{ color: '#bfbfbf' }} />} 
                placeholder="Nhập mật khẩu của bạn" 
                style={{ borderRadius: '6px' }}
              />
            </Form.Item>

            <Form.Item style={{ marginTop: '30px' }}>
              <Button 
                type="primary" 
                htmlType="submit" 
                block 
                loading={loading}
                style={{ 
                  borderRadius: '6px', 
                  height: '45px', 
                  fontWeight: 600, 
                  fontSize: '15px',
                  background: '#1890ff',
                  boxShadow: '0 4px 10px rgba(24, 144, 255, 0.25)'
                }}
              >
                Đăng nhập hệ thống
              </Button>
            </Form.Item>
          </Form>

          {/* Footer thông tin */}
          <div style={{ textAlign: 'center', marginTop: '40px' }}>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              © 2026 Thuy Loi University - IT Student Project
            </Text>
          </div>

        </div>
      </div>

    </div>
  );
};

export default Login;