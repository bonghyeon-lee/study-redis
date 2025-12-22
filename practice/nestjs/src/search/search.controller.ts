import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Post()
  async search(
    @Body('userId') userId: string,
    @Body('keyword') keyword: string,
  ) {
    if (!userId || !keyword)
      throw new BadRequestException('userId and keyword are required');

    // In a real app, this would perform a search and then log the keyword.
    await this.searchService.addKeyword(userId, keyword);

    return { success: true, message: 'Search logged', keyword };
  }

  @Get('history')
  async getHistory(@Query('userId') userId: string) {
    if (!userId) throw new BadRequestException('userId is required');
    const history = await this.searchService.getHistory(userId);
    return { userId, history };
  }

  @Post('uncached')
  async searchUncached(
    @Body('userId') userId: string,
    @Body('keyword') keyword: string,
  ) {
    if (!userId || !keyword)
      throw new BadRequestException('userId and keyword are required');
    await this.searchService.addKeywordUncached(userId, keyword);
    return { success: true, message: 'Search logged (Uncached)', keyword };
  }

  @Get('history-uncached')
  async getHistoryUncached(@Query('userId') userId: string) {
    if (!userId) throw new BadRequestException('userId is required');
    const history = await this.searchService.getHistoryUncached(userId);
    return { userId, history };
  }
}
