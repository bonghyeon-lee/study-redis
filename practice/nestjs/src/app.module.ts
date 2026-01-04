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
        const redisMode = configService.get<string>('REDIS_MODE') || 'standalone';

        try {
          if (redisMode === 'cluster') {
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
                  reconnectStrategy: (retries) => Math.min(retries * 200, 2000),
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

            let lastClusterError = '';
            let lastClusterErrorTime = 0;
            const THROTTLE_MS = 5000;

            store.client.on('error', (err) => {
              const now = Date.now();
              const msg = err.message || err.toString() || 'Unknown Cluster Error';
              if (msg !== lastClusterError || now - lastClusterErrorTime > THROTTLE_MS) {
                console.error('Cache Cluster Error:', msg);
                lastClusterError = msg;
                lastClusterErrorTime = now;
              }
            });

            return { store };
          }

          if (redisMode === 'sentinel') {
            const name = configService.get<string>('REDIS_SENTINEL_NAME') || 'mymaster';
            const nodesString = configService.get<string>('REDIS_SENTINEL_NODES') || '127.0.0.1:26379';
            const addresses = nodesString.split(',');

            const store = await redisStore({
              sentinels: {
                name,
                addresses,
              },
              ttl: 300,
              socket: {
                connectTimeout: 10000,
                reconnectStrategy: (retries) => Math.min(retries * 200, 2000),
              },
            } as any);

            let lastSentinelError = '';
            let lastSentinelErrorTime = 0;
            const THROTTLE_MS = 5000;

            store.client.on('error', (err) => {
              const now = Date.now();
              const msg = err.message || err.toString() || 'Unknown Sentinel Error';
              if (msg !== lastSentinelError || now - lastSentinelErrorTime > THROTTLE_MS) {
                console.error('Cache Sentinel Error:', msg);
                lastSentinelError = msg;
                lastSentinelErrorTime = now;
              }
            });

            return { store };
          }

          const host = configService.get<string>('REDIS_HOST') || '127.0.0.1';
          const port = configService.get<number>('REDIS_PORT') || 6379;

          const store = await redisStore({
            url: `redis://${host}:${port}`,
            ttl: 300,
            socket: {
              connectTimeout: 5000,
              reconnectStrategy: (retries) => Math.min(retries * 200, 2000),
            },
          });

          let lastCacheError = '';
          let lastCacheErrorTime = 0;
          const THROTTLE_MS = 5000;

          store.client.on('error', (err) => {
            const now = Date.now();
            const msg = err.message || err.toString() || 'Unknown Redis Error';
            if (msg !== lastCacheError || now - lastCacheErrorTime > THROTTLE_MS) {
              console.error('Cache Redis Error:', msg);
              lastCacheError = msg;
              lastCacheErrorTime = now;
            }
          });

          return { store };
        } catch (error) {
          console.error('Failed to connect to Redis, falling back to memory store.');
          console.error(error.message);
          return {
            ttl: 300,
          };
        }
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
