import React, { useState, useEffect, useRef } from 'react';
import { Layout, Typography, Avatar, Space, Input, Button, List, Spin, Card, Row, Col, Tooltip, ConfigProvider } from 'antd';
import { 
  DashboardOutlined, 
  SearchOutlined, 
  SyncOutlined, 
  HistoryOutlined,
  AlertOutlined,
  UserOutlined,
  LogoutOutlined,
  RobotOutlined,
  SendOutlined,
  CloseOutlined
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'motion/react';

// Import axiosClient để gọi API /chat
import axiosClient from '../api/axiosClient';

// Import các component nghiệp vụ
import BookSearch from './Book'; 
import RenewHistory from './RenewHistory';
import ViolationHistory from './ViolationHistory';
import StudentProfile from './StudentProfile';
import StudentDashboard from './StudentDashboard';

const { Content } = Layout;
const { Text } = Typography;

// --- DESIGN TOKENS ---
const TOKENS = {
  bg: '#FBFBFA',
  surface: '#FFFFFF',
  text: '#111111',
  muted: '#787774',
  accent: '#1F6C9F',
  border: '#EAEAEA',
  sidebar: '#111111',
  radius: '12px'
};

const Home = () => {
  const [selectedKey, setSelectedKey] = useState('1');
  const [user, setUser] = useState(null);
  const [selectedBookId, setSelectedBookId] = useState(null);

  // --- STATE CHO TRỢ LÝ AI ---
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { text: "Xin chào! Tôi là Trợ lý AI Thư viện. Tôi có thể giúp gì cho bạn?", sender: "bot" }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isChatOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, isChatOpen]);

  useEffect(() => {
    const storedUser = sessionStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

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
        <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', fontSize: '13px' }}>{cleanText}</div>
        {books.length > 0 && (
          <div style={{ marginTop: '12px' }}>
            <Row gutter={[12, 12]}>
              {books.map((book) => (
                <Col span={12} key={book.id}>
                  <Card
                    hoverable
                    bordered={false}
                    bodyStyle={{ padding: '8px', textAlign: 'center' }}
                    style={{ background: TOKENS.bg, border: `1px solid ${TOKENS.border}` }}
                    cover={
                      <div style={{ display: 'flex', justifyContent: 'center', padding: '12px' }}>
                        <img 
                          alt={book.title} 
                          src={book.coverImage} 
                          style={{ height: '120px', width: '85px', objectFit: 'cover', borderRadius: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                        />
                      </div>
                    }
                    onClick={() => {
                      setSelectedBookId(book.id);
                      setSelectedKey('2');
                      setIsChatOpen(false);
                    }}
                  >
                    <Text strong style={{ fontSize: '12px', display: 'block' }} ellipsis={{ tooltip: book.title }}>
                      {book.title}
                    </Text>
                  </Card>
                </Col>
              ))}
            </Row>
          </div>
        )}
      </Space>
    );
  };

  const NAV_ITEMS = [
    { key: '1', label: 'Dashboard', icon: <DashboardOutlined /> },
    { key: '2', label: 'Discovery', icon: <SearchOutlined /> },
    { key: '3', label: 'Renewals', icon: <SyncOutlined /> },
    { key: '4', label: 'History', icon: <HistoryOutlined /> },
    { key: '5', label: 'Alerts', icon: <AlertOutlined /> },
    { key: '6', label: 'Profile', icon: <UserOutlined /> },
  ];

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: TOKENS.accent,
          borderRadius: 8,
          fontFamily: "'Geist Sans', -apple-system, sans-serif",
          colorText: TOKENS.text,
        },
        components: {
          Button: {
            borderRadius: 6,
            fontWeight: 500,
          },
        }
      }}
    >
      <Layout style={{ minHeight: '100dvh', background: TOKENS.bg, flexDirection: 'row', overflow: 'hidden' }}>
        
        {/* --- CUSTOM NAVIGATION RAIL --- */}
        <motion.div 
          initial={{ x: -80 }}
          animate={{ x: 0 }}
          style={{
            width: '72px',
            background: TOKENS.sidebar,
            height: '100vh',
            position: 'sticky',
            top: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '32px 0',
            zIndex: 100,
            borderRight: '1px solid rgba(255,255,255,0.05)'
          }}
        >
          <div style={{ marginBottom: '48px' }}>
            <Avatar 
              size={40} 
              icon={<UserOutlined />} 
              src={user?.avatar}
              style={{ background: TOKENS.accent, border: '2px solid rgba(255,255,255,0.1)' }}
            />
          </div>

          <Space direction="vertical" size={20} style={{ flex: 1 }}>
            {NAV_ITEMS.map(item => (
              <Tooltip key={item.key} title={item.label} placement="right">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedKey(item.key)}
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    cursor: 'pointer',
                    background: selectedKey === item.key ? TOKENS.accent : 'transparent',
                    color: selectedKey === item.key ? '#FFFFFF' : 'rgba(255,255,255,0.45)',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                  }}
                >
                  {React.cloneElement(item.icon, { style: { fontSize: '18px' } })}
                </motion.div>
              </Tooltip>
            ))}
          </Space>

          <Tooltip title="Đăng xuất" placement="right">
            <motion.div
              whileHover={{ color: '#ff4d4f', scale: 1.1 }}
              onClick={handleLogout}
              style={{ color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '18px' }}
            >
              <LogoutOutlined />
            </motion.div>
          </Tooltip>
        </motion.div>

        {/* --- MAIN CONTENT --- */}
        <Layout style={{ background: 'transparent', flex: 1, position: 'relative', minWidth: 0 }}>
          <Content style={{ 
            height: '100vh', 
            overflowY: 'auto', 
            overflowX: 'hidden',
            padding: '32px',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedKey}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  background: TOKENS.surface,
                  borderRadius: TOKENS.radius,
                  minHeight: '100%',
                  padding: '40px',
                  border: `1px solid ${TOKENS.border}`,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  boxSizing: 'border-box',
                  width: '100%',
                  overflowX: 'hidden'
                }}
              >
                {renderContent()}
              </motion.div>
            </AnimatePresence>
          </Content>
        </Layout>

        {/* --- INTEGRATED AI ASSISTANT PANEL --- */}
        <AnimatePresence>
          {isChatOpen && (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              style={{
                width: '380px',
                background: TOKENS.surface,
                borderLeft: `1px solid ${TOKENS.border}`,
                height: '100vh',
                position: 'fixed',
                right: 0,
                top: 0,
                zIndex: 200,
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '-12px 0 32px rgba(0,0,0,0.04)'
              }}
            >
              <div style={{ padding: '24px', borderBottom: `1px solid ${TOKENS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Space>
                  <RobotOutlined style={{ color: TOKENS.accent, fontSize: '20px' }} />
                  <Text strong style={{ fontSize: '15px', letterSpacing: '-0.01em' }}>Library Assistant</Text>
                </Space>
                <Button type="text" icon={<CloseOutlined style={{ fontSize: '12px' }} />} onClick={() => setIsChatOpen(false)} />
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                <List
                  dataSource={chatMessages}
                  renderItem={(msg) => (
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                      marginBottom: '24px'
                    }}>
                      <div style={{
                        maxWidth: '85%',
                        padding: '12px 14px',
                        borderRadius: '12px',
                        background: msg.sender === 'user' ? TOKENS.accent : TOKENS.bg,
                        color: msg.sender === 'user' ? '#FFFFFF' : TOKENS.text,
                        border: msg.sender === 'user' ? 'none' : `1px solid ${TOKENS.border}`,
                        fontSize: '13px'
                      }}>
                        {msg.sender === 'bot' ? renderMessageContent(msg.text) : msg.text}
                      </div>
                    </div>
                  )}
                />
                {isChatLoading && (
                  <div style={{ display: 'flex', gap: '8px', padding: '0 4px' }}>
                    <Spin size="small" />
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div style={{ padding: '24px', borderTop: `1px solid ${TOKENS.border}` }}>
                <Input
                  placeholder="Ask a question..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onPressEnter={handleSendMessage}
                  suffix={<SendOutlined onClick={handleSendMessage} style={{ cursor: 'pointer', color: isChatLoading ? TOKENS.muted : TOKENS.accent }} />}
                  disabled={isChatLoading}
                  style={{ borderRadius: '8px', padding: '8px 12px', background: TOKENS.bg, border: 'none' }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- FLOATING CONCIERGE TRIGGER --- */}
        {!isChatOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsChatOpen(true)}
            style={{
              position: 'fixed',
              bottom: '32px',
              right: '32px',
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: TOKENS.sidebar,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
              zIndex: 150
            }}
          >
            <RobotOutlined style={{ fontSize: '24px', color: '#FFFFFF' }} />
          </motion.div>
        )}
      </Layout>
    </ConfigProvider>
  );
};

export default Home;