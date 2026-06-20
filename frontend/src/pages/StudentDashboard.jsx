import React, { useEffect, useState } from 'react';
import { Typography, List, Tag, message, Spin, Space, Divider } from 'antd';
import { 
  BookOutlined, 
  WarningOutlined, 
  DollarCircleOutlined, 
  ClockCircleOutlined, 
  CalendarOutlined,
  ArrowRightOutlined
} from '@ant-design/icons';
import { motion } from 'motion/react';
import axiosClient from '../api/axiosClient';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

// --- LOCAL DESIGN TOKENS ---
const TOKENS = {
  bg: '#FBFBFA',
  surface: '#FFFFFF',
  text: '#111111',
  muted: '#787774',
  accent: '#1F6C9F',
  danger: '#D4380D',
  border: '#EAEAEA',
};

const StudentDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    borrowingCount: 0,
    overdueCount: 0,
    unpaidFines: 0,
    pendingReservations: 0,
  });
  const [recentBorrows, setRecentBorrows] = useState([]);
  
  const currentUser = JSON.parse(sessionStorage.getItem('user') || '{}');

  useEffect(() => {
    if (currentUser.id) {
      fetchStudentData();
    }
  }, [currentUser.id]);

  const fetchStudentData = async () => {
    setLoading(true);
    try {
      const [logsRes, violationsRes, reservationsRes] = await Promise.all([
        axiosClient.get('/borrow-logs'),
        axiosClient.get(`/violations/user/${currentUser.id}`),
        axiosClient.get('/reservations')
      ]);

      const allLogs = logsRes.data || [];
      const allViolations = violationsRes.data || [];
      const allReservations = reservationsRes.data || [];

      const myLogs = allLogs.filter(log => log.userId === currentUser.id);
      const activeBorrows = myLogs.filter(log => log.status === 'BORROWING');
      const overdueBorrows = activeBorrows.filter(log => dayjs().isAfter(dayjs(log.dueDate)));
      const recent = [...myLogs].sort((a, b) => new Date(b.borrowDate) - new Date(a.borrowDate)).slice(0, 5);

      const unpaidViolations = allViolations.filter(v => !v.isPaid);
      const totalUnpaidAmount = unpaidViolations.reduce((sum, v) => sum + v.fineAmount, 0);

      const myActiveReservations = allReservations.filter(
        r => r.userId === currentUser.id && (r.status === 'PENDING' || r.status === 'APPROVED')
      );

      setStats({
        borrowingCount: activeBorrows.length,
        overdueCount: overdueBorrows.length,
        unpaidFines: totalUnpaidAmount,
        pendingReservations: myActiveReservations.length
      });
      setRecentBorrows(recent);

    } catch (err) {
      message.error('Không thể tải dữ liệu tổng quan!');
    } finally {
      setLoading(false);
    }
  };

  const renderStatusTag = (status) => {
    const statusMap = {
      PENDING: { color: '#FAAD14', text: 'Chờ duyệt' },
      BORROWING: { color: TOKENS.accent, text: 'Đang mượn' },
      RETURNED: { color: '#52C41A', text: 'Đã trả' },
      REJECTED: { color: TOKENS.danger, text: 'Từ chối' },
    };
    const current = statusMap[status] || { color: TOKENS.muted, text: status };
    return (
      <span style={{ 
        fontSize: '11px', 
        textTransform: 'uppercase', 
        letterSpacing: '0.05em', 
        fontWeight: 600, 
        color: current.color,
        background: `${current.color}10`,
        padding: '2px 8px',
        borderRadius: '4px'
      }}>
        {current.text}
      </span>
    );
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } }
  };

  return (
    <Spin spinning={loading}>
      <motion.div variants={container} initial="hidden" animate="show">
        <motion.div variants={item} style={{ marginBottom: '48px' }}>
          <Title level={2} style={{ margin: 0, fontWeight: 700, letterSpacing: '-0.02em', color: TOKENS.text }}>
            Chào, {currentUser.name}
          </Title>
          <Text style={{ color: TOKENS.muted, fontSize: '15px' }}>
            {dayjs().format('dddd, DD MMMM YYYY')}
          </Text>
        </motion.div>

        {stats.unpaidFines > 0 && (
          <motion.div variants={item} style={{ 
            background: '#FFF1F0', 
            border: `1px solid #FFA39E`, 
            padding: '16px 24px', 
            borderRadius: '8px', 
            marginBottom: '32px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <WarningOutlined style={{ color: TOKENS.danger, fontSize: '20px' }} />
            <div style={{ flex: 1 }}>
              <Text strong style={{ color: TOKENS.danger }}>Nhắc nhở nộp phạt</Text>
              <br />
              <Text style={{ fontSize: '13px', color: TOKENS.danger }}>
                Bạn có khoản phạt <b>{stats.unpaidFines.toLocaleString()}đ</b> chưa thanh toán.
              </Text>
            </div>
            <ArrowRightOutlined style={{ color: TOKENS.danger }} />
          </motion.div>
        )}

        {/* --- BENTO GRID LAYOUT --- */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(12, 1fr)', 
          gridAutoRows: 'minmax(120px, auto)',
          gap: '20px' 
        }}>
          
          {/* Main Stat: Active Borrows */}
          <motion.div variants={item} style={{ 
            gridColumn: 'span 4', 
            gridRow: 'span 1',
            background: TOKENS.text,
            color: '#FFF',
            padding: '24px',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <BookOutlined style={{ fontSize: '24px', opacity: 0.5 }} />
            <div>
              <div style={{ fontSize: '48px', fontWeight: 700, lineHeight: 1, fontFamily: 'monospace' }}>
                {stats.borrowingCount.toString().padStart(2, '0')}
              </div>
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Sách đang mượn
              </Text>
            </div>
          </motion.div>

          {/* Stat: Overdue */}
          <motion.div variants={item} style={{ 
            gridColumn: 'span 4', 
            background: stats.overdueCount > 0 ? '#FFF1F0' : '#F6FFED',
            padding: '24px',
            borderRadius: '12px',
            border: stats.overdueCount > 0 ? '1px solid #FFA39E' : '1px solid #B7EB8F',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center'
          }}>
            <ClockCircleOutlined style={{ fontSize: '20px', color: stats.overdueCount > 0 ? TOKENS.danger : '#52C41A', marginBottom: '8px' }} />
            <div style={{ fontSize: '28px', fontWeight: 700, color: stats.overdueCount > 0 ? TOKENS.danger : '#52C41A' }}>
              {stats.overdueCount}
            </div>
            <Text style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: TOKENS.muted }}>
              Tài liệu quá hạn
            </Text>
          </motion.div>

          {/* Stat: Reservations */}
          <motion.div variants={item} style={{ 
            gridColumn: 'span 4', 
            background: TOKENS.surface,
            padding: '24px',
            borderRadius: '12px',
            border: `1px solid ${TOKENS.border}`,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center'
          }}>
            <CalendarOutlined style={{ fontSize: '20px', color: TOKENS.accent, marginBottom: '8px' }} />
            <div style={{ fontSize: '28px', fontWeight: 700, color: TOKENS.text }}>
              {stats.pendingReservations}
            </div>
            <Text style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: TOKENS.muted }}>
              Đang đặt trước
            </Text>
          </motion.div>

          {/* Recent Activity: Large Side Tile */}
          <motion.div variants={item} style={{ 
            gridColumn: 'span 8', 
            gridRow: 'span 2',
            background: TOKENS.surface,
            padding: '32px',
            borderRadius: '12px',
            border: `1px solid ${TOKENS.border}`
          }}>
            <Space style={{ marginBottom: '24px' }}>
              <ClockCircleOutlined style={{ color: TOKENS.accent }} />
              <Title level={5} style={{ margin: 0 }}>Lịch sử mượn gần đây</Title>
            </Space>
            
            <List
              itemLayout="horizontal"
              dataSource={recentBorrows}
              split={false}
              locale={{ emptyText: 'Chưa có hoạt động mượn sách.' }}
              renderItem={(item) => (
                <div style={{ 
                  padding: '16px 0', 
                  borderBottom: `1px solid ${TOKENS.bg}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ flex: 1 }}>
                    <Text strong style={{ display: 'block', fontSize: '14px' }}>{item.book?.title}</Text>
                    <Text style={{ fontSize: '12px', color: TOKENS.muted }}>
                      Hạn trả: {dayjs(item.dueDate).format('DD/MM/YYYY')}
                    </Text>
                  </div>
                  {renderStatusTag(item.status)}
                </div>
              )}
            />
          </motion.div>

          {/* Fines Stat: Bottom Right */}
          <motion.div variants={item} style={{ 
            gridColumn: 'span 4', 
            gridRow: 'span 2',
            background: TOKENS.bg,
            padding: '32px',
            borderRadius: '12px',
            border: `1px solid ${TOKENS.border}`,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center'
          }}>
            <div style={{ 
              width: '48px', 
              height: '48px', 
              borderRadius: '50%', 
              background: stats.unpaidFines > 0 ? `${TOKENS.danger}10` : '#F6FFED',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              <DollarCircleOutlined style={{ fontSize: '20px', color: stats.unpaidFines > 0 ? TOKENS.danger : '#52C41A' }} />
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: TOKENS.text, fontFamily: 'monospace' }}>
              {stats.unpaidFines.toLocaleString()}
              <span style={{ fontSize: '14px', marginLeft: '4px' }}>đ</span>
            </div>
            <Text style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: TOKENS.muted }}>
              Tổng tiền phạt nợ
            </Text>
            {stats.unpaidFines > 0 && (
              <Divider style={{ margin: '16px 0', borderColor: TOKENS.border }} />
            )}
            {stats.unpaidFines > 0 && (
              <Text style={{ fontSize: '12px', color: TOKENS.danger }}>
                Vui lòng nộp phạt sớm.
              </Text>
            )}
          </motion.div>

        </div>
      </motion.div>
    </Spin>
  );
};

export default StudentDashboard;