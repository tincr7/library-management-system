// src/reservations/reservations.controller.ts
import { Controller, Get, Post, Patch, Param, Body } from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Quản lý Giữ chỗ / Đặt trước Sách (Reservation)')
@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post()
  @ApiOperation({ summary: 'Sinh viên đăng ký đặt trước sách (Tạo đơn PENDING giữ chỗ)' })
  @ApiResponse({ status: 201, description: 'Đăng ký đặt trước sách thành công.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy Sách hoặc Sinh viên.' })
  create(@Body() createReservationDto: CreateReservationDto) {
    return this.reservationsService.create(createReservationDto);
  }

  @Get()
  @ApiOperation({ summary: 'Admin lấy danh sách đặt trước (Đã xếp theo thứ tự ưu tiên)' })
  findAll() {
    return this.reservationsService.findAll();
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Admin Duyệt hoặc Hủy đơn đặt trước sách của sinh viên' })
  update(@Param('id') id: string, @Body() dto: UpdateReservationDto) {
    return this.reservationsService.update(+id, dto);
  }
}