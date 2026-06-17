// src/violations/violations.module.ts
import { Module } from '@nestjs/common';
import { ViolationsService } from './violations.service';
import { ViolationsController } from './violations.controller';
import { TelegramModule } from '../telegram/telegram.module'; // 🔥 Nhớ import đúng dẫn này vào

@Module({
  imports: [TelegramModule], // 🔥 NẠP VÀO ĐÂY để Controller gọi được sang TelegramService mà không bị crash sập nguồn
  controllers: [ViolationsController],
  providers: [ViolationsService],
  exports: [ViolationsService]
})
export class ViolationsModule {}