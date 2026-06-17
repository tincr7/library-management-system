import { ApiProperty } from '@nestjs/swagger';
import { BorrowStatus } from '@prisma/client';

export class UpdateBorrowLogDto {
  @ApiProperty({ example: 'BORROWING', enum: BorrowStatus, description: 'Trạng thái chuyển đổi mới của đơn mượn' })
  status: BorrowStatus;
}