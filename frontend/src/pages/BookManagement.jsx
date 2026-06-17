import React, { useEffect, useState, useMemo } from 'react';
import { Table, Button, Space, Modal, Form, Input, InputNumber, message, Popconfirm, Image, Tag, Upload, Select, Divider } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined, SearchOutlined } from '@ant-design/icons';
import axiosClient from '../api/axiosClient';
import axios from 'axios';

const BookManagement = () => {
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]); 
  const [searchText, setSearchText] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [form] = Form.useForm();
  const [rawImageFile, setRawImageFile] = useState(null);

  // Các state phục vụ tính năng thêm nhanh thể loại
  const [newCategoryName, setNewCategoryName] = useState('');
  const [addingCategory, setAddingCategory] = useState(false);

  const CLOUD_NAME = "dbupojkeb";
  const UPLOAD_PRESET = "ml_default";

  useEffect(() => {
    fetchBooks();
    fetchCategories();
  }, []);

  const fetchBooks = async () => {
    try {
      const res = await axiosClient.get('/books');
      setBooks(res.data);
    } catch (err) { message.error('Không thể tải danh sách sách!'); }
  };

  const fetchCategories = async () => {
    try {
      const res = await axiosClient.get('/categories');
      setCategories(res.data);
    } catch (err) { console.error('Lỗi tải danh mục thể loại:', err); }
  };

  // Hàm xử lý gọi API thêm nhanh Thể loại mới vào DB
  const handleAddCategoryQuickly = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) {
      return message.warning('Vui lòng nhập tên thể loại mới!');
    }
    
    setAddingCategory(true);
    try {
      // Gọi lên API POST /categories bạn đã viết ở Backend
      const res = await axiosClient.post('/categories', { 
        name: newCategoryName.trim(),
        description: "Thêm nhanh từ quản lý sách" 
      });
      
      message.success(`Đã thêm thể loại: ${res.data.name}`);
      setNewCategoryName(''); // Xóa text ô nhập
      await fetchCategories(); // Tải lại danh sách danh mục mới từ BE
    } catch (err) {
      message.error('Thể loại này đã tồn tại hoặc xảy ra lỗi!');
    } finally {
      setAddingCategory(false);
    }
  };

  const filteredBooks = useMemo(() => {
    return books.filter(book => 
      book.title?.toLowerCase().includes(searchText.toLowerCase()) ||
      book.author?.toLowerCase().includes(searchText.toLowerCase()) ||
      book.category?.name?.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [books, searchText]);

  const showModal = (book = null) => {
    setEditingBook(book);
    if (book) {
      form.setFieldsValue({
        ...book,
        stock: book.totalStock 
      });
    } else {
      form.resetFields();
    }
    setIsModalVisible(true);
  };

  const handleUpload = async ({ file, onSuccess, onError }) => {
    // 🔥 LƯU LẠI FILE THÔ VÀO STATE ĐỂ TÝ NỮA DÙNG ĐỒNG BỘ AI
    setRawImageFile(file); 

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    
    // (Các dòng code đẩy lên Cloudinary phía dưới giữ nguyên nguyên vẹn...)
    setUploading(true);
    try {
      const res = await axios.post(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        formData
      );
      const url = res.data.secure_url;
      form.setFieldsValue({ coverImage: url });
      onSuccess(res.data);
      message.success('Tải ảnh bìa lên thành công!');
    } catch (err) {
      onError(err);
      message.error('Tải ảnh bìa thất bại!');
    } finally {
      setUploading(false);
    }
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      
      // 🔥 CHUYỂN ĐỔI: Khởi tạo FormData để gửi được cả Chữ và File nhị phân thô
      const formDataToSend = new FormData();
      
      // 1. Append tất cả các trường chữ/số từ form vào FormData
      formDataToSend.append('title', values.title);
      formDataToSend.append('author', values.author || '');
      formDataToSend.append('isbn', values.isbn || '');
      formDataToSend.append('description', values.description || '');
      formDataToSend.append('stock', String(values.stock || 1)); // Ép sang chuỗi cho Form-data mượt
      if (values.categoryId) {
        formDataToSend.append('categoryId', String(values.categoryId));
      }
      if (values.coverImage) {
        formDataToSend.append('coverImage', values.coverImage); // Vẫn lưu link Cloudinary cho DB
      }

      // 2. 🔥 MẤU CHỐT: Đính kèm file nhị phân thô với key là 'file' để NestJS bắt được học AI
      if (rawImageFile) {
        formDataToSend.append('file', rawImageFile);
      }

      // 3. Tiến hành gọi API bằng FormData
      if (editingBook) {
        // Đối với hàm PATCH (Sửa), ta dùng formDataToSend
        await axiosClient.patch(`/books/${editingBook.id}`, formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        message.success('Cập nhật thông tin sách thành công!');
      } else {
        // Đối với hàm POST (Thêm mới)
        await axiosClient.post('/books', formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        message.success('Thêm đầu sách mới thành công!');
      }

      // Đóng modal và dọn dẹp sạch sẽ
      setIsModalVisible(false);
      setRawImageFile(null); // Reset lại file thô
      fetchBooks();
    } catch (err) { 
      console.error("Lỗi submit form admin:", err);
      message.error('Thao tác thất bại! Vui lòng kiểm tra lại dữ liệu.'); 
    }
  };

  const handleDelete = async (id) => {
    try {
      await axiosClient.delete(`/books/${id}`);
      message.success('Đã xóa đầu sách!');
      fetchBooks();
    } catch (err) { message.error('Không thể xóa đầu sách đang trong chu trình mượn trả!'); }
  };

  const columns = [
    {
      title: 'Ảnh bìa',
      dataIndex: 'coverImage',
      key: 'coverImage',
      width: 90,
      render: (url) => (
        <Image
          src={url || 'https://via.placeholder.com/50x70?text=No+Cover'}
          alt="cover"
          width={50}
          height={70}
          style={{ borderRadius: '4px', objectFit: 'cover' }}
        />
      ),
    },
    { title: 'Tên sách', dataIndex: 'title', key: 'title', render: (text) => <b>{text}</b> },
    { title: 'Tác giả', dataIndex: 'author', key: 'author' },
    { 
      title: 'Thể loại', 
      dataIndex: 'category', 
      key: 'category',
      render: (category) => <Tag color="blue">{category?.name || 'Chưa phân loại'}</Tag>
    },
    { 
      title: 'Tình trạng kho', 
      key: 'stock_status',
      width: 200,
      render: (_, record) => {
        const isOut = record.availableStock <= 0;
        return (
          <Tag color={isOut ? 'error' : 'green'} style={{ fontWeight: 'bold' }}>
            {isOut ? `Hết sách (0 / ${record.totalStock})` : `Sẵn có: ${record.availableStock} / ${record.totalStock} cuốn`}
          </Tag>
        );
      } 
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 120,
      render: (_, record) => (
        <Space size="middle">
          <Button type="text" icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); showModal(record); }} />
          <Popconfirm title="Xóa đầu sách này khỏi thư viện?" onConfirm={() => handleDelete(record.id)}>
            <Button type="text" danger icon={<DeleteOutlined />} onClick={(e) => e.stopPropagation()} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '15px', background: '#fff', borderRadius: '8px' }}>
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ color: '#000', margin: 0, fontWeight: 'bold' }}>Quản lý kho sách</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => showModal()}>
          Thêm sách mới
        </Button>
      </div>

      <div style={{ marginBottom: 20 }}>
        <Input
          placeholder="Tìm theo tên sách, tác giả hoặc thể loại..."
          prefix={<SearchOutlined />}
          style={{ width: 380 }}
          allowClear
          onChange={(e) => setSearchText(e.target.value)}
        />
      </div>

      <Table
        dataSource={filteredBooks}
        columns={columns}
        rowKey="id"
        pagination={{ pageSize: 7 }}
        expandable={{
          expandedRowRender: (record) => (
            <div style={{ padding: '12px', background: '#fcfcfc', borderRadius: '6px', border: '1px solid #f0f0f0' }}>
              <p style={{ margin: '0 0 8px 0' }}><strong>Mã định danh quốc tế ISBN:</strong> <Tag color="purple">{record.isbn || 'Chưa cập nhật'}</Tag></p>
              <p style={{ margin: 0 }}><strong>Tóm tắt nội dung:</strong></p>
              <p style={{ color: '#666', marginTop: 4, textIndent: '15px', lineHeight: '1.6' }}>{record.description || 'Chưa có mô tả tóm tắt cho đầu sách này.'}</p>
            </div>
          ),
        }}
      />

      <Modal
        title={editingBook ? "Chỉnh sửa đầu sách" : "Thêm sách mới vào hệ thống"}
        open={isModalVisible}
        onOk={handleOk}
        onCancel={() => setIsModalVisible(false)}
        width={600}
        confirmLoading={uploading}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 15 }}>
          <div style={{ display: 'flex', gap: '15px' }}>
            <Form.Item name="title" label="Tên sách" rules={[{ required: true, message: 'Không được để trống tên sách!' }]} style={{ flex: 1 }}>
              <Input placeholder="Nhập tên sách" />
            </Form.Item>
            
            {/* TÍCH HỢP THÊM NHANH THỂ LOẠI NGAY TẠI ĐÂY */}
            <Form.Item name="categoryId" label="Thể loại sách" rules={[{ required: true, message: 'Vui lòng chọn thể loại!' }]} style={{ flex: 1 }}>
              <Select 
                placeholder="Chọn hoặc thêm thể loại"
                options={categories.map(c => ({ value: c.id, label: c.name }))}
                allowClear
                dropdownRender={(menu) => (
                  <>
                    {menu}
                    <Divider style={{ margin: '8px 0' }} />
                    <Space style={{ padding: '0 8px 4px', display: 'flex', justifyContent: 'space-between' }}>
                      <Input
                        placeholder="Thêm thể loại mới..."
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        onKeyDown={(e) => e.stopPropagation()} // Tránh lỗi nút space/enter đóng dropdown
                        style={{ width: 140 }}
                      />
                      <Button 
                        type="text" 
                        type="primary" 
                        size="small"
                        icon={<PlusOutlined />} 
                        loading={addingCategory}
                        onClick={handleAddCategoryQuickly}
                      >
                        Thêm
                      </Button>
                    </Space>
                  </>
                )}
              />
            </Form.Item>
          </div>
          
          <div style={{ display: 'flex', gap: '15px' }}>
            <Form.Item name="author" label="Tác giả" rules={[{ required: true, message: 'Vui lòng nhập tên tác giả!' }]} style={{ flex: 1 }}>
              <Input placeholder="Nhập tên tác giả" />
            </Form.Item>
            <Form.Item name="stock" label="Số lượng nhập kho" rules={[{ required: true, message: 'Nhập số lượng!' }]} style={{ flex: 1 }}>
              <InputNumber min={1} style={{ width: '100%' }} placeholder="Ví dụ: 10" />
            </Form.Item>
          </div>

          <Form.Item name="isbn" label="Mã ISBN (Mã vạch sách)">
            <Input placeholder="Nhập mã vạch quốc tế ISBN nếu có" />
          </Form.Item>

          <Form.Item label="Ảnh bìa sách">
            <Upload customRequest={handleUpload} showUploadList={false} maxCount={1}>
              <Button icon={<UploadOutlined />} loading={uploading}>Chọn tệp ảnh</Button>
            </Upload>
            <Form.Item name="coverImage" noStyle><Input type="hidden" /></Form.Item>
            <Form.Item shouldUpdate noStyle>
              {({ getFieldValue }) => {
                const url = getFieldValue('coverImage');
                return url ? (
                  <div style={{ marginTop: 12 }}>
                    <Image src={url} width={90} height={125} style={{ objectFit: 'cover', borderRadius: 4, border: '1px solid #d9d9d9' }} />
                  </div>
                ) : null;
              }}
            </Form.Item>
          </Form.Item>

          <Form.Item name="description" label="Mô tả tóm tắt nội dung">
            <Input.TextArea rows={4} placeholder="Nhập tóm tắt nội dung cuốn sách..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default BookManagement;