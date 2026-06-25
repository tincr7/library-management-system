# Step 1: Build
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./

# SỬA DÒNG NÀY: Ép cài thêm gói optional dành cho kiến trúc OS trong container
RUN npm install --include=optional

COPY . .
RUN npm run build

# Step 2: Nginx
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html

RUN echo 'server { listen 80; location / { root /usr/share/nginx/html; index index.html index.htm; try_files $uri $uri/ /index.html; } }' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]