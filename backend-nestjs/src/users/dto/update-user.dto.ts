import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiProperty({ example: 'Nguyễn Văn B', description: 'Cập nhật họ tên', required: false })
  name?: string;

  @ApiProperty({ example: '0912345678', description: 'Cập nhật Telegram ID', required: false })
  telegramId?: string;

  @ApiProperty({ example: false, description: 'Trạng thái kích hoạt (false để Khóa tài khoản)', required: false })
  isActive?: boolean;

  @ApiProperty({ example: '123456', description: 'Truyền chuỗi này lên nếu muốn reset mật khẩu', required: false })
  password?: string;
}