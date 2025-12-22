import { Provider } from '@nestjs/common';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

export const RedisProvider: Provider = {
  provide: REDIS_CLIENT,
  useFactory: () => {
    const client = new Redis({
      host: 'localhost',
      port: 6379,
    });

    client.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    return client;
  },
};
