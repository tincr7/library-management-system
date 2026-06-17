import { Controller, Get, Post, Body, ParseIntPipe } from '@nestjs/common';
import { RenewService } from './renew.service';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger'; // 👈 Import cái này

@ApiTags('Renew (Quản lý gia hạn sách)') // 👈 Tạo nhóm riêng trên giao diện Swagger
@Controller('renew')
export class RenewController {
  constructor(private readonly renewService: RenewService) {}

  @Get('all')
  @ApiOperation({ summary: 'Lấy toàn bộ lịch sử gia hạn hệ thống (Admin)' })
  findAll() {
    return this.renewService.findAll();
  }

  @Post('request')
  @ApiOperation({ summary: 'Sinh viên tự ấn gia hạn sách (Thêm 7 ngày)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        borrowLogId: { type: 'number', example: 1, description: 'ID của lượt mượn sách' },
        reason: { type: 'string', example: 'Em chưa đọc kịp', description: 'Lý do gia hạn (Không bắt buộc)' }
      }
    }
  })
  renewBook(
    @Body('borrowLogId', ParseIntPipe) borrowLogId: number,
    @Body('reason') reason?: string
  ) {
    return this.renewService.renewBook(borrowLogId, reason);
  }
}