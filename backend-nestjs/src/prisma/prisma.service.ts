// src/prisma/prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    // In ra để kiểm tra chắc chắn biến đã được nạp vào process.env chưa
    console.log('🔍 Kiểm tra DATABASE_URL:', process.env.DATABASE_URL ? 'Đã có' : 'Trống');
    
    await this.$connect();
    console.log('✅ [Prisma]: Kết nối Database thành công!');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}