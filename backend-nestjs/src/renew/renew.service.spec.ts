import { Test, TestingModule } from '@nestjs/testing';
import { RenewService } from './renew.service';

describe('RenewService', () => {
  let service: RenewService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RenewService],
    }).compile();

    service = module.get<RenewService>(RenewService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
