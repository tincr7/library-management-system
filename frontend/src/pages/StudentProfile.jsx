import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Typography, message, Avatar, Row, Col, Divider } from 'antd';
import { 
  UserOutlined, 
  SaveOutlined, 
  LockOutlined, 
  PhoneOutlined, 
  IdcardOutlined,
  SendOutlined
} from '@ant-design/icons';
import axiosClient from '../api/axiosClient';

const { Title, Text } = Typography;

const StudentProfile = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState(null);

  // Lấy thông tin user hiện tại từ Session Storage
  const currentUser = JSON.parse(sessionStorage.getItem('user') || '{}');

  useEffect(() => {
    if (currentUser.id) {
      fetchUserProfile();
    }
  }, [currentUser.id]);

  const fetchUserProfile = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get(`/users/${currentUser.id}`);
      setUserData(res.data);
      form.setFieldsValue({
        name: res.data.name,
        mssv: res.data.mssv,
        telegramId: res.data.telegramId,
        password: '', // Mặc định bỏ trống
      });
    } catch (err) {
      message.error('Không thể tải thông tin cá nhân!');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (values) => {
    setLoading(true);
    try {
      // Lọc bỏ MSSV khỏi payload (Tránh update đè key MSSV nếu backend không cho phép)
      const { mssv, password, ...updateData } = values;

      // Nếu người dùng có nhập mật khẩu mới thì mới gán vào dữ liệu update
      if (password && password.trim() !== '') {
        updateData.password = password;
      }

      const res = await axiosClient.patch(`/users/${currentUser.id}`, updateData);

      message.success('Cập nhật thông tin cá nhân thành công!');
      setUserData(res.data);
      form.setFieldsValue({ password: '' }); // Reset trắng ô đổi mật khẩu

      // Cập nhật lại tên mới vào sessionStorage
      const updatedUser = { ...currentUser, name: res.data.name };
      sessionStorage.setItem('user', JSON.stringify(updatedUser));
      
      // Reload lại trang nhẹ nhàng để Header (thanh Sider) cập nhật tên mới hiển thị
      setTimeout(() => {
        window.location.reload();
      }, 1000);

    } catch (err) {
      message.error(err.response?.data?.message || 'Cập nhật thông tin thất bại!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <Title level={3} style={{ margin: 0, fontWeight: 'bold' }}>
          <UserOutlined style={{ color: '#1890ff', marginRight: 10 }} />
          Thông Tin Cá Nhân
        </Title>
        <Text type="secondary">Xem và cập nhật thông tin cá nhân hoặc thay đổi mật khẩu của bạn.</Text>
      </div>

      <Card bordered={false} style={{ borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <Row gutter={[32, 32]}>
          {/* Cột trái: Ảnh đại diện */}
          <Col xs={24} md={8} style={{ textAlign: 'center', borderRight: '1px solid #f0f0f0' }}>
            <Avatar 
              size={120} 
              icon={<UserOutlined />} 
              style={{ backgroundColor: '#1890ff', marginBottom: '16px', boxShadow: '0 4px 10px rgba(24,144,255,0.3)' }} 
            />
            <Title level={4} style={{ margin: '0 0 4px 0' }}>{userData?.name || 'Tải dữ liệu...'}</Title>
            <Text type="secondary">Sinh viên ĐH Thủy Lợi</Text>
          </Col>
          
          {/* Cột phải: Form cập nhật thông tin */}
          <Col xs={24} md={16}>
            <Form 
              form={form} 
              layout="vertical" 
              onFinish={handleUpdateProfile}
              size="large"
            >
              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item label={<Text strong>Mã số sinh viên (MSSV)</Text>} name="mssv">
                    <Input prefix={<IdcardOutlined style={{ color: '#bfbfbf' }}/>} disabled style={{ color: '#595959', backgroundColor: '#f5f5f5' }} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label={<Text strong>Họ và Tên</Text>} name="name" rules={[{ required: true, message: 'Vui lòng nhập họ tên!' }]}>
                    <Input prefix={<UserOutlined style={{ color: '#bfbfbf' }}/>} placeholder="Nhập họ và tên" />
                  </Form.Item>
                </Col>
              </Row>

              <div style={{ display: 'flex', gap: '10px' }}>
                {userData?.telegramId ? (
                  <Button 
                    type="primary" 
                    icon={<SendOutlined />}
                    style={{ backgroundColor: '#52c41a', borderColor: '#52c41a', fontWeight: 500, cursor: 'default' }}
                  >
                    Đã liên kết với Telegram
                  </Button>
                ) : (
                  <Button 
                    type="primary" 
                    icon={<SendOutlined />}
                    style={{ backgroundColor: '#28a8e9', borderColor: '#28a8e9', fontWeight: 500 }}
                    onClick={() => window.open(`https://t.me/dhtsmart_library_bot?start=user_${currentUser.id}`, '_blank')}
                  >
                    Nhận thông báo qua Telegram
                  </Button>
                )}
              </div>

              <Divider style={{ margin: '16px 0 24px' }}>
                <Text type="secondary" style={{ fontSize: '13px' }}>Đổi mật khẩu (Tùy chọn)</Text>
              </Divider>

              <Form.Item label={<Text strong>Mật khẩu mới</Text>} name="password" tooltip="Bỏ trống nếu bạn không muốn thay đổi mật khẩu hiện tại.">
                <Input.Password prefix={<LockOutlined style={{ color: '#bfbfbf' }}/>} placeholder="Nhập mật khẩu mới nếu muốn thay đổi..." />
              </Form.Item>

              <Form.Item style={{ marginTop: '30px', textAlign: 'right', marginBottom: 0 }}>
                <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading} style={{ borderRadius: '6px', fontWeight: 600 }}>Lưu Thay Đổi</Button>
              </Form.Item>
            </Form>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default StudentProfile;