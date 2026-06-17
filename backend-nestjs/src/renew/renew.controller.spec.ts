import { Test, TestingModule } from '@nestjs/testing';
import { RenewController } from './renew.controller';

describe('RenewController', () => {
  let controller: RenewController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RenewController],
    }).compile();

    controller = module.get<RenewController>(RenewController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
