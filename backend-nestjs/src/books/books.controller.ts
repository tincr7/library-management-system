import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  UseInterceptors, 
  UploadedFile,
  ParseIntPipe
} from '@nestjs/common';
import { BooksService } from './books.service';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Books - Quản lý Kho Sách')
@Controller('books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  // 1. Thêm mới một đầu sách kèm ảnh bìa để đồng bộ AI
  @Post()
  @ApiOperation({ summary: 'Admin thêm mới đầu sách (Tự động đồng bộ sang AI Engine)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Thông tin sách và tệp tin ảnh bìa dạng form-data',
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Tên đầu sách mới' },
        author: { type: 'string', description: 'Tên tác giả' },
        isbn: { type: 'string', description: 'Mã ISBN (nếu có)' },
        description: { type: 'string', description: 'Mô tả tóm tắt nội dung sách' },
        stock: { type: 'number', description: 'Số lượng nhập kho ban đầu', default: 1 },
        categoryId: { type: 'number', description: 'ID của danh mục thể loại' },
        file: {
          type: 'string',
          format: 'binary',
          description: 'Hình ảnh chụp bìa sách để AI học đặc trưng',
        },
      },
      required: ['title'],
    },
  })
  @UseInterceptors(FileInterceptor('file')) // Key nhận file từ FE/Swagger bắt buộc là 'file'
  async create(
    @Body() createBookDto: CreateBookDto, 
    @UploadedFile() file: Express.Multer.File
  ) {
    // Truyền cả dữ liệu chữ và file nhị phân xuống Service xử lý
    return await this.booksService.create(createBookDto, file);
  }

  // 2. Lấy toàn bộ danh sách sách
  @Get()
  @ApiOperation({ summary: 'Lấy toàn bộ danh sách đầu sách kèm danh mục' })
  async findAll() {
    return await this.booksService.findAll();
  }

  // 3. Lấy thông tin chi tiết một cuốn sách
  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết một đầu sách theo ID' })
  async findOne(@Param('id', ParseIntPipe) id: number) { // Sử dụng ParseIntPipe để validate ID là số
    return await this.booksService.findOne(id);
  }

  // 4. Cập nhật thông tin sách và cập nhật lại ảnh bìa AI (nếu có)
  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật thông tin sách / Thay đổi ảnh bìa học lại AI' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Các trường thông tin cần cập nhật (Tải lên file mới nếu muốn đổi ảnh bìa)',
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        author: { type: 'string' },
        isbn: { type: 'string' },
        description: { type: 'string' },
        stock: { type: 'number' },
        categoryId: { type: 'number' },
        file: {
          type: 'string',
          format: 'binary',
          description: 'Tải lên ảnh bìa mới nếu muốn cập nhật lại đặc trưng AI',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async update(
    @Param('id', ParseIntPipe) id: number, 
    @Body() updateBookDto: UpdateBookDto,
    @UploadedFile() file: Express.Multer.File
  ) {
    return await this.booksService.update(id, updateBookDto, file);
  }

  // 5. Xóa vĩnh viễn đầu sách
  @Delete(':id')
  @ApiOperation({ summary: 'Xóa vĩnh viễn một đầu sách khỏi hệ thống' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return await this.booksService.remove(id);
  }
}