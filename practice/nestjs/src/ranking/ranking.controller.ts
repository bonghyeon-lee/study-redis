import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { RankingService } from './ranking.service';

@Controller('ranking')
export class RankingController {
  constructor(private readonly rankingService: RankingService) {}

  @Post('score')
  async addScore(@Body('userId') userId: string, @Body('score') score: number) {
    if (!userId || score === undefined)
      throw new BadRequestException('userId and score are required');
    const newScore = await this.rankingService.addScore(userId, score);
    return { userId, newScore };
  }

  @Get('top')
  async getTop(@Query('limit') limit: string) {
    const l = limit ? parseInt(limit, 10) : 10;
    const topRankers = await this.rankingService.getTopRankers(l);
    return { topRankers };
  }

  @Get(':userId')
  async getUserRank(@Param('userId') userId: string) {
    const rankData = await this.rankingService.getUserRank(userId);
    if (!rankData) return { message: 'User not found' };
    return rankData;
  }

  // --- Uncached Endpoints ---

  @Post('score-uncached')
  async addScoreUncached(
    @Body('userId') userId: string,
    @Body('score') score: number,
  ) {
    if (!userId || score === undefined)
      throw new BadRequestException('userId and score are required');
    const newScore = await this.rankingService.addScoreUncached(userId, score);
    return { userId, newScore, type: 'uncached' };
  }

  @Get('top-uncached')
  async getTopUncached(@Query('limit') limit: string) {
    const l = limit ? parseInt(limit, 10) : 10;
    const topRankers = await this.rankingService.getTopRankersUncached(l);
    return { topRankers, type: 'uncached' };
  }
}
