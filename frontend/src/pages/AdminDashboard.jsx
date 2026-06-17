import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, Table, Tag, List, Typography, Space, Spin, Button, message } from 'antd';
import { 
  BookOutlined, UserOutlined, ContactsOutlined, AlertOutlined, 
  ReloadOutlined, ClockCircleOutlined, ExclamationCircleOutlined, 
  HourglassOutlined, TeamOutlined 
} from '@ant-design/icons';
import { Bar, Pie } from 'react-chartjs-2';
import axiosClient from '../api/axiosClient';
import dayjs from 'dayjs';

// Cấu hình bắt buộc của Chart.js để vẽ được biểu đồ
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title as ChartTitle,
  Tooltip as ChartTooltip,
  Legend,
  ArcElement
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, ChartTitle, ChartTooltip, Legend, ArcElement);
const { Title, Text } = Typography;

const AdminDashboard = () => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalBooks: 0,
    totalStudents: 0,
    borrowingBooks: 0,
    overdueBooks: 0,
  });
  const [chartData, setChartData] = useState({
    monthlyBorrows: [],
    categoryStats: []
  });
  const [urgentTasks, setUrgentTasks] = useState({
    upcomingReturns: [],
    overdueReturns: [],
    pendingBorrows: [],
    pendingReservations: []
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get('/dashboard/stats');
      setStats(res.data.stats || {});
      setChartData(res.data.charts || {});
      setUrgentTasks(res.data.urgentTasks || {});
    } catch (err) {
      message.error('Không thể tải dữ liệu tổng quan!');
    } finally {
      setLoading(false);
    }
  };

  // ==================== CẤU HÌNH BIỂU ĐỒ (CHARTS) ====================
  const barChartConfig = {
    labels: chartData.monthlyBorrows?.map(d => d.month) || [],
    datasets: [{
      label: 'Số lượt mượn sách',
      data: chartData.monthlyBorrows?.map(d => d.count) || [],
      backgroundColor: '#1890ff',
      borderRadius: 4
    }]
  };

  const pieChartConfig = {
    labels: chartData.categoryStats?.map(c => c.categoryName) || [],
    datasets: [{
      data: chartData.categoryStats?.map(c => c.count) || [],
      backgroundColor: ['#1890ff', '#52c41a', '#f5222d', '#fa8c16', '#722ed1', '#13c2c2'],
      borderWidth: 1
    }]
  };

  return (
    <div style={{ padding: '20px', background: '#f0f2f5', minHeight: '100vh', width: '100%' }}>
      {/* Khối Tiêu Đề */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Title level={2} style={{ margin: 0, fontWeight: 'bold' }}>Hệ Thống Thống Kê Thư Viện Thông Minh</Title>
          <Text type="secondary">Chào mừng Admin! Dưới đây là phân tích và các tác vụ cần xử lý ngay.</Text>
        </div>
        <Button type="primary" icon={<ReloadOutlined />} onClick={fetchDashboardData} loading={loading}>
          Làm mới dữ liệu
        </Button>
      </div>

      <Spin spinning={loading}>
        {/* ==================== 1. KHỐI THỐNG KÊ NHANH (CARDS) ==================== */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card borderless style={{ borderLeft: '4px solid #1890ff' }}>
              <Statistic title="Tổng số đầu sách" value={stats.totalBooks} prefix={<BookOutlined style={{ color: '#1890ff' }} />} />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card borderless style={{ borderLeft: '4px solid #52c41a' }}>
              <Statistic title="Tổng số sinh viên" value={stats.totalStudents} prefix={<UserOutlined style={{ color: '#52c41a' }} />} />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card borderless style={{ borderLeft: '4px solid #fa8c16' }}>
              <Statistic title="Sách đang được mượn" value={stats.borrowingBooks} prefix={<ContactsOutlined style={{ color: '#fa8c16' }} />} />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card borderless style={{ borderLeft: '4px solid #f5222d' }}>
              <Statistic title="Sách quá hạn phạt" value={stats.overdueBooks} prefix={<AlertOutlined style={{ color: '#f5222d' }} />} />
            </Card>
          </Col>
        </Row>

        {/* ==================== 2. KHỐI BIỂU ĐỒ (CHARTS) ==================== */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} lg={14}>
            <Card title={<b>📊 Biểu đồ số lượt mượn theo tháng</b>} bordered={false}>
              <div style={{ height: 280 }}><Bar data={barChartConfig} options={{ responsive: true, maintainAspectRatio: false }} /></div>
            </Card>
          </Col>
          <Col xs={24} lg={10}>
            <Card title={<b> Biểu đồ sách theo danh mục</b>} bordered={false}>
              <div style={{ height: 280 }}><Pie data={pieChartConfig} options={{ responsive: true, maintainAspectRatio: false }} /></div>
            </Card>
          </Col>
        </Row>

        {/* ==================== 3. KHỐI TÁC VỤ CẦN XỬ LÝ NGAY (ADMIN URGENT) ==================== */}
        <Card title={<b style={{ color: '#d4380d' }}><ExclamationCircleOutlined /> DANH SÁCH CẦN XỬ LÝ NGAY</b>} bordered={false} style={{ background: '#ffffff' }}>
          <Row gutter={[24, 24]}>
            
            {/* Mục 3.1: Sách Sắp Đến Hạn */}
            <Col xs={24} md={12} xl={6}>
              <Card type="inner" title={<Space><ClockCircleOutlined style={{ color: '#fa8c16' }} />Sách sắp đến hạn</Space>} bodyStyle={{ padding: '10px' }}>
                <List
                  dataSource={urgentTasks.upcomingReturns}
                  renderItem={item => (
                    <List.Item style={{ padding: '8px 4px' }}>
                      <List.Item.Meta
                        title={<b>{item.studentName}</b>}
                        description={<div>📖 {item.bookTitle}<br/><Tag color="orange">Còn {item.daysLeft} ngày</Tag></div>}
                      />
                    </List.Item>
                  )}
                  locale={{ emptyText: 'Không có sách sắp hết hạn' }}
                />
              </Card>
            </Col>

            {/* Mục 3.2: Sách Quá Hạn */}
            <Col xs={24} md={12} xl={6}>
              <Card type="inner" title={<Space><AlertOutlined style={{ color: '#f5222d' }} />Sách đã quá hạn</Space>} bodyStyle={{ padding: '10px' }}>
                <List
                  dataSource={urgentTasks.overdueReturns}
                  renderItem={item => (
                    <List.Item style={{ padding: '8px 4px' }}>
                      <List.Item.Meta
                        title={<b style={{ color: '#f5222d' }}>{item.studentName}</b>}
                        description={<div>📖 {item.bookTitle}<br/><Tag color="red">Quá hạn {item.daysOverdue} ngày</Tag></div>}
                      />
                    </List.Item>
                  )}
                  locale={{ emptyText: 'Tuyệt vời! Không có ai trễ hạn' }}
                />
              </Card>
            </Col>

            {/* Mục 3.3: Yêu Cầu Mượn Chờ Duyệt */}
            <Col xs={24} md={12} xl={6}>
              <Card type="inner" title={<Space><HourglassOutlined style={{ color: '#1890ff' }} />Yêu cầu mượn chờ duyệt</Space>} bodyStyle={{ padding: '10px' }}>
                <List
                  dataSource={urgentTasks.pendingBorrows}
                  renderItem={item => (
                    <List.Item style={{ padding: '8px 4px' }}>
                      <List.Item.Meta
                        title={<b>{item.bookTitle}</b>}
                        description={<div>👤 MSSV: {item.mssv}<br/><Tag color="blue">Chờ duyệt đơn</Tag></div>}
                      />
                    </List.Item>
                  )}
                  locale={{ emptyText: 'Không có yêu cầu mượn tồn đọng' }}
                />
              </Card>
            </Col>

            {/* Mục 3.4: Đặt Trước Chờ Xử Lý */}
            <Col xs={24} md={12} xl={6}>
              <Card type="inner" title={<Space><TeamOutlined style={{ color: '#722ed1' }} />Đặt trước chờ xử lý</Space>} bodyStyle={{ padding: '10px' }}>
                <List
                  dataSource={urgentTasks.pendingReservations}
                  renderItem={item => (
                    <List.Item style={{ padding: '8px 4px' }}>
                      <List.Item.Meta
                        title={<b>{item.bookTitle}</b>}
                        description={<div>⚠️ Có <b style={{ color: '#722ed1' }}>{item.waitingStudents}</b> sinh viên đang chờ<br/><Tag color="purple">Đợi sách về kệ</Tag></div>}
                      />
                    </List.Item>
                  )}
                  locale={{ emptyText: 'Không có hàng chờ đặt trước' }}
                />
              </Card>
            </Col>

          </Row>
        </Card>
      </Spin>
    </div>
  );
};

export default AdminDashboard;