import {
  Controller,
  Post,
  Get,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { CouponService } from './coupon.service';

@Controller('coupon')
export class CouponController {
  constructor(private readonly couponService: CouponService) {}

  @Post('claim')
  async claim(@Body('userId') userId: string) {
    if (!userId) throw new BadRequestException('userId is required');
    return await this.couponService.issueCoupon(userId);
  }

  @Get('stats')
  async getStats() {
    return await this.couponService.getStats();
  }

  // --- Uncached Endpoints ---

  @Post('claim-uncached')
  async claimUncached(@Body('userId') userId: string) {
    if (!userId) throw new BadRequestException('userId is required');
    return await this.couponService.issueCouponUncached(userId);
  }

  @Get('stats-uncached')
  async getStatsUncached() {
    return await this.couponService.getStatsUncached();
  }
}
