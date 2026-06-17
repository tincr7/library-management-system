import { Module, Global } from '@nestjs/common';
import { TelegramService } from './telegram.service';

@Global() // 🔥 Thêm Decorator này để biến Module thành toàn cục
@Module({
  providers: [TelegramService],
  exports: [TelegramService], // 🔥 Bắt buộc export để các module khác dùng chung một thực thể (Instance) duy nhất
})
export class TelegramModule {}