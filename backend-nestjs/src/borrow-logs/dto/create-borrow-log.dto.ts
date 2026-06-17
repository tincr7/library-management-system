import { ApiProperty } from '@nestjs/swagger';

export class CreateBorrowLogDto {
  @ApiProperty({ example: 1, description: 'ID của Sinh viên (User)' })
  userId: number;

  @ApiProperty({ example: 3, description: 'ID của cuốn sách cần mượn' })
  bookId: number;
}