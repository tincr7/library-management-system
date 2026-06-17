import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Quản lý Danh mục Thể loại (Category)')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @ApiOperation({ summary: 'Thêm mới một thể loại sách' })
  create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoriesService.create(createCategoryDto);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy toàn bộ danh sách thể loại' })
  findAll() {
    return this.categoriesService.findAll();
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa một thể loại sách' })
  remove(@Param('id') id: string) {
    return this.categoriesService.remove(+id);
  }
}