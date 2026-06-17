import { Controller, Get, Param, ParseIntPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { RecommendationService } from './recommendation.service';
import { ApiOperation, ApiTags, ApiParam } from '@nestjs/swagger';

@ApiTags('Recommendation System - Gợi ý sách')
@Controller('recommendations')
export class RecommendationController {
  constructor(private readonly recommendationService: RecommendationService) {}

  @Get('user/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lấy danh sách tối đa 10 cuốn sách gợi ý Hybrid cho sinh viên' })
  @ApiParam({ name: 'userId', description: 'ID của sinh viên cần tính toán gợi ý' })
  async getUserRecommendations(@Param('userId', ParseIntPipe) userId: number) {
    return await this.recommendationService.getHybridRecommendations(userId);
  }
}