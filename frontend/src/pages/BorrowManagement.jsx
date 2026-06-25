import React, { useEffect, useState, useMemo } from 'react';
import { Table, Button, Space, Input, Tag, message, Tooltip, Popconfirm, Select } from 'antd';
import { CheckOutlined, CloseOutlined, UndoOutlined, SearchOutlined } from '@ant-design/icons';
import axiosClient from '../api/axiosClient';
import dayjs from 'dayjs'; // Dùng để format ngày tháng cho đẹp

const BorrowManagement = () => {
  const [logs, setLogs] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // Bộ lọc trạng thái nhanh

  useEffect(() => {
    fetchBorrowLogs();
  }, []);

  // 1. Tải danh sách đơn mượn từ Backend
  const fetchBorrowLogs = async () => {
    try {
      const res = await axiosClient.get('/borrow-logs');
      setLogs(res.data);
    } catch (err) {
      message.error('Không thể tải danh sách duyệt mượn trả!');
    }
  };

  // 2. Hàm xử lý duyệt trạng thái (Gọi API PATCH)
  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await axiosClient.patch(`/borrow-logs/${id}/status`, { status: newStatus });
      message.success('Cập nhật trạng thái đơn hàng thành công!');
      fetchBorrowLogs(); // Reload lại bảng để cập nhật số liệu kho mới
    } catch (err) {
      // Đọc thông báo lỗi từ Backend trả về (Ví dụ: "Sách đã hết trên kệ")
      const errorMsg = err.response?.data?.message || 'Thao tác thất bại!';
      message.error(errorMsg);
    }
  };

  // 3. Khối logic tìm kiếm và lọc trạng thái kết hợp useMemo
  const filteredLogs = useMemo(() => {
    // Định nghĩa thứ tự ưu tiên của các trạng thái
    const statusOrder = {
      'PENDING': 1,
      'BORROWING': 2,
      'OVERDUE': 3,
      'RETURNED': 4,
      'REJECTED': 5,
    };

    const sortedLogs = [...logs].sort((a, b) => {
      return (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
    });

    return sortedLogs.filter(log => {
      const matchesSearch = 
        log.user?.name?.toLowerCase().includes(searchText.toLowerCase()) ||
        log.user?.mssv?.toLowerCase().includes(searchText.toLowerCase()) ||
        log.book?.title?.toLowerCase().includes(searchText.toLowerCase());
      
      const matchesStatus = statusFilter === 'ALL' || log.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [logs, searchText, statusFilter]);

  // Hàm helper render màu sắc cho các Tag trạng thái
  const renderStatusTag = (status) => {
    const statusMap = {
      PENDING: { color: 'orange', text: 'Chờ duyệt' },
      BORROWING: { color: 'blue', text: 'Đang mượn' },
      RETURNED: { color: 'green', text: 'Đã trả' },
      REJECTED: { color: 'red', text: 'Đã từ chối' },
      OVERDUE: { color: 'purple', text: 'Quá hạn' },
    };
    const current = statusMap[status] || { color: 'default', text: status };
    return <Tag color={current.color} style={{ fontWeight: 'bold' }}>{current.text}</Tag>;
  };

  const columns = [
    { 
      title: 'Thông tin Sinh viên', 
      key: 'user',
      render: (_, record) => (
        <div>
          <b>{record.user?.name}</b>
          <div style={{ fontSize: '12px', color: '#888' }}>MSSV: {record.user?.mssv}</div>
        </div>
      )
    },
    { 
      title: 'Sách đăng ký', 
      key: 'book',
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img 
            src={record.book?.coverImage || 'https://via.placeholder.com/40x55?text=No+Cover'} 
            alt="cover" 
            style={{ width: 35, height: 50, objectFit: 'cover', borderRadius: '4px' }}
          />
          <b>{record.book?.title}</b>
        </div>
      )
    },
    { 
      title: 'Ngày Đăng ký/Mượn', 
      dataIndex: 'borrowDate', 
      key: 'borrowDate',
      render: (date) => dayjs(date).format('DD/MM/YYYY HH:mm')
    },
    { 
      title: 'Hạn trả dự kiến', 
      dataIndex: 'dueDate', 
      key: 'dueDate',
      render: (date) => <span style={{ color: '#e02424', fontWeight: '500' }}>{dayjs(date).format('DD/MM/YYYY')}</span>
    },
    { 
      title: 'Ngày trả thực tế', 
      dataIndex: 'returnDate', 
      key: 'returnDate',
      render: (date) => date ? <Tag color="cyan">{dayjs(date).format('DD/MM/YYYY HH:mm')}</Tag> : '---'
    },
    { 
      title: 'Trạng thái', 
      dataIndex: 'status', 
      key: 'status',
      render: (status) => renderStatusTag(status)
    },
    {
      title: 'Duyệt thao tác',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          {/* Nút hiển thị khi đơn ở trạng thái CHỜ DUYỆT (PENDING) */}
          {record.status === 'PENDING' && (
            <>
              <Tooltip title="Duyệt cho mượn sách">
                <Button 
                  type="primary" 
                  shape="circle" 
                  icon={<CheckOutlined />} 
                  style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                  onClick={() => handleUpdateStatus(record.id, 'BORROWING')}
                />
              </Tooltip>
              <Tooltip title="Từ chối yêu cầu">
                <Popconfirm title="Từ chối đơn mượn này?" onConfirm={() => handleUpdateStatus(record.id, 'REJECTED')}>
                  <Button type="primary" danger shape="circle" icon={<CloseOutlined />} />
                </Popconfirm>
              </Tooltip>
            </>
          )}

          {/* Nút hiển thị khi sinh viên đang cầm sách (BORROWING) mang đến trả */}
          {record.status === 'BORROWING' && (
            <Tooltip title="Xác nhận sinh viên đã trả sách">
              <Popconfirm title="Xác nhận thu hồi sách về kho?" onConfirm={() => handleUpdateStatus(record.id, 'RETURNED')}>
                <Button 
                  type="primary" 
                  icon={<UndoOutlined />} 
                  style={{ backgroundColor: '#13c2c2', borderColor: '#13c2c2' }}
                >
                  Thu hồi
                </Button>
              </Popconfirm>
            </Tooltip>
          )}

          {/* Nếu đơn đã hoàn thành (RETURNED hoặc REJECTED) thì không cần thao tác */}
          {['RETURNED', 'REJECTED'].includes(record.status) && (
            <span style={{ color: '#aaa', fontSize: '12px' }}>Đã đóng chu trình</span>
          )}
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: '15px', background: '#fff', borderRadius: '8px', width: '100%' }}>
      <h2 style={{ color: '#000', marginBottom: 20, fontWeight: 'bold' }}>Duyệt yêu cầu Mượn / Trả sách</h2>

      {/* Thanh công cụ Tìm kiếm kết hợp Bộ lọc nhanh */}
      <div style={{ marginBottom: 20, display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
        <Input
          placeholder="Tìm theo tên SV, MSSV hoặc tên sách..."
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
            { value: 'BORROWING', label: 'Đang mượn (BORROWING)' },
            { value: 'RETURNED', label: 'Đã trả (RETURNED)' },
            { value: 'REJECTED', label: 'Bị từ chối (REJECTED)' },
          ]}
        />
      </div>

      <Table 
        dataSource={filteredLogs} 
        columns={columns} 
        rowKey="id"
        pagination={{ pageSize: 8 }}
        scroll={{ x: 'max-content' }} // Tận dụng tối đa màn hình rộng không lo vỡ khung
      />
    </div>
  );
};

export default BorrowManagement;