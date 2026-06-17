
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as dotenv from 'dotenv';
dotenv.config(); // Nạp .env TRƯỚC KHI import bất kỳ thứ gì khác

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();
  // --- CẤU HÌNH SWAGGER ---
  const config = new DocumentBuilder()
    .setTitle('Hệ thống Quản lý Thư viện Thông minh')
    .setDescription('Tài liệu chi tiết toàn bộ API hệ thống thư viện (DHT Project)')
    .setVersion('2.0')
    .addBearerAuth() // Thêm cấu hình token JWT (ổ khóa bảo mật)
    .build();

  const document = SwaggerModule.createDocument(app, config);
  
  // Đường dẫn truy cập giao diện Swagger sẽ là: http://localhost:3000/api
  SwaggerModule.setup('api', app, document);

  await app.listen(3001);
  console.log(`🚀 Server đang chạy tại: http://localhost:3001`);
  console.log(`📄 Giao diện Swagger API: http://localhost:3001/api`);
}
bootstrap();