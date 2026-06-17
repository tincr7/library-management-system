import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';

@Injectable()
export class ReservationCronService {
  constructor(
    private prisma: PrismaService,
    private telegramService: TelegramService
  ) {}

  // Quét định kỳ (Ví dụ: chạy mỗi ngày lúc 00:00, ở đây để mỗi tiếng để test dễ)
  @Cron(CronExpression.EVERY_HOUR)
  async handleExpiredReservations() {
    const now = new Date();

    // 1. Tìm tất cả các đơn APPROVED đã quá hạn expiredAt
    const expiredReservations = await this.prisma.reservation.findMany({
      where: {
        status: 'APPROVED',
        expiredAt: { lt: now } // Nhỏ hơn thời gian hiện tại tức là đã quá 3 ngày
      },
      include: { book: true, user: true }
    });

    for (const res of expiredReservations) {
      // 2. Chuyển trạng thái đơn quá hạn thành CANCELLED
      await this.prisma.reservation.update({
        where: { id: res.id },
        data: { status: 'CANCELLED', note: 'Quá 3 ngày không đến nhận sách' }
      });

      // 3. QUẢN LÝ HÀNG ĐỢI: Tìm người tiếp theo đang đợi (PENDING) của cuốn sách này
      const nextInQueue = await this.prisma.reservation.findFirst({
        where: {
          bookId: res.bookId,
          status: 'PENDING'
        },
        orderBy: { reservedAt: 'asc' } // Ai đặt trước tiên lấy ra trước
      });

      if (nextInQueue) {
        // Tự động đôn người tiếp theo lên APPROVED
        const approvedAt = new Date();
        const expiredAt = new Date();
        expiredAt.setDate(expiredAt.getDate() + 3); // Cấp tiếp 3 ngày giữ chỗ

        await this.prisma.reservation.update({
          where: { id: nextInQueue.id },
          data: { status: 'APPROVED', approvedAt, expiredAt }
        });

        // Lấy thông tin đầy đủ để gửi Telegram cho người may mắn tiếp theo
        const nextUserRes = await this.prisma.reservation.findUnique({
          where: { id: nextInQueue.id },
          include: { user: true, book: true }
        });

        if (nextUserRes?.user?.telegramId) {
          // Gửi thông báo kèm nút bấm cho người tiếp theo
          this.telegramService.sendReservationApprovedNotification(
            nextUserRes.user.telegramId,
            nextUserRes.id,
            { studentName: nextUserRes.user.name, bookTitle: nextUserRes.book.title }
          );
        }
      }
    }
  }
}