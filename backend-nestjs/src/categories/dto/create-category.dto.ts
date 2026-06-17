import { ApiProperty } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Công nghệ thông tin', description: 'Tên danh mục thể loại sách' })
  name: string;

  @ApiProperty({ example: 'Sách về lập trình, mạng, AI...', required: false })
  description?: string;
}