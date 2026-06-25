import React, { useEffect, useState, useMemo } from 'react';
import { Table, Button, Space, Input, Tag, message, Tooltip, Popconfirm, Select } from 'antd';
import { CheckOutlined, CloseOutlined, SearchOutlined, ClockCircleOutlined } from '@ant-design/icons';
import axiosClient from '../api/axiosClient';
import dayjs from 'dayjs';

const ReservationManagement = () => {
  const [reservations, setReservations] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    fetchReservations();
  }, []);

  const fetchReservations = async () => {
    try {
      const res = await axiosClient.get('/reservations');
      setReservations(res.data);
    } catch (err) {
      message.error('Không thể tải danh sách đặt trước!');
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await axiosClient.patch(`/reservations/${id}/status`, { status });
      message.success(status === 'APPROVED' ? 'Đã duyệt giữ chỗ thành công!' : 'Đã hủy đơn đặt trước!');
      fetchReservations();
    } catch (err) {
      message.error('Thao tác thất bại!');
    }
  };

  const filteredData = useMemo(() => {
    // Định nghĩa thứ tự ưu tiên của các trạng thái
    const statusOrder = {
      'PENDING': 1,   // Cần duyệt lên đầu
      'APPROVED': 2,  // Đã duyệt xếp sau
      'COMPLETED': 3, // Đã hoàn tất
      'CANCELLED': 4, // Đã hủy xếp cuối
    };

    // Sắp xếp lại mảng reservations nhận từ API
    const sortedReservations = [...reservations].sort((a, b) => {
      // So sánh dựa trên "trọng số" của trạng thái
      return (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
    });

    return sortedReservations.filter(item => {
      const matchesSearch = 
        item.user?.name?.toLowerCase().includes(searchText.toLowerCase()) ||
        item.user?.mssv?.toLowerCase().includes(searchText.toLowerCase()) ||
        item.book?.title?.toLowerCase().includes(searchText.toLowerCase());
      
      const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [reservations, searchText, statusFilter]);

  const renderStatusTag = (status) => {
    const statusMap = {
      PENDING: { color: 'orange', text: 'Chờ duyệt' },
      APPROVED: { color: 'green', text: 'Đã duyệt giữ chỗ' },
      CANCELLED: { color: 'red', text: 'Đã hủy' },
      COMPLETED: { color: 'blue', text: 'Đã nhận sách' },
    };
    const current = statusMap[status] || { color: 'default', text: status };
    return <Tag color={current.color} style={{ fontWeight: 'bold' }}>{current.text}</Tag>;
  };

  const columns = [
    {
      title: 'Ưu tiên',
      key: 'priority',
      width: 90,
      align: 'center',
      render: (_, __, index) => (
        <Tag color={index < 3 ? "volcano" : "blue"} style={{ borderRadius: '50%', width: 25, height: 25, textAlign: 'center', lineHeight: '23px', padding: 0, fontWeight: 'bold' }}>
          {index + 1}
        </Tag>
      )
    },
    {
      title: 'Sinh viên',
      key: 'user',
      render: (_, record) => (
        <div>
          <b>{record.user?.name}</b>
          <div style={{ fontSize: '12px', color: '#888' }}>MSSV: {record.user?.mssv}</div>
        </div>
      )
    },
    {
      title: 'Sách yêu cầu',
      key: 'book',
      render: (_, record) => (
        <div>
          <b>{record.book?.title}</b>
          <div style={{ fontSize: '12px' }}>
            Lượng trên kệ: <Tag color={record.book?.availableStock > 0 ? "green" : "red"}>{record.book?.availableStock} cuốn sẵn có</Tag>
          </div>
        </div>
      )
    },
    {
      title: 'Thời điểm đặt',
      dataIndex: 'reservedAt',
      key: 'reservedAt',
      render: (date) => dayjs(date).format('DD/MM/YYYY HH:mm')
    },
    {
      title: 'Hạn nhận sách',
      key: 'expiredAt',
      render: (_, record) => record.expiredAt ? (
        <span style={{ color: '#d46b08', fontWeight: '500' }}>{dayjs(record.expiredAt).format('DD/MM/YYYY')}</span>
      ) : '---'
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status) => renderStatusTag(status)
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 140,
      render: (_, record) => (
        <Space size="middle">
          {record.status === 'PENDING' && (
            <>
              <Tooltip title="Duyệt đặt trước (Giữ chỗ)">
                <Button 
                  type="primary" 
                  shape="circle" 
                  icon={<CheckOutlined />} 
                  style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                  onClick={() => handleUpdateStatus(record.id, 'APPROVED')}
                />
              </Tooltip>
              <Tooltip title="Hủy yêu cầu đặt">
                <Popconfirm title="Xác nhận hủy đơn đặt chỗ này?" onConfirm={() => handleUpdateStatus(record.id, 'CANCELLED')}>
                  <Button type="primary" danger shape="circle" icon={<CloseOutlined />} />
                </Popconfirm>
              </Tooltip>
            </>
          )}
          {record.status !== 'PENDING' && <span style={{ color: '#aaa', fontSize: '12px' }}>Đã xử lý</span>}
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: '15px', background: '#fff', borderRadius: '8px', width: '100%' }}>
      <h2 style={{ color: '#000', marginBottom: 20, fontWeight: 'bold' }}>Quản lý Đặt trước sách (Giữ chỗ)</h2>

      <div style={{ marginBottom: 20, display: 'flex', gap: '15px' }}>
        <Input
          placeholder="Tìm sinh viên, mssv hoặc tên sách..."
          prefix={<SearchOutlined />}
          style={{ width: 350 }}
          allowClear
          onChange={(e) => setSearchText(e.target.value)}
        />
        <Select
          defaultValue="ALL"
          style={{ width: 180 }}
          onChange={(value) => setStatusFilter(value)}
          options={[
            { value: 'ALL', label: 'Tất cả trạng thái' },
            { value: 'PENDING', label: 'Chờ duyệt (PENDING)' },
            { value: 'APPROVED', label: 'Đã duyệt (APPROVED)' },
            { value: 'CANCELLED', label: 'Đã hủy (CANCELLED)' },
            { value: 'COMPLETED', label: 'Đã nhận sách (COMPLETED)' },
          ]}
        />
      </div>

      <Table 
        dataSource={filteredData} 
        columns={columns} 
        rowKey="id" 
        pagination={{ pageSize: 8 }}
        scroll={{ x: 'max-content' }}
      />
    </div>
  );
};

export default ReservationManagement;