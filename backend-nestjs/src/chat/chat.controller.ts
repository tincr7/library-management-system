import { Controller, Post, Body, HttpCode, HttpStatus, BadRequestException } from '@nestjs/common';
import { GeminiService } from './gemini.service';
import { ApiOperation, ApiTags, ApiBody } from '@nestjs/swagger';

@ApiTags('AI Library Assistant - Trợ lý ảo')
@Controller('chat')
export class ChatController {
  constructor(private readonly geminiService: GeminiService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Gửi tin nhắn trò chuyện với AI Trợ Lý Thư Viện' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Tôi được mượn tối đa bao nhiêu cuốn?' },
        userId: { type: 'integer', example: 1, description: 'ID của sinh viên đang chat' },
      },
      required: ['message', 'userId'],
    },
  })
  async chatWithLibraryAI(@Body() body: { message: string; userId: number }) {
    if (!body.message || !body.userId) {
      throw new BadRequestException('Vui lòng cung cấp đầy đủ thông điệp chat (message) và định danh sinh viên (userId)!');
    }

    const aiReply = await this.geminiService.handleUserMessage(body.userId, body.message);
    
    return {
      reply: aiReply,
    };
  }
}