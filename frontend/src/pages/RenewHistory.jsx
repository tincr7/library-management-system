import React, { useEffect, useState } from 'react';
import { Table, Button, Space, Tag, message, Typography, Tabs, Modal, Form, Input } from 'antd';
import { SyncOutlined, HistoryOutlined, ArrowRightOutlined, CalendarOutlined } from '@ant-design/icons';
import axiosClient from '../api/axiosClient';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;

const RenewHistory = ({ defaultTab = '1' }) => {
  const [borrowLogs, setBorrowLogs] = useState([]);
  const [histories, setHistories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [form] = Form.useForm();
  
  // Lấy thông tin user hiện tại từ Session Storage
  const currentUser = JSON.parse(sessionStorage.getItem('user') || '{}');

  useEffect(() => {
    if (currentUser.id) {
      fetchData();
    }
  }, [currentUser.id]);

  // Tải đồng thời danh sách đang mượn và lịch sử gia hạn
  const fetchData = async () => {
    setLoading(true);
    try {
      const [logsRes, histRes] = await Promise.all([
        axiosClient.get('/borrow-logs'),
        axiosClient.get('/renew/all')
      ]);
      setBorrowLogs(logsRes.data || []);
      setHistories(histRes.data || []);
    } catch (err) {
      message.error('Không thể tải dữ liệu từ máy chủ!');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenRenewModal = (log) => {
    setSelectedLog(log);
    form.resetFields();
    setIsModalOpen(true);
  };

  // Xử lý submit lên API POST /renew/request
  const handleRenewSubmit = async (values) => {
    try {
      setLoading(true);
      await axiosClient.post('/renew/request', {
        borrowLogId: selectedLog.id,
        reason: values.reason || 'Sinh viên gia hạn trực tuyến.'
      });
      message.success('Gia hạn sách thành công! (+7 ngày)');
      setIsModalOpen(false);
      fetchData(); // Load lại dữ liệu để cập nhật số lần gia hạn và lịch sử
    } catch (err) {
      message.error(err.response?.data?.message || 'Gia hạn thất bại!');
    } finally {
      setLoading(false);
    }
  };

  // Bộ lọc dữ liệu chỉ lấy thông tin của sinh viên đang đăng nhập
  const myActiveBorrows = borrowLogs.filter(
    log => log.userId === currentUser.id && log.status === 'BORROWING'
  );
  
  const myHistories = histories
    .filter(h => h.borrowLog?.userId === currentUser.id)
    .sort((a, b) => new Date(b.renewedAt) - new Date(a.renewedAt));

  // Cấu hình cột bảng "Đang mượn"
  const borrowColumns = [
    {
      title: 'Sách đang mượn',
      key: 'book',
      render: (_, record) => (
        <Space>
          <img 
            src={record.book?.coverImage || 'https://via.placeholder.com/40x55?text=No+Cover'} 
            alt="cover" 
            style={{ width: 40, height: 55, objectFit: 'cover', borderRadius: '4px' }}
          />
          <b>{record.book?.title}</b>
        </Space>
      )
    },
    {
      title: 'Ngày mượn',
      dataIndex: 'borrowDate',
      key: 'borrowDate',
      render: (date) => dayjs(date).format('DD/MM/YYYY HH:mm')
    },
    {
      title: 'Hạn trả hiện tại',
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: (date) => {
        const isOverdue = dayjs().isAfter(dayjs(date));
        return (
          <Tag color={isOverdue ? 'red' : 'green'} style={{ fontWeight: 'bold', fontSize: '13px' }}>
            {dayjs(date).format('DD/MM/YYYY')}
            {isOverdue && ' (Đã quá hạn)'}
          </Tag>
        );
      }
    },
    {
      title: 'Số lần gia hạn',
      dataIndex: 'renewCount',
      key: 'renewCount',
      render: (count) => (
        <Text type={count >= 3 ? 'danger' : 'secondary'} strong>
          {count} / 3 lần
        </Text>
      )
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_, record) => {
        const isOverdue = dayjs().isAfter(dayjs(record.dueDate));
        const canRenew = record.renewCount < 3 && !isOverdue; // Logic bám sát Backend rules
        
        return (
          <Button 
            type="primary" 
            icon={<SyncOutlined />} 
            disabled={!canRenew}
            onClick={() => handleOpenRenewModal(record)}
            style={{ borderRadius: '6px' }}
          >
            Gia hạn
          </Button>
        );
      }
    }
  ];

  // Cấu hình cột bảng "Lịch sử gia hạn"
  const historyColumns = [
    { title: 'Mã lượt mượn', dataIndex: 'borrowLogId', key: 'borrowLogId', width: 120, render: (id) => <Text type="secondary">#{id}</Text> },
    { title: 'Sách đã gia hạn', key: 'book', render: (_, record) => <b>{record.borrowLog?.book?.title || 'Sách đã bị xóa'}</b> },
    {
      title: 'Thay đổi thời hạn',
      key: 'dates',
      render: (_, record) => (
        <Space size="small">
          <Tag color="default">{dayjs(record.oldDueDate).format('DD/MM/YYYY')}</Tag>
          <ArrowRightOutlined style={{ color: '#8c8c8c' }} />
          <Tag color="blue" style={{ fontWeight: 'bold' }}>{dayjs(record.newDueDate).format('DD/MM/YYYY')}</Tag>
        </Space>
      )
    },
    { title: 'Lý do', dataIndex: 'reason', key: 'reason', render: (text) => text ? <Text>{text}</Text> : <Text type="secondary" italic>Không điền</Text> },
    { title: 'Ngày thực hiện', dataIndex: 'renewedAt', key: 'renewedAt', render: (date) => <Space size={4}><CalendarOutlined style={{ color: '#aaa' }} />{dayjs(date).format('DD/MM/YYYY HH:mm')}</Space> }
  ];

  return (
    <div style={{ width: '100%' }}>
      <div style={{ marginBottom: 20 }}>
        <Title level={3} style={{ margin: 0, fontWeight: 'bold' }}><SyncOutlined style={{ color: '#1890ff', marginRight: 10 }} />Quản lý gia hạn</Title>
        <Text type="secondary">Theo dõi các sách đang mượn và thực hiện gia hạn thời gian mượn trực tuyến dễ dàng.</Text>
      </div>

      <style>{`
        @media (max-width: 767px) {
          .responsive-table .ant-table-cell {
            font-size: 12px;
            padding: 10px 8px;
          }
        }
      `}</style>

      <Tabs 
        defaultActiveKey={defaultTab} 
        type="card"
        items={[
          { key: '1', label: <span style={{ fontWeight: 500 }}><SyncOutlined /> Sách đang mượn (Có thể gia hạn)</span>, children: <Table dataSource={myActiveBorrows} columns={borrowColumns} rowKey="id" loading={loading} pagination={{ pageSize: 5 }} bordered scroll={{ x: 'max-content' }} className="responsive-table" /> },
          { key: '2', label: <span style={{ fontWeight: 500 }}><HistoryOutlined /> Lịch sử gia hạn của tôi</span>, children: <Table dataSource={myHistories} columns={historyColumns} rowKey="id" loading={loading} pagination={{ pageSize: 5 }} bordered scroll={{ x: 'max-content' }} className="responsive-table" /> }
        ]}
      />

      <Modal title="Xác nhận gia hạn sách" open={isModalOpen} onCancel={() => setIsModalOpen(false)} onOk={() => form.submit()} confirmLoading={loading} okText="Gia hạn (+7 ngày)" cancelText="Hủy">
        <div style={{ marginBottom: 16, background: '#e6f7ff', padding: 12, borderRadius: 6, border: '1px solid #91caff' }}>
          <Text strong>📚 Sách:</Text> {selectedLog?.book?.title} <br/>
          <Text strong>⏳ Hạn trả mới dự kiến:</Text> <Tag color="green" style={{ marginLeft: 6 }}>{dayjs(selectedLog?.dueDate).add(7, 'day').format('DD/MM/YYYY')}</Tag>
        </div>
        <Form form={form} layout="vertical" onFinish={handleRenewSubmit}>
          <Form.Item label="Lý do gia hạn (Tùy chọn)" name="reason"><TextArea rows={3} placeholder="Ví dụ: Em chưa đọc xong, cần thêm thời gian..." /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default RenewHistory;