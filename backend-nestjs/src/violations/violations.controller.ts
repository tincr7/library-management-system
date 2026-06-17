import { Controller, Get, Post, Body, Patch, Param, ParseIntPipe } from '@nestjs/common';
import { ViolationsService } from './violations.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TelegramService } from '../telegram/telegram.service';

@ApiTags('Violations (Quản lý vi phạm)')
@Controller('violations')
export class ViolationsController {
  constructor(
    private readonly violationsService: ViolationsService,
    // 🔥 CẬP NHẬT: Tiêm TelegramService vào để bẻ lái Endpoint quét phạt kèm bắn Telegram
    private readonly telegramService: TelegramService, 
  ) {}

  @Post('create')
  @ApiOperation({ summary: 'Tạo vi phạm thủ công (Admin)' })
  create(@Body() body: any) { 
    return this.violationsService.createViolation(body);
  }

  @Get('all')
  @ApiOperation({ summary: 'Lấy toàn bộ lịch sử vi phạm hệ thống (Admin)' })
  findAll() {
    return this.violationsService.findAllViolations();
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Lấy danh sách vi phạm của 1 sinh viên cụ thể' })
  findUserViolations(@Param('userId', ParseIntPipe) userId: number) {
    return this.violationsService.findUserViolations(userId);
  }

  @Patch(':id/pay')
  @ApiOperation({ summary: 'Đánh dấu đã nộp tiền phạt' })
  markAsPaid(@Param('id', ParseIntPipe) id: number) {
    return this.violationsService.markAsPaid(id);
  }

  @Post('trigger-scan')
  @ApiOperation({ summary: 'Nút bấm kích hoạt quét phạt trễ hạn thủ công (Không cần đợi nửa đêm)' })
  async triggerScan() {
    console.log('📡 [Admin Manual Action] Admin kích hoạt nút bấm ép hệ thống quét vi phạm và sync Telegram ngay lập tức!');
    
    // Gọi trực tiếp sang hàm tổng hợp "2 trong 1" anh em mình vừa viết bên phía TelegramService
    await this.telegramService.checkAndSendDeadlineNotifications();
    
    return { 
      success: true, 
      message: 'Đã kích hoạt chu kỳ tính toán phạt lũy tiến và đồng bộ thông báo Telegram thành công!' 
    };
  }
}