import React, { useEffect, useState, useMemo } from 'react';
import { Table, Input, Tag, Typography, Space, Card, Button, message } from 'antd';
import { SearchOutlined, ReloadOutlined, HistoryOutlined, ArrowRightOutlined, CalendarOutlined } from '@ant-design/icons';
import axiosClient from '../api/axiosClient';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const RenewHistoryManagement = () => {
  const [histories, setHistories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    fetchRenewHistories();
  }, []);

  // Tải toàn bộ lịch sử gia hạn từ API Backend /renew/all
  const fetchRenewHistories = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get('/renew/all');
      
      // 🔥 SỬA TẠI ĐÂY: Sắp xếp mảng theo thời gian renewedAt giảm dần (Mới nhất lên đầu)
      const sortedData = (res.data || []).sort((a, b) => {
        return new Date(b.renewedAt) - new Date(a.renewedAt);
      });
      
      setHistories(sortedData);
    } catch (err) {
      message.error('Không thể tải lịch sử gia hạn!');
    } finally {
      setLoading(false);
    }
  };

  // Bộ lọc tìm kiếm theo Tên SV, MSSV hoặc Tên Sách
  const filteredData = useMemo(() => {
    return histories.filter(item => {
      const user = item.borrowLog?.user;
      const book = item.borrowLog?.book;
      return (
        user?.name?.toLowerCase().includes(searchText.toLowerCase()) ||
        user?.mssv?.toLowerCase().includes(searchText.toLowerCase()) ||
        book?.title?.toLowerCase().includes(searchText.toLowerCase()) ||
        item.reason?.toLowerCase().includes(searchText.toLowerCase())
      );
    });
  }, [histories, searchText]);

  const columns = [
    {
      title: 'Mã',
      dataIndex: 'id',
      key: 'id',
      width: 70,
      render: (id) => <Text type="secondary">#{id}</Text>
    },
    {
      title: 'Sinh viên',
      key: 'user',
      render: (_, record) => {
        const user = record.borrowLog?.user;
        return (
          <div>
            <b>{user?.name || 'N/A'}</b>
            <div style={{ fontSize: '12px', color: '#888' }}>MSSV: {user?.mssv}</div>
          </div>
        );
      }
    },
    {
      title: 'Sách được gia hạn',
      key: 'book',
      render: (_, record) => {
        const book = record.borrowLog?.book;
        return (
          <div>
            <b style={{ color: '#1890ff' }}>{book?.title || 'Sách đã bị xóa'}</b>
            <div style={{ fontSize: '12px', color: '#888' }}>Lượt mượn: #{record.borrowLogId}</div>
          </div>
        );
      }
    },
    {
      title: 'Thay đổi thời hạn (Hạn cũ -> Hạn mới)',
      key: 'dates',
      render: (_, record) => (
        <Space size="middle">
          <Tag color="default" style={{ fontWeight: '500' }}>
            {dayjs(record.oldDueDate).format('DD/MM/YYYY')}
          </Tag>
          <ArrowRightOutlined style={{ color: '#8c8c8c' }} />
          <Tag color="green" style={{ fontWeight: 'bold' }}>
            {dayjs(record.newDueDate).format('DD/MM/YYYY')}
          </Tag>
        </Space>
      )
    },
    {
      title: 'Lý do gia hạn',
      dataIndex: 'reason',
      key: 'reason',
      ellipsis: true,
      render: (text) => text ? <Text>{text}</Text> : <Text type="secondary" italic>Không điền lý do</Text>
    },
    {
      title: 'Ngày thực hiện',
      dataIndex: 'renewedAt',
      key: 'renewedAt',
      render: (date) => (
        <Space size={4}>
          <CalendarOutlined style={{ color: '#aaa' }} />
          {dayjs(date).format('DD/MM/YYYY HH:mm')}
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: '20px', background: '#fff', borderRadius: '10px', width: '100%' }}>
      {/* Khối Tiêu Đề */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Title level={3} style={{ margin: 0, fontWeight: 'bold' }}>
            <HistoryOutlined style={{ marginRight: 8, color: '#1890ff' }} />
            Lịch Sử Gia Hạn Sách
          </Title>
          <Text type="secondary">Theo dõi chi tiết số lần kéo dài thời gian mượn sách của sinh viên.</Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={fetchRenewHistories} loading={loading}>
          Làm mới
        </Button>
      </div>

      {/* Thanh Tìm Kiếm */}
      <div style={{ marginBottom: 20 }}>
        <Input
          placeholder="Tìm theo tên sinh viên, mssv hoặc tên sách..."
          prefix={<SearchOutlined />}
          style={{ width: 380 }}
          allowClear
          onChange={(e) => setSearchText(e.target.value)}
        />
      </div>

      {/* Bảng Hiển Thị */}
      <Table
        dataSource={filteredData}
        columns={columns}
        rowKey="id"
        loading={loading}
        bordered
        pagination={{ pageSize: 8 }}
        scroll={{ x: 'max-content' }}
      />
    </div>
  );
};

export default RenewHistoryManagement