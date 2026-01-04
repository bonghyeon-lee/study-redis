import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { Cluster } from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

export const RedisProvider: Provider = {
  provide: REDIS_CLIENT,
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => {
    const redisMode = configService.get<string>('REDIS_MODE') || 'standalone';

    let client: Redis | Cluster;

    if (redisMode === 'cluster') {
      const nodesString = configService.get<string>('REDIS_CLUSTER_NODES') || '127.0.0.1:6371';
      const nodes = nodesString.split(',').map((node) => {
        const [host, port] = node.split(':');
        return { host, port: parseInt(port, 10) };
      });

      client = new Redis.Cluster(nodes, {
        redisOptions: {
          showFriendlyErrorStack: true,
        },
        natMap: {
          '172.20.0.11:6379': { host: '127.0.0.1', port: 6371 },
          '172.20.0.12:6379': { host: '127.0.0.1', port: 6372 },
          '172.20.0.13:6379': { host: '127.0.0.1', port: 6373 },
          '172.20.0.14:6379': { host: '127.0.0.1', port: 6374 },
          '172.20.0.15:6379': { host: '127.0.0.1', port: 6375 },
          '172.20.0.16:6379': { host: '127.0.0.1', port: 6376 },
        },
      });
    } else if (redisMode === 'sentinel') {
      const name = configService.get<string>('REDIS_SENTINEL_NAME') || 'mymaster';
      const nodesString = configService.get<string>('REDIS_SENTINEL_NODES') || '127.0.0.1:26379';
      const sentinels = nodesString.split(',').map((node) => {
        const [host, port] = node.split(':');
        return { host, port: parseInt(port, 10) };
      });

      client = new Redis({
        sentinels,
        name,
        sentinelRetryStrategy: (times) => Math.min(times * 200, 2000),
        natMap: {
          '172.19.0.2:6379': { host: '127.0.0.1', port: 6379 },
          '172.19.0.3:6379': { host: '127.0.0.1', port: 6380 },
          '172.19.0.4:6379': { host: '127.0.0.1', port: 6381 },
        },
      });
    } else {
      client = new Redis({
        host: configService.get<string>('REDIS_HOST') || '127.0.0.1',
        port: configService.get<number>('REDIS_PORT') || 6379,
        retryStrategy: (times) => Math.min(times * 200, 2000),
      });
    }

    let lastError = '';
    let lastErrorTime = 0;
    const THROTTLE_MS = 5000;

    client.on('error', (err) => {
      const now = Date.now();
      const msg = err.message || err.toString() || 'Unknown Redis Error';
      if (msg !== lastError || now - lastErrorTime > THROTTLE_MS) {
        console.error('Redis Client Error:', msg);
        lastError = msg;
        lastErrorTime = now;
      }
    });

    return client;
  },
};
