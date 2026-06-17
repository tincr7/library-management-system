import { Module } from '@nestjs/common';
import { RecommendationService } from './recommendation.service';
import { RecommendationController } from './recommendation.controller';
// 🔥 Import PrismaModule của bạn để Module này bốc được database kết nối Postgres
import { PrismaModule } from '../prisma/prisma.module'; 

@Module({
  imports: [PrismaModule], // Nạp kết nối cơ sở dữ liệu ngầm cho Service sử dụng
  controllers: [RecommendationController],
  providers: [RecommendationService],
  exports: [RecommendationService], // Xuất ra phòng trường hợp các module khác cần dùng tới
})
export class RecommendationModule {}