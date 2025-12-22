import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { NoticesService } from './notices.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

describe('NoticesService', () => {
  let service: NoticesService;
  let cacheManager: Cache;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NoticesService,
        {
          provide: CACHE_MANAGER,
          useValue: {
            del: vi.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<NoticesService>(NoticesService);
    cacheManager = module.get<Cache>(CACHE_MANAGER);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a notice and invalidate cache', async () => {
      const createNoticeDto = { title: 'Test', content: 'Content' };
      const delSpy = vi.spyOn(cacheManager, 'del');

      await service.create(createNoticeDto);

      expect(delSpy).toHaveBeenCalledWith('/notices');
      // Verify other logic (e.g. DB save) if implemented
    });
  });
});
