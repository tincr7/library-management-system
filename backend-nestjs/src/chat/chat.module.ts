import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { GeminiService } from './gemini.service';
import { RagService } from './rag.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RecommendationModule } from '../recommendation/recommendation.module';

@Module({
  imports: [PrismaModule, RecommendationModule], // Kéo các Module quản lý DB và Gợi ý sách sang dùng chung
  controllers: [ChatController],
  providers: [GeminiService, RagService],
})
export class ChatModule {}