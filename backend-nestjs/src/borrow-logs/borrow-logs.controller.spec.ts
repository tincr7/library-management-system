import { Test, TestingModule } from '@nestjs/testing';
import { BorrowLogsController } from './borrow-logs.controller';
import { BorrowLogsService } from './borrow-logs.service';

describe('BorrowLogsController', () => {
  let controller: BorrowLogsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BorrowLogsController],
      providers: [BorrowLogsService],
    }).compile();

    controller = module.get<BorrowLogsController>(BorrowLogsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
