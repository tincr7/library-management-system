import { Module } from '@nestjs/common';
import { RenewController } from './renew.controller';
import { RenewService } from './renew.service';

@Module({
  controllers: [RenewController],
  providers: [RenewService]
})
export class RenewModule {}
