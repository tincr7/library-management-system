// src/prisma/prisma.module.ts
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // Biến PrismaService thành "hàng dùng chung" toàn cầu
@Module({
  providers: [PrismaService],
  exports: [PrismaService], // Phải xuất khẩu thì thằng khác mới mượn được
})
export class PrismaModule {}