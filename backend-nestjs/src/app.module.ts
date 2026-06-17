import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { BooksModule } from './books/books.module';
import { BorrowLogsModule } from './borrow-logs/borrow-logs.module';
import { ReservationsModule } from './reservations/reservations.module';
import { TelegramModule } from './telegram/telegram.module';
import { ViolationsModule } from './violations/violations.module';
import { RenewModule } from './renew/renew.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AiModule } from './ai/ai.module';
import { RecommendationModule } from './recommendation/recommendation.module';
import { ChatModule } from './chat/chat.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Để sử dụng biến môi trường ở mọi nơi mà không cần import lại
    }),
    ScheduleModule.forRoot(),
    TelegramModule,
    ChatModule,
    AiModule,
    RecommendationModule,
    PrismaModule,
    UsersModule,
    AuthModule,
    CategoriesModule,
    BooksModule,
    BorrowLogsModule,
    ReservationsModule,
    ViolationsModule,
    RenewModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
