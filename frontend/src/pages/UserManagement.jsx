import React, { useEffect, useState, useMemo } from 'react';
import { Table, Button, Space, Modal, Form, Input, message, Popconfirm, Tag, Tooltip } from 'antd';
import { 
  EditOutlined, 
  UserAddOutlined, 
  SearchOutlined, 
  LockOutlined, 
  UnlockOutlined, 
  ReloadOutlined 
} from '@ant-design/icons';
import axiosClient from '../api/axiosClient';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try {
      const res = await axiosClient.get('/users');
      // CHỈNH SỬA TẠI ĐÂY: Lọc chỉ lấy những user có role là STUDENT
      const studentList = res.data.filter(user => user.role === 'STUDENT');
      setUsers(studentList);
    } catch (err) { 
      message.error('Không thể tải danh sách!'); 
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter(user => 
      user.mssv?.toLowerCase().includes(searchText.toLowerCase()) ||
      user.name?.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [users, searchText]);

  const showModal = (user = null) => {
    setEditingUser(user);
    if (user) {
      form.setFieldsValue(user);
    } else {
      form.resetFields();
    }
    setIsModalVisible(true);
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      if (editingUser) {
        await axiosClient.patch(`/users/${editingUser.id}`, values);
        message.success('Cập nhật thành công!');
      } else {
        // Luôn gửi role: 'STUDENT' khi thêm mới từ trang này
        await axiosClient.post('/users', { ...values, password: '123456', role: 'STUDENT' });
        message.success('Thêm thành công! Mật khẩu mặc định: 123456');
      }
      setIsModalVisible(false);
      fetchUsers();
    } catch (err) { message.error('Thao tác thất bại!'); }
  };

  const handleToggleStatus = async (record) => {
    try {
      const currentStatus = record.isActive === false ? false : true;
      const newStatus = !currentStatus;

      await axiosClient.patch(`/users/${record.id}`, { 
        isActive: newStatus 
      });
      
      message.success(newStatus ? 'Đã mở khóa!' : 'Đã khóa tài khoản!');
      fetchUsers(); 
    } catch (err) { 
      message.error('Lỗi khi cập nhật trạng thái!'); 
    }
  };

  const columns = [
    { title: 'MSSV', dataIndex: 'mssv', key: 'mssv', width: 150 },
    { title: 'Họ và Tên', dataIndex: 'name', key: 'name' },
    { title: 'TelegramID', dataIndex: 'telegramId', key: 'telegramId' },
    { 
      title: 'Trạng thái', 
      dataIndex: 'isActive',
      render: (isActive) => (
        <Tag color={isActive !== false ? 'green' : 'red'}>
          {isActive !== false ? 'Hoạt động' : 'Đã khóa'}
        </Tag>
      )
    },
    {
      title: 'Thao tác',
      render: (_, record) => (
        <Space>
          <Button type="text" icon={<EditOutlined />} onClick={() => showModal(record)} />
          
          <Popconfirm 
            title="Reset mật khẩu về 123456?" 
            onConfirm={async () => {
              await axiosClient.patch(`/users/${record.id}`, { password: '123456' });
              message.success('Đã reset về 123456');
              fetchUsers();
            }}
          >
            <Button type="text" icon={<ReloadOutlined />} style={{ color: '#faad14' }} />
          </Popconfirm>

          <Tooltip title={record.isActive !== false ? "Khóa" : "Mở khóa"}>
            <Button 
              type="text" 
              danger={record.isActive !== false} 
              icon={record.isActive !== false ? <LockOutlined /> : <UnlockOutlined />} 
              onClick={() => handleToggleStatus(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '10px' }}>
      <h2 style={{ color: '#000', marginBottom: 20 }}>Danh sách Sinh viên</h2>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <Input 
          placeholder="Tìm sinh viên theo MSSV hoặc tên..." 
          prefix={<SearchOutlined />} 
          style={{ width: 350 }} 
          onChange={e => setSearchText(e.target.value)}
          allowClear
        />
        <Button type="primary" icon={<UserAddOutlined />} onClick={() => showModal()}>Thêm sinh viên mới</Button>
      </div>

      <Table 
        dataSource={filteredUsers} 
        columns={columns} 
        rowKey="id" 
        pagination={{ pageSize: 8 }} 
      />

      <Modal 
        title={editingUser ? "Sửa thông tin sinh viên" : "Thêm sinh viên mới"} 
        open={isModalVisible} 
        onOk={handleOk} 
        onCancel={() => setIsModalVisible(false)}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="mssv" label="MSSV" rules={[{ required: true }]}><Input disabled={!!editingUser}/></Form.Item>
          <Form.Item name="name" label="Họ tên" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="telegramId" label="Số điện thoại / Telegram ID"><Input /></Form.Item>
          
          <Form.Item name="role" hidden initialValue="STUDENT">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UserManagement;