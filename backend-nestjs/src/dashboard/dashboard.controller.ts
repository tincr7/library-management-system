import { Controller, Get } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Dashboard (Tổng quan hệ thống)')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Lấy toàn bộ dữ liệu thống kê, biểu đồ và đầu việc khẩn cấp cho Admin' })
  getStats() {
    return this.dashboardService.getDashboardStats();
  }
}