import React, { useEffect, useState, useMemo } from 'react';
import { 
  Table, Button, Space, Input, Tag, message, Tooltip, 
  Popconfirm, Select, Typography, Modal, Form, InputNumber, Divider 
} from 'antd';
import { 
  SearchOutlined, ReloadOutlined, DollarOutlined, WarningOutlined, 
  ClockCircleOutlined, CheckCircleOutlined, CloseCircleOutlined, 
  FileAddOutlined, UserOutlined 
} from '@ant-design/icons';
import axiosClient from '../api/axiosClient';

const { Title, Text } = Typography;
const { TextArea } = Input;

// Định nghĩa khung tiền phạt cố định theo quy định thư viện
const FINE_POLICY = {
  LATE_RETURN: 5000,   // Trả trễ: 5.000đ / ngày
  DAMAGED_BOOK: 50000, // Hỏng sách: 50.000đ
  LOST_BOOK: 150000,   // Mất sách: 150.000đ
};

const ViolationsManagement = () => {
  const [violations, setViolations] = useState([]);
  const [users, setUsers] = useState([]);               // Danh sách tất cả sinh viên trong hệ thống
  const [allBorrowLogs, setAllBorrowLogs] = useState([]); // Danh sách tất cả đơn mượn sách trong hệ thống
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  
  // State quản lý Modal và luồng đối chiếu dữ liệu
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null); // ID sinh viên được chọn trong modal
  const [form] = Form.useForm();

  useEffect(() => {
    fetchViolations();
    fetchAllDataForModal();
  }, []);

  // Tải lịch sử vi phạm
  const fetchViolations = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get('/violations/all');
      setViolations(res.data);
    } catch (err) {
      message.error('Không thể tải danh sách vi phạm!');
    } finally {
      setLoading(false);
    }
  };

  // 🔥 1. TẢI SẴN DATA SINH VIÊN & LOG MƯỢN ĐỂ ĐỐI CHIẾU TRONG MODAL
  const fetchAllDataForModal = async () => {
    try {
      // Gọi song song API lấy toàn bộ Users và toàn bộ BorrowLogs của thư viện
      const [usersRes, logsRes] = await Promise.all([
        axiosClient.get('/users'),       // Endpoint lấy danh sách tất cả user
        axiosClient.get('/borrow-logs')  // Endpoint lấy tất cả danh sách mượn sách
      ]);
      setUsers(usersRes.data || []);
      setAllBorrowLogs(logsRes.data || []);
    } catch (err) {
      console.error('Lỗi tải dữ liệu đối chiếu:', err);
    }
  };

  // 🔥 2. LỌC RA DANH SÁCH SÁCH MÀ SINH VIÊN ĐƯỢC CHỌN ĐANG MƯỢN (BORROWING)
  const currentActiveBorrows = useMemo(() => {
    if (!selectedUserId) return [];
    // Đối chiếu: Tìm trong allBorrowLogs những đơn có userId trùng khớp và đang ở trạng thái 'BORROWING'
    return allBorrowLogs.filter(log => log.userId === selectedUserId && log.status === 'BORROWING');
  }, [selectedUserId, allBorrowLogs]);

  // 🔥 3. TỰ ĐỘNG TÍNH TIỀN PHẠT THEO LOẠI VI PHẠM & NGÀY TRỄ
  const handleTypeOrBookChange = () => {
    const currentValues = form.getFieldsValue(['type', 'borrowLogId']);
    const type = currentValues.type;
    const borrowLogId = currentValues.borrowLogId;

    if (!type) return;

    let targetFine = FINE_POLICY[type] || 0;

    // Nếu chọn trả trễ, tự động đối chiếu ngày hạn để tính tiền lũy tiến
    if (type === 'LATE_RETURN' && borrowLogId) {
      const selectedLog = currentActiveBorrows.find(log => log.id === borrowLogId);
      if (selectedLog && selectedLog.dueDate) {
        const today = new Date();
        const dueDate = new Date(selectedLog.dueDate);
        if (today > dueDate) {
          const diffTime = Math.abs(today - dueDate);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          targetFine = diffDays * FINE_POLICY.LATE_RETURN;
          form.setFieldsValue({ description: `Quá hạn trả sách "${selectedLog.book?.title || ''}" ${diffDays} ngày.` });
        } else {
          targetFine = 0;
          form.setFieldsValue({ description: `Trả sách trước hoặc đúng hạn.` });
        }
      }
    }

    form.setFieldsValue({ fineAmount: targetFine });
  };

  // Khi thay đổi sinh viên ở ô Select, xóa sạch ô chọn sách cũ đi để chọn lại
  const handleUserSelectChange = (userId) => {
    setSelectedUserId(userId);
    form.setFieldsValue({ borrowLogId: undefined, fineAmount: 0 });
  };

  const handleCreateViolation = async (values) => {
    try {
      setLoading(true);
      await axiosClient.post('/violations/create', values);
      message.success('Đã lập biên bản vi phạm thành công!');
      setIsModalOpen(false);
      form.resetFields();
      setSelectedUserId(null);
      fetchViolations();
    } catch (err) {
      message.error('Lỗi khi lập biên bản!');
    } finally {
      setLoading(false);
    }
  };

  const handlePayFine = async (id) => {
    try {
      await axiosClient.patch(`/violations/${id}/pay`);
      message.success('Đã thu tiền phạt thành công!');
      setViolations(prev => prev.map(v => v.id === id ? { ...v, isPaid: true } : v));
    } catch (err) {
      message.error('Thao tác thất bại!');
    }
  };

  const filteredData = useMemo(() => {
    // Sắp xếp: Ưu tiên "Chưa thu" lên đầu, sau đó là các vi phạm mới nhất
    const sortedViolations = [...violations].sort((a, b) => {
      // So sánh trạng thái nộp phạt. `isPaid` false (0) sẽ đứng trước true (1).
      if (a.isPaid !== b.isPaid) {
        return a.isPaid - b.isPaid;
      }
      // Nếu cùng trạng thái, sắp xếp theo ngày tạo mới nhất lên đầu
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    return sortedViolations.filter(item => {
      const matchesSearch = 
        item.user?.name?.toLowerCase().includes(searchText.toLowerCase()) ||
        item.user?.mssv?.toLowerCase().includes(searchText.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchText.toLowerCase());
      const matchesType = typeFilter === 'ALL' || item.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [violations, searchText, typeFilter]);

  const renderTypeTag = (type) => {
    const typeMap = {
      LATE_RETURN: { color: 'orange', text: 'Trả trễ', icon: <ClockCircleOutlined /> },
      DAMAGED_BOOK: { color: 'volcano', text: 'Hỏng sách', icon: <WarningOutlined /> },
      LOST_BOOK: { color: 'red', text: 'Mất sách', icon: <CloseCircleOutlined /> },
    };
    const current = typeMap[type] || { color: 'default', text: type };
    return <Tag color={current.color} style={{fontWeight:'bold'}}>{current.icon} {current.text}</Tag>;
  };

  const columns = [
    { title: 'Mã', dataIndex: 'id', width: 70, render: (id) => <Text type="secondary">#{id}</Text> },
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
    { title: 'Vi phạm', dataIndex: 'type', render: (type) => renderTypeTag(type) },
    { title: 'Chi tiết nội dung', dataIndex: 'description', ellipsis: true },
    { title: 'Tiền phạt', dataIndex: 'fineAmount', render: (amount) => <b style={{color: '#d4380d'}}>{amount.toLocaleString()}đ</b> },
    {
      title: 'Trạng thái',
      dataIndex: 'isPaid',
      render: (paid) => (
        <Tag color={paid ? 'green' : 'red'}>
          {paid ? <CheckCircleOutlined /> : <WarningOutlined />} {paid ? 'Đã thu' : 'Chưa thu'}
        </Tag>
      )
    },
    {
      title: 'Xử lý',
      key: 'actions',
      align: 'center',
      render: (_, record) => (
        <Space>
          {!record.isPaid ? (
            <Popconfirm title="Xác nhận đã thu tiền?" onConfirm={() => handlePayFine(record.id)}>
              <Button type="primary" size="small" icon={<DollarOutlined />} style={{background: '#52c41a', border: 'none'}} />
            </Popconfirm>
          ) : <Text type="secondary" italic>Xong</Text>}
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: '20px', background: '#fff', borderRadius: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <Title level={3} style={{margin: 0}}>Quản lý Vi Phạm</Title>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchViolations} loading={loading}>Làm mới</Button>
          <Button type="primary" danger icon={<FileAddOutlined />} onClick={() => setIsModalOpen(true)}>Lập biên bản</Button>
        </Space>
      </div>

      <div style={{ marginBottom: 20, display: 'flex', gap: '15px' }}>
        <Input 
          placeholder="Tìm tên, MSSV..." 
          prefix={<SearchOutlined />} 
          style={{ width: 300 }} 
          onChange={e => setSearchText(e.target.value)}
        />
        <Select 
          defaultValue="ALL" 
          style={{ width: 150 }} 
          onChange={v => setTypeFilter(v)}
          options={[
            { value: 'ALL', label: 'Tất cả lỗi' },
            { value: 'LATE_RETURN', label: 'Trả trễ' },
            { value: 'DAMAGED_BOOK', label: 'Hỏng sách' },
            { value: 'LOST_BOOK', label: 'Mất sách' },
          ]}
        />
      </div>

      <Table dataSource={filteredData} columns={columns} rowKey="id" loading={loading} bordered />

      {/* 🔥 MODAL FORM ĐỐI CHIẾU THÔNG MINH BIẾN ĐỔI THEO SELECTION */}
      <Modal
        title={<b><FileAddOutlined /> LẬP BIÊN BẢN VI PHẠM ĐỐI CHIẾU</b>}
        open={isModalOpen}
        onCancel={() => { setIsModalOpen(false); form.resetFields(); setSelectedUserId(null); }}
        onOk={() => form.submit()}
        okText="Lưu biên bản"
        cancelText="Hủy bỏ"
        confirmLoading={loading}
        width={550}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateViolation} initialValues={{ fineAmount: 0 }}>
          
          {/* 🔥 Ô CHỌN SINH VIÊN: Hiển thị tên tất cả sinh viên + hỗ trợ Search tìm kiếm nhanh */}
          <Form.Item 
  label="Chọn Sinh viên vi phạm" 
  name="userId" 
  rules={[{ required: true, message: 'Vui lòng chọn sinh viên!' }]}
>
  <Select
    showSearch
    placeholder="Gõ tìm kiếm theo tên hoặc MSSV của sinh viên..."
    optionFilterProp="children"
    onChange={handleUserSelectChange}
    filterOption={(input, option) =>
      (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
    }
    // 🔥 SỬA ĐOẠN NÀY: Thêm .filter() để loại bỏ Admin/Thủ thư ra khỏi danh sách biên bản
    options={users
      .filter(user => user.role?.toUpperCase() === 'STUDENT') // Ép về chữ hoa để so sánh chính xác
      .map(user => ({
        value: user.id,
        label: `👤 ${user.name} (MSSV: ${user.mssv || 'Không có'})`
      }))}
  />
</Form.Item>

          {/* 🔥 Ô CHỌN SÁCH: Tự động render danh sách các cuốn sách sinh viên đó đang mượn được lọc từ borrowLogs */}
          <Form.Item 
            label="Chọn cuốn sách đang mượn gặp sự cố" 
            name="borrowLogId"
          >
            <Select
              placeholder={selectedUserId 
                ? (currentActiveBorrows.length > 0 ? "Chọn cuốn sách sinh viên này đang mượn..." : "Sinh viên này hiện không mượn cuốn sách nào!")
                : "Vui lòng chọn sinh viên trước để đối chiếu sách mượn..."
              }
              disabled={currentActiveBorrows.length === 0}
              onChange={handleTypeOrBookChange}
              options={currentActiveBorrows.map(log => ({
                value: log.id,
                label: `📚 ${log.book?.title || 'Sách'} (Hạn: ${new Date(log.dueDate).toLocaleDateString('vi-VN')})`
              }))}
            />
          </Form.Item>

          <Form.Item 
            label="Loại vi phạm phát sinh" 
            name="type" 
            rules={[{ required: true, message: 'Vui lòng chọn lỗi!' }]}
          >
            <Select 
              onChange={handleTypeOrBookChange} // Đổi loại lỗi tự nhảy tiền phạt tương ứng
              options={[
                { value: 'DAMAGED_BOOK', label: '💥 Làm hỏng sách (Phạt cố định: 50.000đ)' },
                { value: 'LOST_BOOK', label: '❌ Làm mất sách (Phạt cố định: 150.000đ)' },
                { value: 'LATE_RETURN', label: '⏳ Trả sách trễ (Tự động nhân số ngày trễ dựa trên hạn của sách)' },
              ]} 
            />
          </Form.Item>

          <Divider style={{ margin: '12px 0' }} />

          {/* Ô tiền phạt tự nhảy số */}
          <Form.Item label="Số tiền nộp phạt tự động tính toán (VNĐ)" name="fineAmount">
            <InputNumber 
              formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={value => value.replace(/\$\s?|(,*)/g, '')}
              style={{ width: '100%', fontSize: '16px', fontWeight: 'bold', color: '#d4380d' }} 
              addonAfter="đ"
            />
          </Form.Item>

          <Form.Item label="Mô tả ghi chú biên bản" name="description">
            <TextArea rows={2} placeholder="Nhập tình trạng chi tiết hư hại rách nát nếu có..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ViolationsManagement;