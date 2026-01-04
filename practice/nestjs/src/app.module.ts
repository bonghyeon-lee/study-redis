import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { NoticesModule } from './notices/notices.module';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore, redisClusterStore } from 'cache-manager-redis-yet';
import { RedisModule } from './common/redis.module';

import { AuthModule } from './auth/auth.module';
import { SearchModule } from './search/search.module';
import { RankingModule } from './ranking/ranking.module';
import { CouponModule } from './coupon/coupon.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const isCluster = configService.get<string>('REDIS_CLUSTER_ENABLED') === 'true';

        if (isCluster) {
          const nodesString = configService.get<string>('REDIS_CLUSTER_NODES') || '127.0.0.1:6371';
          const rootNodes = nodesString.split(',').map((node) => {
            return { url: `redis://${node}` };
          });

          const store = await redisClusterStore({
            rootNodes,
            ttl: 300,
            defaults: {
              socket: {
                connectTimeout: 10000,
              },
            },
            nodeAddressMap: {
              '172.20.0.11:6379': { host: '127.0.0.1', port: 6371 },
              '172.20.0.12:6379': { host: '127.0.0.1', port: 6372 },
              '172.20.0.13:6379': { host: '127.0.0.1', port: 6373 },
              '172.20.0.14:6379': { host: '127.0.0.1', port: 6374 },
              '172.20.0.15:6379': { host: '127.0.0.1', port: 6375 },
              '172.20.0.16:6379': { host: '127.0.0.1', port: 6376 },
            },
          });

          // 에러 리스너 추가: 노드 다운 시 프로세스 종료 방지
          store.client.on('error', (err) => {
            console.error('Cache Cluster Error:', err.message);
          });

          return { store };
        }

        const host = configService.get<string>('REDIS_HOST') || '127.0.0.1';
        const port = configService.get<number>('REDIS_PORT') || 6379;

        const store = await redisStore({
          url: `redis://${host}:${port}`,
          ttl: 300,
          socket: {
            connectTimeout: 10000,
          },
        });

        // 에러 리스너 추가
        store.client.on('error', (err) => {
          console.error('Cache Redis Error:', err.message);
        });

        return { store };
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
export class AppModule { }
