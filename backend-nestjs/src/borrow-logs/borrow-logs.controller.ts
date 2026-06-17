import { Controller, Get, Post, Body, Patch, Param } from '@nestjs/common';
import { BorrowLogsService } from './borrow-logs.service';
import { CreateBorrowLogDto } from './dto/create-borrow-log.dto';
import { UpdateBorrowLogDto } from './dto/update-borrow-log.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Quản lý Đăng ký & Duyệt Mượn/Trả Sách (BorrowLog)')
@Controller('borrow-logs')
export class BorrowLogsController {
  constructor(private readonly borrowLogsService: BorrowLogsService) {}

  @Post()
  @ApiOperation({ summary: 'Sinh viên đăng ký mượn sách (Tạo đơn PENDING)' })
  create(@Body() createBorrowLogDto: CreateBorrowLogDto) {
    return this.borrowLogsService.create(createBorrowLogDto);
  }

  @Get()
  @ApiOperation({ summary: 'Admin lấy danh sách toàn bộ các yêu cầu mượn/trả sách' })
  findAll() {
    return this.borrowLogsService.findAll();
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Admin Duyệt mượn sách hoặc Xác nhận trả sách thành công' })
  @ApiResponse({ status: 200, description: 'Cập nhật trạng thái và tính toán lại kho bãi thành công.' })
  update(@Param('id') id: string, @Body() updateBorrowLogDto: UpdateBorrowLogDto) {
    return this.borrowLogsService.update(+id, updateBorrowLogDto);
  }
}