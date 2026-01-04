import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { Cluster } from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

export const RedisProvider: Provider = {
  provide: REDIS_CLIENT,
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => {
    const isCluster = configService.get<string>('REDIS_CLUSTER_ENABLED') === 'true';

    let client: Redis | Cluster;

    if (isCluster) {
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
    } else {
      client = new Redis({
        host: configService.get<string>('REDIS_HOST') || '127.0.0.1',
        port: configService.get<number>('REDIS_PORT') || 6379,
      });
    }

    client.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    return client;
  },
};
