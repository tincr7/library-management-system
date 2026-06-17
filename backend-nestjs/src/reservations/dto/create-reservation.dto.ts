import { ApiProperty } from '@nestjs/swagger';

export class CreateReservationDto {
  @ApiProperty({ example: 3, description: 'ID của cuốn sách sinh viên muốn đặt trước / giữ chỗ' })
  bookId: number;

  @ApiProperty({ example: 1, description: 'ID của Sinh viên thực hiện đặt (Nếu dùng Guard Auth thì lấy từ Token)' })
  userId: number;

  @ApiProperty({ example: 'Sách hay quá, khi nào có thông báo cho mình nhé', required: false, description: 'Ghi chú của sinh viên' })
  note?: string;
}