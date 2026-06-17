import { IsNotEmpty, IsOptional, IsString, IsNumber } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateBookDto {
  @IsNotEmpty({ message: 'Tên đầu sách không được để trống' })
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  author?: string;

  @IsOptional()
  @IsString()
  isbn?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Transform(({ value }) => value ? Number(value) : 1) // 🔥 Tự động ép kiểu từ chuỗi sang số
  @IsNumber({}, { message: 'Số lượng kho phải là một số' })
  stock?: number;

  @IsOptional()
  @Transform(({ value }) => value ? Number(value) : null) // 🔥 Tự động ép kiểu từ chuỗi sang số
  @IsNumber({}, { message: 'ID danh mục phải là một số' })
  categoryId?: number;
}