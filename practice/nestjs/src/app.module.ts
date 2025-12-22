import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { NoticesModule } from './notices/notices.module';
import { CacheModule } from '@nestjs/cache-manager';
import * as redisStore from 'cache-manager-redis-store';
import { RedisModule } from './common/redis.module';

import { AuthModule } from './auth/auth.module';
import { SearchModule } from './search/search.module';
import { RankingModule } from './ranking/ranking.module';
import { CouponModule } from './coupon/coupon.module';

@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: () => {
        // Added async keyword here
        return {
          store: redisStore,
          host: 'localhost',
          port: 6379,
          ttl: 300,
        };
      },
    }),
    RedisModule,
    NoticesModule,
    AuthModule,
    SearchModule,
    RankingModule,
    CouponModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
