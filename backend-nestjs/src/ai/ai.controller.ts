import { Controller, Post, UseInterceptors, UploadedFile, HttpCode, HttpStatus, Body } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AiService } from './ai.service';
import { ApiConsumes, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('AI Service - Nhận diện sách')
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('predict-book')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Quét ảnh bìa sách để nhận diện thông tin (Tự động lưu lịch sử quét)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Tải lên hình ảnh chụp bìa sách và thông tin người dùng',
    schema: {
      type: 'object',
      properties: {
        file: { 
          type: 'string',
          format: 'binary',
          description: 'Hình ảnh chụp bìa cuốn sách cần quét',
        },
        userId: {
          type: 'string',
          description: 'ID của sinh viên đang thực hiện tìm kiếm (Để trống nếu chưa đăng nhập)',
          nullable: true,
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async predictBook(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { userId?: string } // 🔥 Thêm dòng này để bóc dữ liệu chữ từ FormData gửi lên
  ) {
    return await this.aiService.scanBookCover(file, body.userId);
  }
}