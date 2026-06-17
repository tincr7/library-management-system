import React, { useEffect, useState, useMemo } from 'react';
import { Row, Col, Card, Input, Select, Tag, Button, Typography, Badge, message, Space, Divider, Modal, Upload, Pagination, Spin } from 'antd';
import { SearchOutlined, BookOutlined, UserOutlined, ShoppingCartOutlined, CalendarOutlined, ArrowLeftOutlined, CameraOutlined, ReloadOutlined, StarOutlined } from '@ant-design/icons';
import axiosClient from '../api/axiosClient';

const { Title, Text, Paragraph } = Typography;

const BookSearch = ({ initialBookId, onClearInitialId })=> {
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [btnLoading, setBtnLoading] = useState(false);
  
  // State quản lý bộ lọc
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // State quản lý xem chi tiết sách (Nếu null thì ở danh sách, nếu có data thì sang trang chi tiết)
  const [selectedBook, setSelectedBook] = useState(null);

  // State quản lý phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // State quản lý sách gợi ý
  const [recommendedBooks, setRecommendedBooks] = useState([]);
  const [recommendationLoading, setRecommendationLoading] = useState(false);

  useEffect(() => {
    fetchBooksAndCategories();
    fetchRecommendations();
  }, []);
  useEffect(() => {
    const handleAutoOpenBookDetail = async () => {
      if (!initialBookId) return;

      console.log(`📡 [Book Component] Bắt được tín hiệu xem sách ID: ${initialBookId} từ AI`);
      setLoading(true);

      try {
        // Cách 1: Ưu tiên tìm nhanh trong mảng sách hiện tại nếu đã load xong để đỡ tốn 1 lượt gọi API
        const existBook = books.find(b => b.id === Number(initialBookId));
        
        if (existBook) {
          setSelectedBook(existBook); // Nhảy thẳng sang giao diện trang chi tiết
        } else {
          // Cách 2: Nếu chưa load kịp hoặc sách nằm ở trang khác, gọi thẳng API lấy chi tiết của cuốn đó
          // Tín kiểm tra lại Endpoint chi tiết sách thực tế của dự án bạn (ví dụ: /books/:id hoặc /books/detail/:id)
          const res = await axiosClient.get(`/books/${initialBookId}`);
          if (res.data) {
            setSelectedBook(res.data);
          }
        }
      } catch (error) {
        console.error("❌ Không thể lấy chi tiết cuốn sách từ ID của AI:", error.message);
      } finally {
        setLoading(false);
        // 🔥 QUAN TRỌNG: Gọi hàm xóa ID tạm thời ở file cha để tránh việc đổi tab bị nhảy lại vào đây
        if (typeof onClearInitialId === 'function') {
          onClearInitialId();
        }
      }
    };

    handleAutoOpenBookDetail();
  }, [initialBookId, books]);

  // 1. Tải dữ liệu Sách và Danh mục từ API hệ thống
  const fetchBooksAndCategories = async () => {
    setLoading(true);
    try {
      const [booksRes, catsRes] = await Promise.all([
        axiosClient.get('/books'),       // API lấy tất cả sách
        axiosClient.get('/categories')   // API lấy tất cả danh mục sách
      ]);
      setBooks(booksRes.data || []);
      setCategories(catsRes.data || []);
      setCurrentPage(1); // Reset lại trang 1 khi tải lại dữ liệu
    } catch (err) {
      message.error('Không thể tải danh sách tài liệu từ thư viện!');
    } finally {
      setLoading(false);
    }
  };

  // Tải dữ liệu sách gợi ý (Recommendations)
  const fetchRecommendations = async () => {
    const currentUser = JSON.parse(sessionStorage.getItem('user') || '{}');
    if (!currentUser.id) return;

    setRecommendationLoading(true);
    try {
      const res = await axiosClient.get(`/recommendations/user/${currentUser.id}`);
      if (res.data && res.data.success && res.data.books) {
        setRecommendedBooks(res.data.books);
      }
    } catch (err) {
      console.error('Không thể tải gợi ý sách:', err);
    } finally {
      setRecommendationLoading(false);
    }
  };

  // 2. Hàm xử lý Mượn Online (Gửi lệnh tạo BorrowLog PENDING)
  const handleBorrowOnline = async (bookId) => {
    setBtnLoading(true);
    try {
      // 🌟 BƯỚC 1: Lấy thông tin user đăng nhập từ sessionStorage ra
      const currentUser = JSON.parse(sessionStorage.getItem('user') || '{}');
      
      if (!currentUser.id) {
        message.error('Phiên đăng nhập hết hạn, vui lòng đăng nhập lại!');
        return;
      }

      // 🌟 BƯỚC 2: Gửi kèm cả userId và bookId lên Backend giống hệt Postman
      await axiosClient.post('/borrow-logs', { 
        userId: currentUser.id,
        bookId: bookId 
      }); 
      
      message.success('Đăng ký mượn online thành công! Vui lòng đợi thủ thư duyệt đơn.');
      fetchBooksAndCategories();
      
      if (selectedBook) {
        setSelectedBook(prev => ({ ...prev, availableStock: prev.availableStock - 1 }));
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'Yêu cầu mượn sách thất bại!');
    } finally {
      setBtnLoading(false);
    }
  };

  // 3. Hàm xử lý Đặt trước sách khi hết hàng (Gửi lệnh tạo Reservation PENDING)
  const handleReserveBook = async (bookId) => {
    setBtnLoading(true);
    try {
      // 🌟 BƯỚC 1: Lấy thông tin user đăng nhập từ sessionStorage ra
      const currentUser = JSON.parse(sessionStorage.getItem('user') || '{}');
      
      if (!currentUser.id) {
        message.error('Phiên đăng nhập hết hạn, vui lòng đăng nhập lại!');
        return;
      }

      // 🌟 BƯỚC 2: Gửi kèm cả userId và bookId lên cho API đặt trước
      await axiosClient.post('/reservations', { 
        userId: currentUser.id, // 👈 Thêm dòng này
        bookId: bookId 
      });
      
      message.success('Đã xếp hàng đặt trước sách thành công! Hệ thống sẽ thông báo khi sách về kệ.');
      fetchBooksAndCategories();
    } catch (err) {
      message.error(err.response?.data?.message || 'Đặt trước tài liệu thất bại!');
    } finally {
      setBtnLoading(false);
    }
  };

  // 4. Hàm xử lý tìm kiếm bằng hình ảnh (Gửi file ảnh lên AI Service)
  const handleImageSearch = async (file) => {
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    // 🔥 THÊM ĐOẠN NÀY: Bốc userId từ sessionStorage và đính kèm vào FormData gửi đi
    const currentUser = JSON.parse(sessionStorage.getItem('user') || '{}');
    if (currentUser.id) {
      formData.append('userId', currentUser.id);
    }

    try {
      // Đổi endpoint thành '/ai/predict-book' chuẩn theo file cấu hình của bạn
      const res = await axiosClient.post('/ai/predict-book', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      // Fix: Dữ liệu Backend trả về nằm trong trường `books`
      if (res.data && res.data.success && res.data.books && res.data.books.length > 0) {
        setBooks(res.data.books); // Ghi đè danh sách kết quả trả về từ AI
        setCurrentPage(1); // Chuyển về trang 1 để xem kết quả
        message.success('Đã tìm thấy sách tương tự từ hình ảnh!');
      } else {
        message.warning('Không nhận diện được sách nào từ hình ảnh này!');
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'Lỗi khi tìm kiếm bằng hình ảnh!');
    } finally {
      setLoading(false);
    }
  };

  // Lọc dữ liệu tìm kiếm tổ hợp phía Frontend
  const filteredBooks = useMemo(() => {
    return books.filter(book => {
      const matchesSearch = 
        book.title?.toLowerCase().includes(searchText.toLowerCase()) ||
        book.author?.toLowerCase().includes(searchText.toLowerCase()) ||
        book.isbn?.includes(searchText);
      const matchesCategory = selectedCategory === 'ALL' || book.categoryId === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [books, searchText, selectedCategory]);

  // Cắt dữ liệu hiển thị theo trang hiện tại
  const paginatedBooks = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredBooks.slice(startIndex, startIndex + pageSize);
  }, [filteredBooks, currentPage]);

  // ==================== GIAO DIỆN 1: CHI TIẾT SÁCH (COMMERCE STYLE) ====================
  if (selectedBook) {
    const isAvailable = selectedBook.availableStock > 0;
    return (
      <div style={{ padding: '10px' }}>
        {/* Nút quay lại danh mục */}
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => setSelectedBook(null)} style={{ marginBottom: 20, fontSize: '15px' }}>
          Quay lại danh sách sách
        </Button>

        <Row gutter={[40, 24]} style={{ background: '#fff', padding: '20px 0' }}>
          {/* Cột trái: Ảnh bìa sách phóng to */}
          <Col xs={24} md={9} lg={8} style={{ textAlign: 'center' }}>
            <div style={{ padding: '15px', border: '1px solid #f0f0f0', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', background: '#fafafa' }}>
              <img 
                src={selectedBook.coverImage || "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?q=80&w=500"} 
                alt={selectedBook.title}
                style={{ width: '100%', maxHeight: '420px', objectFit: 'contain', borderRadius: '8px' }}
              />
            </div>
          </Col>

          {/* Cột phải: Thông tin chi tiết thương mại & Nút hành động */}
          <Col xs={24} md={15} lg={16}>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div>
                <Tag color="blue" style={{ marginBottom: 8, fontWeight: 'bold' }}>{selectedBook.category?.name || 'Tài liệu chung'}</Tag>
                <Title level={2} style={{ margin: '0 0 10px 0', fontSize: '28px', color: '#1a1a1a' }}>{selectedBook.title}</Title>
                <Text type="secondary" style={{ fontSize: '15px' }}><UserOutlined /> Tác giả: <b>{selectedBook.author || 'Chưa cập nhật'}</b> | ISBN: {selectedBook.isbn || 'N/A'}</Text>
              </div>

              <Divider style={{ margin: '10px 0' }} />

              {/* Khối hiển thị Kho hàng / Trạng thái trên kệ */}
              <div style={{ background: '#f5f7fa', padding: '20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '40px' }}>
                <div>
                  <div style={{ fontSize: '13px', color: '#8c8c8c' }}>Trạng thái tài liệu</div>
                  <div style={{ marginTop: 4 }}>
                    {isAvailable ? <Tag color="green" style={{fontWeight:'bold'}}>CÒN SÁCH TRÊN KỆ</Tag> : <Tag color="red" style={{fontWeight:'bold'}}>HẾT SÁCH TẠM THỜI</Tag>}
                  </div>
                </div>
                <Divider type="vertical" style={{ height: '40px', background: '#d9d9d9' }} />
                <div>
                  <div style={{ fontSize: '13px', color: '#8c8c8c' }}>Số lượng sẵn có</div>
                  <div style={{ fontSize: '22px', fontWeight: 'bold', color: isAvailable ? '#52c41a' : '#f5222d', marginTop: 2 }}>
                    {selectedBook.availableStock} <span style={{ fontSize: '14px', fontWeights: 400, color: '#8c8c8c' }}>/ {selectedBook.totalStock} cuốn</span>
                  </div>
                </div>
              </div>

              {/* Nút hành động Mượn hoặc Đặt trước */}
              <div style={{ marginTop: 15 }}>
                {isAvailable ? (
                  <Button 
                    type="primary" 
                    icon={<ShoppingCartOutlined />} 
                    size="large"
                    loading={btnLoading}
                    onClick={() => handleBorrowOnline(selectedBook.id)}
                    style={{ height: '50px', padding: '0 40px', borderRadius: '8px', fontWeight: 600, fontSize: '16px', background: '#1d4ed8', boxShadow: '0 4px 14px rgba(29, 78, 216, 0.3)' }}
                  >
                    Đăng Ký Mượn Online ngay
                  </Button>
                ) : (
                  <Button 
                    type="primary" 
                    danger
                    icon={<CalendarOutlined />} 
                    size="large"
                    loading={btnLoading}
                    onClick={() => handleReserveBook(selectedBook.id)}
                    style={{ height: '50px', padding: '0 40px', borderRadius: '8px', fontWeight: 600, fontSize: '16px', background: '#7c3aed', borderColor: '#7c3aed', boxShadow: '0 4px 14px rgba(124, 58, 237, 0.3)' }}
                  >
                    Xếp hàng đặt trước sách
                  </Button>
                )}
              </div>

              <Divider style={{ margin: '15px 0' }} />

              <div>
                <Title level={4} style={{ fontSize: '16px', marginBottom: 10 }}>Tóm tắt / Mô tả nội dung:</Title>
                <Paragraph style={{ color: '#434343', fontSize: '15px', lineHeight: '1.7', textAlign: 'justify' }}>
                  {selectedBook.description || 'Chưa có bài viết tóm tắt chi tiết cho đầu sách này. Vui lòng liên hệ quầy hỗ trợ thư viện để biết thêm thông tin cụ thể.'}
                </Paragraph>
              </div>
            </Space>
          </Col>
        </Row>
      </div>
    );
  }

  // ==================== GIAO DIỆN 2: THƯƠNG MẠI ĐIỆN TỬ - GRID DANH SÁCH SÁCH ====================
  return (
    <div style={{ width: '100%' }}>
      <div style={{ marginBottom: 25 }}>
        <Title level={3} style={{ margin: 0, fontWeight: 'bold' }}><BookOutlined /> Trung Tâm Khám Phá Sách & Tài Liệu</Title>
        <Text type="secondary">Tìm kiếm, đăng ký giữ chỗ và mượn tài liệu trực tuyến tiện lợi.</Text>
      </div>

      {/* Thanh bộ lọc tìm kiếm & Danh mục */}
      <div style={{ marginBottom: 24, display: 'flex', gap: '15px', flexWrap: 'wrap', background: '#f8fafc', padding: '15px', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
        <Input
          placeholder="Tìm tên sách, tên tác giả, mã ISBN..."
          prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
          style={{ width: 350, borderRadius: '6px' }}
          allowClear
          onChange={(e) => {
            setSearchText(e.target.value);
            setCurrentPage(1); // Đưa về trang 1 khi tìm kiếm
          }}
        />
        <Upload
          accept="image/*"
          showUploadList={false}
          beforeUpload={(file) => {
            handleImageSearch(file);
            return false; // Ngăn chặn hành vi upload tự động của antd
          }}
        >
          <Button icon={<CameraOutlined />} loading={loading} style={{ borderRadius: '6px' }}>
            Tìm bằng ảnh
          </Button>
        </Upload>
        <Button icon={<ReloadOutlined />} onClick={() => {
          fetchBooksAndCategories();
          fetchRecommendations();
        }} style={{ borderRadius: '6px' }}>
          Tải lại
        </Button>
        <Select
          defaultValue="ALL"
          style={{ width: 200, marginLeft: 'auto' }}
          onChange={(value) => {
            setSelectedCategory(value);
            setCurrentPage(1); // Đưa về trang 1 khi lọc
          }}
          options={[
            { value: 'ALL', label: '📂 Tất cả danh mục' },
            ...categories.map(c => ({ value: c.id, label: `📁 ${c.name}` }))
          ]}
        />
      </div>

      {/* Phần Gợi ý cho bạn */}
      {!searchText && selectedCategory === 'ALL' && recommendedBooks.length > 0 && (
        <div style={{ marginBottom: 30 }}>
          <Title level={4} style={{ marginBottom: 16, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <StarOutlined /> Gợi Ý Dành Riêng Cho Bạn
          </Title>
          <Spin spinning={recommendationLoading}>
            <div style={{ 
              display: 'flex', 
              flexWrap: 'nowrap', 
              overflowX: 'auto', 
              gap: '20px', 
              paddingBottom: '15px',
              scrollSnapType: 'x mandatory'
            }}>
              {recommendedBooks.map((book) => {
                const hasStock = book.availableStock > 0;
                return (
                  <div key={`rec-${book.id}`} style={{ flex: '0 0 auto', width: '260px', scrollSnapAlign: 'start' }}>
                    <Card
                      hoverable
                      style={{ borderRadius: '10px', overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column', border: '1px solid #fde68a', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.1)' }}
                      bodyStyle={{ padding: '12px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
                      cover={
                        <div style={{ height: '220px', background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px', position: 'relative' }} onClick={() => setSelectedBook(book)}>
                          <img
                            alt={book.title}
                            src={book.coverImage || "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?q=80&w=500"}
                            style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain', borderRadius: '4px' }}
                          />
                          <div style={{ position: 'absolute', top: 10, right: 10 }}>
                            <Tag color={hasStock ? 'green' : 'red'} style={{ fontWeight: 'bold', margin: 0, borderRadius: '4px' }}>
                              {hasStock ? `Sẵn có: ${book.availableStock}` : 'Hết sách'}
                            </Tag>
                          </div>
                        </div>
                      }
                    >
                      <div onClick={() => setSelectedBook(book)} style={{ cursor: 'pointer' }}>
                        <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>
                          {book.category?.name || 'Tài liệu'}
                        </div>
                        <Title level={5} style={{ margin: '0 0 6px 0', fontSize: '15px', height: '44px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: '1.4' }}>
                          {book.title}
                        </Title>
                        <Text type="secondary" style={{ fontSize: '12px', display: 'block', height: '20px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          ✍️ {book.author || 'Nhiều tác giả'}
                        </Text>
                      </div>
                      <Divider style={{ margin: '10px 0' }} />
                      <div>
                        {hasStock ? (
                          <Button 
                            type="primary" 
                            block 
                            size="middle"
                            icon={<ShoppingCartOutlined />}
                            onClick={() => handleBorrowOnline(book.id)}
                            style={{ borderRadius: '6px', fontSize: '13px', fontWeight: 600, background: '#f59e0b', borderColor: '#f59e0b' }}
                          >
                            Mượn Sách
                          </Button>
                        ) : (
                          <Button 
                            type="primary" 
                            danger
                            block 
                            size="middle"
                            icon={<CalendarOutlined />}
                            onClick={() => handleReserveBook(book.id)}
                            style={{ borderRadius: '6px', fontSize: '13px', fontWeight: 600, background: '#7c3aed', borderColor: '#7c3aed' }}
                          >
                            Đặt Trước
                          </Button>
                        )}
                      </div>
                    </Card>
                  </div>
                );
              })}
            </div>
          </Spin>
          <Divider style={{ marginTop: 30 }} />
        </div>
      )}

      {/* Lưới sản phẩm (E-commerce Cards Grid) */}
      <Row gutter={[20, 20]} loading={loading}>
        {paginatedBooks.map((book) => {
          const hasStock = book.availableStock > 0;
          return (
            <Col xs={24} sm={12} md={8} lg={6} key={book.id}>
              {/* Thẻ Card sản phẩm thương mại */}
              <Card
                hoverable
                style={{ borderRadius: '10px', overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column', border: '1px solid #e2e8f0' }}
                bodyStyle={{ padding: '12px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
                cover={
                  <div style={{ height: '220px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px', position: 'relative' }} onClick={() => setSelectedBook(book)}>
                    <img
                      alt={book.title}
                      src={book.coverImage || "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?q=80&w=500"}
                      style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain', borderRadius: '4px' }}
                    />
                    {/* Badge trạng thái nổi lên trên ảnh bìa sách */}
                    <div style={{ position: 'absolute', top: 10, right: 10 }}>
                      <Tag color={hasStock ? 'green' : 'red'} style={{ fontWeight: 'bold', margin: 0, borderRadius: '4px' }}>
                        {hasStock ? `Sẵn có: ${book.availableStock}` : 'Hết sách'}
                      </Tag>
                    </div>
                  </div>
                }
              >
                {/* Phần thông tin chữ của thẻ */}
                <div onClick={() => setSelectedBook(book)} style={{ cursor: 'pointer' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>
                    {book.category?.name || 'Tài liệu'}
                  </div>
                  <Title level={5} style={{ margin: '0 0 6px 0', fontSize: '15px', height: '44px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: '1.4' }}>
                    {book.title}
                  </Title>
                  <Text type="secondary" style={{ fontSize: '12px', display: 'block', height: '20px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    ✍️ {book.author || 'Nhiều tác giả'}
                  </Text>
                </div>

                <Divider style={{ margin: '10px 0' }} />

                {/* Khối nút bấm nhanh dưới đáy Card */}
                <div>
                  {hasStock ? (
                    <Button 
                      type="primary" 
                      block 
                      size="middle"
                      icon={<ShoppingCartOutlined />}
                      onClick={() => handleBorrowOnline(book.id)}
                      style={{ borderRadius: '6px', fontSize: '13px', fontWeight: 600, background: '#2563eb' }}
                    >
                      Mượn Sách
                    </Button>
                  ) : (
                    <Button 
                      type="primary" 
                      danger
                      block 
                      size="middle"
                      icon={<CalendarOutlined />}
                      onClick={() => handleReserveBook(book.id)}
                      style={{ borderRadius: '6px', fontSize: '13px', fontWeight: 600, background: '#7c3aed', borderColor: '#7c3aed' }}
                    >
                      Đặt Trước
                    </Button>
                  )}
                </div>
              </Card>
            </Col>
          );
        })}
      </Row>

      {/* Thanh Phân Trang */}
      {filteredBooks.length > 0 && (
        <div style={{ marginTop: 30, display: 'flex', justifyContent: 'center' }}>
          <Pagination
            current={currentPage}
            pageSize={pageSize}
            total={filteredBooks.length}
            onChange={(page) => setCurrentPage(page)}
            showSizeChanger={false}
          />
        </div>
      )}
    </div>
  );
};

export default BookSearch;