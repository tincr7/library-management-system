import { Module } from '@nestjs/common';
import { BorrowLogsService } from './borrow-logs.service';
import { BorrowLogsController } from './borrow-logs.controller';

@Module({
  controllers: [BorrowLogsController],
  providers: [BorrowLogsService],
})
export class BorrowLogsModule {}
