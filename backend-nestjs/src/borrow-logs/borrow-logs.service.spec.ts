import { Test, TestingModule } from '@nestjs/testing';
import { BorrowLogsService } from './borrow-logs.service';

describe('BorrowLogsService', () => {
  let service: BorrowLogsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BorrowLogsService],
    }).compile();

    service = module.get<BorrowLogsService>(BorrowLogsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
