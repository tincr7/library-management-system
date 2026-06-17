// src/users/users.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { UsersService } from './users.service';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@ApiTags('Phân hệ Quản lý Sinh viên (STUDENT)') // Đặt tên nhóm lớn trên giao diện Swagger
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Thêm mới một Sinh viên' })
  @ApiResponse({ status: 201, description: 'Tạo tài khoản sinh viên thành công (Mật khẩu mặc định: 123456, Role: STUDENT).' })
  @ApiResponse({ status: 400, description: 'Yêu cầu không hợp lệ hoặc MSSV đã tồn tại.' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy toàn bộ danh sách người dùng trong hệ thống' })
  @ApiResponse({ status: 200, description: 'Trả về mảng danh sách người dùng thành công.' })
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin chi tiết một người dùng theo ID' })
  @ApiParam({ name: 'id', description: 'ID tự tăng (Int) của User trong Database' })
  @ApiResponse({ status: 200, description: 'Tìm thấy dữ liệu.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy người dùng.' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật thông tin / Khóa / Reset mật khẩu Sinh viên' })
  @ApiParam({ name: 'id', description: 'ID của User cần cập nhật' })
  @ApiResponse({ status: 200, description: 'Cập nhật dữ liệu thành công.' })
  @ApiResponse({ status: 400, description: 'Dữ liệu truyền lên sai cấu trúc.' })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(+id, updateUserDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa vĩnh viễn tài khoản người dùng' })
  @ApiParam({ name: 'id', description: 'ID của User cần xóa' })
  @ApiResponse({ status: 200, description: 'Xóa tài khoản thành công.' })
  @ApiResponse({ status: 400, description: 'Không thể xóa do ràng buộc dữ liệu mượn sách.' })
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }
}