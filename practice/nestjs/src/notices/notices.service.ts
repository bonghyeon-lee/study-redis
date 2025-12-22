import { Injectable, Inject } from '@nestjs/common';
import { CreateNoticeDto } from './dto/create-notice.dto';
import { UpdateNoticeDto } from './dto/update-notice.dto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class NoticesService {
  private notices = [
    { id: 1, title: 'Welcome', content: 'NestJS x Redis' },
    { id: 2, title: 'Level 1', content: 'Caching Basics' },
  ];

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async create(createNoticeDto: CreateNoticeDto) {
    const newNotice = {
      id: this.notices.length + 1,
      ...createNoticeDto,
    };
    this.notices.push(newNotice);

    // Invalidate Cache
    await this.cacheManager.del('/notices');

    return newNotice;
  }

  async findAll() {
    // Simulate DB Latency (e.g. 50ms)
    await new Promise((resolve) => setTimeout(resolve, 50));
    return this.notices;
  }

  findOne(id: number) {
    return `This action returns a #${id} notice`;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  update(id: number, _updateNoticeDto: UpdateNoticeDto) {
    return `This action updates a #${id} notice`;
  }

  remove(id: number) {
    return `This action removes a #${id} notice`;
  }
}
