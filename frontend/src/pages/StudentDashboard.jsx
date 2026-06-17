import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, Typography, List, Tag, message, Spin, Alert, Space } from 'antd';
import { 
  BookOutlined, 
  WarningOutlined, 
  DollarCircleOutlined, 
  ClockCircleOutlined, 
  CalendarOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import axiosClient from '../api/axiosClient';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const StudentDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    borrowingCount: 0,
    overdueCount: 0,
    unpaidFines: 0,
    pendingReservations: 0,
  });
  const [recentBorrows, setRecentBorrows] = useState([]);
  
  const currentUser = JSON.parse(sessionStorage.getItem('user') || '{}');

  useEffect(() => {
    if (currentUser.id) {
      fetchStudentData();
    }
  }, [currentUser.id]);

  const fetchStudentData = async () => {
    setLoading(true);
    try {
      // Gọi song song 3 API để gom dữ liệu cho trang chủ sinh viên
      const [logsRes, violationsRes, reservationsRes] = await Promise.all([
        axiosClient.get('/borrow-logs'),
        axiosClient.get(`/violations/user/${currentUser.id}`),
        axiosClient.get('/reservations')
      ]);

      const allLogs = logsRes.data || [];
      const allViolations = violationsRes.data || [];
      const allReservations = reservationsRes.data || [];

      // 1. Xử lý dữ liệu sách mượn
      const myLogs = allLogs.filter(log => log.userId === currentUser.id);
      const activeBorrows = myLogs.filter(log => log.status === 'BORROWING');
      const overdueBorrows = activeBorrows.filter(log => dayjs().isAfter(dayjs(log.dueDate)));
      
      // Lấy 5 lượt mượn gần nhất (Mới nhất lên đầu)
      const recent = [...myLogs].sort((a, b) => new Date(b.borrowDate) - new Date(a.borrowDate)).slice(0, 5);

      // 2. Xử lý dữ liệu vi phạm & phạt
      const unpaidViolations = allViolations.filter(v => !v.isPaid);
      const totalUnpaidAmount = unpaidViolations.reduce((sum, v) => sum + v.fineAmount, 0);

      // 3. Xử lý dữ liệu đặt trước sách
      const myActiveReservations = allReservations.filter(
        r => r.userId === currentUser.id && (r.status === 'PENDING' || r.status === 'APPROVED')
      );

      setStats({
        borrowingCount: activeBorrows.length,
        overdueCount: overdueBorrows.length,
        unpaidFines: totalUnpaidAmount,
        pendingReservations: myActiveReservations.length
      });
      setRecentBorrows(recent);

    } catch (err) {
      message.error('Không thể tải dữ liệu tổng quan!');
    } finally {
      setLoading(false);
    }
  };

  const renderStatusTag = (status) => {
    const statusMap = {
      PENDING: { color: 'orange', text: 'Đang chờ duyệt' },
      BORROWING: { color: 'blue', text: 'Đang mượn' },
      RETURNED: { color: 'green', text: 'Đã trả sách' },
      REJECTED: { color: 'red', text: 'Bị từ chối' },
    };
    const current = statusMap[status] || { color: 'default', text: status };
    return <Tag color={current.color} style={{ fontWeight: '500' }}>{current.text}</Tag>;
  };

  return (
    <Spin spinning={loading}>
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0, fontWeight: 'bold' }}>👋 Xin chào, {currentUser.name}!</Title>
        <Text type="secondary">Chào mừng bạn trở lại Thư viện thông minh. Dưới đây là tổng quan hoạt động của bạn.</Text>
      </div>

      {stats.unpaidFines > 0 && (
        <Alert
          message="Nhắc nhở nộp phạt"
          description={<span>Bạn đang có khoản phạt chưa thanh toán tổng trị giá <b>{stats.unpaidFines.toLocaleString()}đ</b>. Vui lòng hoàn tất nộp phạt để không bị gián đoạn các dịch vụ mượn sách.</span>}
          type="error"
          showIcon
          icon={<WarningOutlined />}
          style={{ marginBottom: 24, borderRadius: '8px' }}
        />
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', borderLeft: '4px solid #1890ff' }}>
            <Statistic title="Sách đang mượn" value={stats.borrowingCount} suffix="cuốn" prefix={<BookOutlined style={{ color: '#1890ff' }} />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', borderLeft: '4px solid #722ed1' }}>
            <Statistic title="Đang đặt trước" value={stats.pendingReservations} suffix="cuốn" prefix={<CalendarOutlined style={{ color: '#722ed1' }} />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', borderLeft: stats.overdueCount > 0 ? '4px solid #f5222d' : '4px solid #52c41a' }}>
            <Statistic 
              title="Sách quá hạn trả" 
              value={stats.overdueCount} 
              suffix="cuốn" 
              valueStyle={{ color: stats.overdueCount > 0 ? '#f5222d' : '#3f8600' }}
              prefix={stats.overdueCount > 0 ? <WarningOutlined /> : <CheckCircleOutlined />} 
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', borderLeft: stats.unpaidFines > 0 ? '4px solid #fa8c16' : '4px solid #d9d9d9' }}>
            <Statistic title="Tiền phạt nợ" value={stats.unpaidFines} suffix="đ" prefix={<DollarCircleOutlined style={{ color: stats.unpaidFines > 0 ? '#fa8c16' : '#bfbfbf' }} />} />
          </Card>
        </Col>
      </Row>

      <Card title={<Space><ClockCircleOutlined style={{ color: '#1890ff' }} /> Lịch sử mượn sách gần đây</Space>} bordered={false} style={{ borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <List
          itemLayout="horizontal"
          dataSource={recentBorrows}
          locale={{ emptyText: 'Bạn chưa có lịch sử mượn sách nào' }}
          renderItem={(item) => (
            <List.Item
              actions={[renderStatusTag(item.status)]}
              style={{ padding: '16px 0' }}
            >
              <List.Item.Meta
                title={<span style={{ fontSize: '15px', fontWeight: '500' }}>{item.book?.title || 'Sách đã bị xóa'}</span>}
                description={`Ngày tạo đơn: ${dayjs(item.borrowDate).format('DD/MM/YYYY HH:mm')} | Hạn dự kiến: ${dayjs(item.dueDate).format('DD/MM/YYYY')}`}
              />
            </List.Item>
          )}
        />
      </Card>
    </Spin>
  );
};

export default StudentDashboard;