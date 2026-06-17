import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: '2251123456', description: 'Mã số sinh viên (Duy nhất)' })
  mssv: string;

  @ApiProperty({ example: 'Nguyễn Văn A', description: 'Họ và tên sinh viên' })
  name: string;

  @ApiProperty({ example: '0987654321', description: 'Số điện thoại hoặc Telegram ID', required: false })
  telegramId?: string;

  
}