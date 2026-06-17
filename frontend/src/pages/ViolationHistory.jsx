import React, { useEffect, useState } from 'react';
import { Table, Typography, Tag, Card, Alert, message, Button } from 'antd';
import { WarningOutlined, ClockCircleOutlined, CloseCircleOutlined, CheckCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import axiosClient from '../api/axiosClient';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const ViolationHistory = () => {
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(false);

  // Lấy thông tin user hiện tại từ Session Storage
  const currentUser = JSON.parse(sessionStorage.getItem('user') || '{}');

  useEffect(() => {
    if (currentUser.id) {
      fetchMyViolations();
    }
  }, [currentUser.id]);

  const fetchMyViolations = async () => {
    setLoading(true);
    try {
      // Gọi API lấy vi phạm của user đang đăng nhập
      const res = await axiosClient.get(`/violations/user/${currentUser.id}`);
      // Sắp xếp giảm dần theo thời gian tạo (Mới nhất lên đầu)
      const sortedData = (res.data || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setViolations(sortedData);
    } catch (err) {
      message.error('Không thể tải lịch sử vi phạm!');
    } finally {
      setLoading(false);
    }
  };

  const renderTypeTag = (type) => {
    const typeMap = {
      LATE_RETURN: { color: 'orange', text: 'Trả trễ', icon: <ClockCircleOutlined /> },
      DAMAGED_BOOK: { color: 'volcano', text: 'Hỏng sách', icon: <WarningOutlined /> },
      LOST_BOOK: { color: 'red', text: 'Mất sách', icon: <CloseCircleOutlined /> },
    };
    const current = typeMap[type] || { color: 'default', text: type };
    return <Tag color={current.color} style={{ fontWeight: 'bold' }}>{current.icon} {current.text}</Tag>;
  };

  const columns = [
    { title: 'Loại vi phạm', dataIndex: 'type', render: (type) => renderTypeTag(type) },
    { title: 'Sách liên quan', key: 'book', render: (_, record) => record.borrowLog?.book?.title ? <b>{record.borrowLog.book.title}</b> : <Text type="secondary">Không có</Text> },
    { title: 'Chi tiết', dataIndex: 'description', ellipsis: true },
    { title: 'Tiền phạt', dataIndex: 'fineAmount', render: (amount) => <b style={{ color: '#d4380d' }}>{amount.toLocaleString()}đ</b> },
    { title: 'Ngày ghi nhận', dataIndex: 'createdAt', render: (date) => dayjs(date).format('DD/MM/YYYY HH:mm') },
    {
      title: 'Trạng thái',
      dataIndex: 'isPaid',
      render: (paid) => (
        <Tag color={paid ? 'green' : 'red'}>
          {paid ? <CheckCircleOutlined /> : <WarningOutlined />} {paid ? 'Đã nộp phạt' : 'Chưa nộp phạt'}
        </Tag>
      )
    }
  ];

  // Tính tổng số tiền phạt chưa nộp
  const totalUnpaidFine = violations.filter(v => !v.isPaid).reduce((sum, v) => sum + v.fineAmount, 0);

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <Title level={3} style={{ margin: 0, fontWeight: 'bold' }}>
            <WarningOutlined style={{ color: '#f5222d', marginRight: 10 }} />
            Lịch Sử Vi Phạm & Nộp Phạt
          </Title>
          <Text type="secondary">Theo dõi các vi phạm của bạn và trạng thái nộp phạt tại thư viện.</Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={fetchMyViolations} loading={loading}>
          Làm mới
        </Button>
      </div>

      {totalUnpaidFine > 0 && (
        <Alert
          message="Bạn có khoản phạt chưa thanh toán!"
          description={<span>Tổng số tiền phạt chưa nộp là <b style={{ color: '#d4380d', fontSize: '16px' }}>{totalUnpaidFine.toLocaleString()}đ</b>. Vui lòng đến quầy thư viện để thanh toán sớm nhất có thể.</span>}
          type="error"
          showIcon
          style={{ marginBottom: 20, borderRadius: '8px' }}
        />
      )}

      <Card bordered={false} bodyStyle={{ padding: 0 }}>
        <Table 
          dataSource={violations} 
          columns={columns} 
          rowKey="id" 
          loading={loading} 
          pagination={{ pageSize: 8 }} 
          bordered 
        />
      </Card>
    </div>
  );
};

export default ViolationHistory;