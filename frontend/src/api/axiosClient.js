import axios from 'axios';

const axiosClient = axios.create({
  baseURL: 'http://localhost:3001', // Port của NestJS
  headers: { 'Content-Type': 'application/json' }
});

// Tự động gắn Token vào mỗi Request nếu đã đăng nhập
axiosClient.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default axiosClient;