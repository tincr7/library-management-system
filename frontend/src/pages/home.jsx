import React, { useState, useEffect, useRef } from 'react';
import { Layout, Menu, Typography, Avatar, Space, Drawer, Input, Button, List, Spin, Card, Row, Col } from 'antd';
import { 
  DashboardOutlined, 
  SearchOutlined, 
  SyncOutlined, 
  HistoryOutlined,
  AlertOutlined,
  UserOutlined,
  LogoutOutlined,
  RobotOutlined,
  SendOutlined
} from '@ant-design/icons';

// Import axiosClient để gọi API /chat
import axiosClient from '../api/axiosClient';

// Import các component nghiệp vụ của bạn
import BookSearch from './Book'; 
import RenewHistory from './RenewHistory';
import ViolationHistory from './ViolationHistory';
import StudentProfile from './StudentProfile';
import StudentDashboard from './StudentDashboard';

const { Sider, Content } = Layout;
const { Text } = Typography;

const Home = () => {
  const [selectedKey, setSelectedKey] = useState('1');
  const [user, setUser] = useState(null);

  const [selectedBookId, setSelectedBookId] = useState(null);

  // --- STATE & LOGIC CHO TRỢ LÝ AI (CHATBOT) ---
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { text: "Xin chào! Tôi là Trợ lý AI Thư viện Đại học Thủy Lợi. Tôi có thể giúp gì cho bạn?", sender: "bot" }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Tự động cuộn xuống tin nhắn mới nhất
  useEffect(() => {
    if (isChatOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, isChatOpen]);

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;

    const userMessage = { text: chatInput, sender: 'user' };
    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const res = await axiosClient.post('/chat', {
        message: userMessage.text,
        userId: user?.id
      });

      const replyText = res.data?.reply || res.data || "Xin lỗi, hệ thống không thể xử lý câu trả lời.";
      setChatMessages((prev) => [...prev, { text: replyText, sender: 'bot' }]);
    } catch (error) {
      console.error(error);
      setChatMessages((prev) => [...prev, { text: 'Hệ thống AI đang bận hoặc lỗi kết nối. Vui lòng thử lại sau!', sender: 'bot' }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  useEffect(() => {
    const storedUser = sessionStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const renderContent = () => {
    switch (selectedKey) {
      case '1': return <StudentDashboard />;
      case '2': return (
        <BookSearch 
          initialBookId={selectedBookId} 
          onClearInitialId={() => setSelectedBookId(null)} 
        />
      );
      case '3': return <RenewHistory defaultTab="1" key="tab1" />;
      case '4': return <RenewHistory defaultTab="2" key="tab2" />;
      case '5': return <ViolationHistory />;
      case '6': return <StudentProfile />;
      default: return <StudentDashboard />;
    }
  };

  const handleLogout = () => {
    sessionStorage.clear();
    window.location.href = '/login';
  };

  /**
   * 🔥 HÀM PHỤ TRỢ: Bóc tách văn bản và mảng JSON sách từ cấu trúc thẻ <BOOK_DATA>
   */
  const renderMessageContent = (fullText) => {
    const bookDataRegex = /<BOOK_DATA>([\s\S]*?)<\/BOOK_DATA>/;
    const match = fullText.match(bookDataRegex);
    
    let cleanText = fullText.replace(bookDataRegex, '').trim();
    let books = [];

    if (match && match[1]) {
      try {
        books = JSON.parse(match[1].trim());
      } catch (e) {
        console.error("Lỗi parse JSON sách từ AI:", e);
      }
    }

    return (
      <Space direction="vertical" style={{ width: '100%' }} size="small">
        {/* Hiển thị câu trả lời dạng chữ của AI */}
        <div style={{ whiteSpace: 'pre-wrap' }}>{cleanText}</div>

        {/* Render danh sách Card sách - 🔥 ĐÃ NỚI RỘNG max-width thành 100% */}
        {books.length > 0 && (
          <div style={{ marginTop: '12px', width: '100%', maxWidth: '380px' }}>
            <Row gutter={[12, 12]}>
              {books.map((book) => (
                <Col span={12} key={book.id}>
                  <Card
                    hoverable
                    bodyStyle={{ padding: '8px', textAlign: 'center' }}
                    cover={
                      <div style={{ backgroundColor: '#f5f5f5', borderRadius: '4px 4px 0 0', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '8px 0' }}>
                        <img 
                          alt={book.title} 
                          src={book.coverImage} 
                          style={{ height: '150px', width: '110px', objectFit: 'cover', boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }}
                        />
                      </div>
                    }
                    // 🔥 CẬP NHẬT: Khi click, vừa đổi tab vừa nạp thẳng ID sách vào State cha
                    onClick={() => {
                      setSelectedBookId(book.id); // Lưu ID cuốn sách được chọn
                      setSelectedKey('2');        // Nhảy sang menu Tìm Sách
                      setIsChatOpen(false);       // Đóng drawer chat
                    }}
                  >
                    <Card.Meta 
                      title={
                        <Text strong style={{ fontSize: '13px', display: 'block', marginTop: '4px' }} ellipsis={{ tooltip: book.title }}>
                          {book.title}
                        </Text>
                      } 
                      description={
                        <Text type="secondary" style={{ fontSize: '11px' }} ellipsis>
                          {book.author}
                        </Text>
                      }
                    />
                  </Card>
                </Col>
              ))}
            </Row>
          </div>
        )}
      </Space>
    );
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider 
        collapsible 
        theme="light"
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'sticky',
          top: 0,
          left: 0,
          boxShadow: '2px 0 8px rgba(0,0,0,0.05)'
        }}
      >
        <div style={{ padding: '24px', textAlign: 'center', borderBottom: '1px solid #f0f0f0' }}>
          <Avatar size={54} icon={<UserOutlined />} style={{ backgroundColor: '#1890ff', marginBottom: '8px' }} />
          <div style={{ marginTop: '4px' }}>
              <Text strong style={{ display: 'block' }}>{user?.name || 'Sinh viên'}</Text>
              <Text type="secondary" style={{ fontSize: '12px' }}>MSSV: {user?.mssv}</Text>
          </div>
        </div>
        
        <Menu 
          mode="inline" 
          defaultSelectedKeys={['1']}
          selectedKeys={[selectedKey]}
          onClick={(e) => e.key !== 'logout' && setSelectedKey(e.key)}
          style={{ borderRight: 0, marginTop: '16px' }}
        >
          <Menu.Item key="1" icon={<DashboardOutlined />}>Tổng quan</Menu.Item>
          <Menu.Item key="2" icon={<SearchOutlined />}>Tìm sách</Menu.Item>
          <Menu.Item key="3" icon={<SyncOutlined />}>Gia hạn sách</Menu.Item>
          <Menu.Item key="4" icon={<HistoryOutlined />}>Lịch sử gia hạn</Menu.Item>
          <Menu.Item key="5" icon={<AlertOutlined />}>Lịch sử phạt</Menu.Item>
          <Menu.Item key="6" icon={<UserOutlined />}>Thông tin</Menu.Item>
          <Menu.Divider />
          <Menu.Item key="logout" icon={<LogoutOutlined />} onClick={handleLogout} danger>
            Đăng xuất
          </Menu.Item>
        </Menu>
      </Sider>
      
      <Layout style={{ background: '#f5f7f9' }}>
        <Content style={{ margin: '24px' }}>
          <div style={{ padding: 24, background: '#fff', borderRadius: '12px', minHeight: 'calc(100vh - 112px)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            {renderContent()}
          </div>
        </Content>
      </Layout>

      {/* NÚT BONG BÓNG CHAT FLOATING GÓC DƯỚI */}
      <div 
        onClick={() => setIsChatOpen(true)}
        style={{
          position: 'fixed',
          bottom: '40px',
          right: '40px',
          backgroundColor: '#1890ff',
          color: 'white',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          boxShadow: '0 4px 12px rgba(24,144,255,0.4)',
          cursor: 'pointer',
          zIndex: 1000,
          transition: 'transform 0.3s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        <RobotOutlined style={{ fontSize: '28px' }} />
      </div>

      {/* CỬA SỔ CHATBOT (DRAWER) */}
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <RobotOutlined style={{ color: '#1890ff', fontSize: '24px' }} />
            <Text strong>Trợ lý AI Thư Viện</Text>
          </div>
        }
        placement="right"
        onClose={() => setIsChatOpen(false)}
        open={isChatOpen}
        width={480} // Tăng nhẹ kích thước lên 480px để Card hiển thị hàng đôi cân đối
        bodyStyle={{ display: 'flex', flexDirection: 'column', padding: '10px 20px' }}
      >
        <div style={{ flex: 1, overflowY: 'auto', marginBottom: '16px', paddingRight: '5px' }}>
          <List
            dataSource={chatMessages}
            renderItem={(msg) => (
              <List.Item style={{ borderBottom: 'none', justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start', padding: '8px 0' }}>
                <Space align="start" style={{ maxWidth: '90%', flexDirection: msg.sender === 'user' ? 'row-reverse' : 'row' }}>
                  <Avatar 
                    icon={msg.sender === 'user' ? <UserOutlined /> : <RobotOutlined />} 
                    style={{ backgroundColor: msg.sender === 'user' ? '#52c41a' : '#1890ff', marginTop: '4px' }}
                  />
                  <div style={{
                    backgroundColor: msg.sender === 'user' ? '#e6f7ff' : '#f0f2f5',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    wordBreak: 'break-word',
                    border: msg.sender === 'user' ? '1px solid #91d5ff' : '1px solid #d9d9d9'
                  }}>
                    {/* 🔥 THAY ĐỔI: Chuyển sang gọi hàm bóc tách dữ liệu động */}
                    {msg.sender === 'bot' ? renderMessageContent(msg.text) : msg.text}
                  </div>
                </Space>
              </List.Item>
            )}
          />
          {isChatLoading && (
             <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0' }}>
               <Avatar icon={<RobotOutlined />} style={{ backgroundColor: '#1890ff' }} />
               <Spin size="small" />
             </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <Input
            placeholder="Hỏi tôi về quy định, mượn sách, nộp phạt..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onPressEnter={handleSendMessage}
            disabled={isChatLoading}
          />
          <Button type="primary" icon={<SendOutlined />} onClick={handleSendMessage} loading={isChatLoading}>
            Gửi
          </Button>
        </div>
      </Drawer>
    </Layout>
  );
};

export default Home;