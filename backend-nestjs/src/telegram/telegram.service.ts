import { Injectable, OnModuleInit, OnModuleDestroy, OnApplicationBootstrap } from '@nestjs/common';
import { Telegraf, Markup } from 'telegraf';
import { PrismaService } from '../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule'; 

@Injectable()
export class TelegramService implements OnModuleInit, OnApplicationBootstrap, OnModuleDestroy {
  private bot: Telegraf;

  constructor(private prisma: PrismaService) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    console.log('TOKEN =', token);
    console.log('TOKEN LENGTH =', token?.length);
    if (!token) {
      console.error('❌ [Telegram] LỖI: Chưa cấu hình TELEGRAM_BOT_TOKEN trong file .env!');
    }
    this.bot = new Telegraf(token || '');
  }

  // Chạy đầu tiên: Đăng ký các sự kiện bấm nút từ sinh viên và lệnh hệ thống
  onModuleInit() {
    this.registerCallbacks();
  }

  // Chạy sau cùng: Khi server đã start xong hoàn toàn, tiến hành kết nối mạng
  async onApplicationBootstrap() {
    try {
      const me = await this.bot.telegram.getMe();

      console.log(`🤖 Bot @${me.username} đang khởi động...`);

      this.bot.launch()
        .then(() => {
          console.log('✅ Telegram Bot đã kích hoạt thành công!');
        })
        .catch(err => {
          console.error('❌ Lỗi launch bot:', err);
        });

    } catch (err) {
      console.error('❌ Bootstrap Telegram lỗi:', err);
    }
  }

  // Tự động ngắt kết nối khi lưu code (Hot reload) hoặc tắt server để tránh lỗi 409
  async onModuleDestroy() {
    console.log('🛑 Đang ngắt kết nối Telegram Bot cũ...');
    try {
      this.bot.stop(); 
      console.log('✅ Đã ngắt kết nối Bot cũ thành công.');
    } catch (err) {
      console.error('Lỗi khi dừng Bot:', err.message);
    }
  }

  // ==================== CÁC HÀM NGHIỆP VỤ GỬI TIN NHẮN ====================

  // 1. Gửi thông báo duyệt mượn sách thành công
  async sendBorrowApprovedNotification(telegramId: string, info: { studentName: string, bookTitle: string, dueDate: string }) {
    if (!telegramId) return;
    const message = `📚 <b>THÔNG BÁO MƯỢN SÁCH THÀNH CÔNG</b>\n\n` +
                    `Chào <b>${info.studentName}</b>,\n` +
                    `Yêu cầu mượn cuốn sách: <b>${info.bookTitle}</b> đã được Admin phê duyệt.\n` +
                    `📅 <b>Hạn trả sách:</b> ${info.dueDate}\n\n` +
                    `<i>Vui lòng giữ gìn sách cẩn thận và trả đúng hạn nhé!</i>`;
    try {
       this.bot.telegram.sendMessage(telegramId, message, { parse_mode: 'HTML' });
    } catch (err) { console.error('Lỗi gửi Telegram mượn sách:', err.message); }
  }

  // 2. Gửi thông báo duyệt đặt trước sách kèm nút bấm xác nhận nhận sách
  async sendReservationApprovedNotification(telegramId: string, reservationId: number, info: { studentName: string, bookTitle: string }) {
    if (!telegramId) return;
    const message = `🎉 <b>THÔNG BÁO: SÁCH ĐẶT TRƯỚC ĐÃ SẴN SÀNG</b>\n\n` +
                    `Chào <b>${info.studentName}</b>,\n` +
                    `Cuốn sách <b>${info.bookTitle}</b> bạn đặt trước hiện đã có sẵn trên kệ.\n` +
                    `⏰ Bạn có <b>3 ngày</b> để đến thư viện nhận sách.\n\n` +
                    `Sau khi nhận sách từ thủ thư, hãy bấm nút <b>Xác nhận</b> dưới đây để hoàn tất đơn giữ chỗ:`;

    try {
       this.bot.telegram.sendMessage(telegramId, message, {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
          Markup.button.callback('✅ Xác nhận đã nhận sách', `confirm_receive_${reservationId}`)
        ])
      });
    } catch (err) { console.error('Lỗi gửi Telegram Đặt trước:', err.message); }
  }

  // 🔥 THÊM MỚI: Hàm xử lý quét tự động thông báo dựa trên khoảng cách ngày (Không sửa DB)
  // Hàm này sẽ được gọi từ file Cron Service của bạn định kỳ
  //@Cron('*/2 * * * *')
  @Cron('0 8 * * *') // Đúng 08:00:00 sáng mỗi ngày hệ thống mới quét và nhắn tin
 async checkAndSendDeadlineNotifications() {
    console.log('⏰ [Cron Job] Đang quét thời hạn mượn sách, xử lý vi phạm và đồng bộ Telegram...');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Đưa mốc hôm nay về đầu ngày để tính toán khoảng cách

    // 1. Kéo tất cả các đơn mượn chưa trả về xử lý
    const activeBorrows = await this.prisma.borrowLog.findMany({
      where: { returnDate: null },
      include: { user: true, book: true }
    });

    for (const log of activeBorrows) {
      if (!log.user?.telegramId) continue;

      const dueDate = new Date(log.dueDate);
      dueDate.setHours(0, 0, 0, 0);

      // Tính toán khoảng cách chênh lệch ngày (Hạn trả - Ngày hôm nay)
      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      try {
        // ==================== KỊCH BẢN 1: NHẮC TRẢ TRƯỚC 3 NGÀY ====================
        if (diffDays === 3) {
          await this.bot.telegram.sendMessage(
            log.user.telegramId,
            `📚 <b>NHẮC NHỞ: HẠN TRẢ SÁCH (CÒN 3 NGÀY)</b>\n\n` +
            `Chào bạn, tài liệu <b>"${log.book?.title}"</b> mượn tại hệ thống sẽ hết hạn sau 3 ngày nữa.\n` +
            `📅 Hạn trả quy định: <b>${new Date(log.dueDate).toLocaleDateString('vi-VN')}</b>\n\n` +
            `<i>Bạn vui lòng sắp xếp thời gian đến thư viện trả sách hoặc thực hiện gia hạn trực tuyến để không phát sinh lỗi nhé!</i>`,
            { parse_mode: 'HTML' }
          );
          console.log(`✅ [Cron 3 Days] Đã gửi nhắc nhở thành công cho đơn mượn ID: ${log.id}`);
        }

        // ==================== KỊCH BẢN 2: XỬ LÝ QUÁ HẠN (LẬP BIÊN BẢN PHẠT & BẢO QUA TELEGRAM) ====================
        // diffDays < 0 nghĩa là đã quá hạn (Ví dụ: -1 là trễ 1 ngày, -2 là trễ 2 ngày)
        else if (diffDays < 0) {
          const overdueDays = Math.abs(diffDays); // Lấy số ngày trễ tuyệt đối (1, 2, 3...)
          const fineAmount = overdueDays * 5000;  // Tính tiền phạt lũy tiến 5.000đ/ngày

          // Kiểm tra xem đơn mượn này đã từng bị lập biên bản phạt trễ hạn trong DB chưa
          const existingViolation = await this.prisma.violation.findFirst({
            where: {
              borrowLogId: log.id,
              type: 'LATE_RETURN', // Hoặc ViolationType.LATE_RETURN tùy theo enum của bạn
            },
          });

          // Tình huống 2.1: Ngày đầu tiên bị quá hạn (Chưa có biên bản phạt trong DB)
          if (!existingViolation) {
            await this.prisma.$transaction([
              // Tạo biên bản phạt mới trong DB
              this.prisma.violation.create({
                data: {
                  userId: log.userId,
                  borrowLogId: log.id,
                  type: 'LATE_RETURN',
                  description: `Quá hạn trả sách "${log.book?.title}" ${overdueDays} ngày.`,
                  fineAmount: fineAmount,
                },
              }),
              // Đổi trạng thái đơn mượn sang quá hạn
              this.prisma.borrowLog.update({
                where: { id: log.id },
                data: { status: 'OVERDUE' }
              })
            ]);

            // BẮN TELEGRAM CẢNH BÁO: Vì chưa có biên bản phạt, luồng này CHỈ chạy 1 lần duy nhất vào ngày đầu tiên trễ hạn
            await this.bot.telegram.sendMessage(
              log.user.telegramId,
              `⚠️ <b>CẢNH BÁO: TÀI LIỆU QUÁ HẠN TRẢ</b>\n\n` +
              `Chào <b>${log.user.name}</b>, cuốn sách <b>"${log.book?.title}"</b> của bạn đã quá hạn quy định.\n` +
              `📅 Hạn trả ban đầu: ${new Date(log.dueDate).toLocaleDateString('vi-VN')}\n\n` +
              `🔴 Hệ thống bắt đầu tính phí phạt lũy tiến. Vui lòng mang sách trả ngay cho thủ thư Thủy Lợi để xử lý biên bản!`,
              { parse_mode: 'HTML' }
            );
            console.log(`🚨 [Cron Overdue] Đã lập phạt mới và bắn Telegram báo trễ hạn cho đơn ID: ${log.id}`);
          } 
          
          // Tình huống 2.2: Đã trễ hạn từ các ngày trước (Biên bản đã có, sinh viên chưa trả sách)
          else if (!existingViolation.isPaid) {
            // Chỉ cập nhật tăng tiền phạt lũy tiến trong DB, TUYỆT ĐỐI không bắn lại tin nhắn gây spam
            await this.prisma.violation.update({
              where: { id: existingViolation.id },
              data: {
                fineAmount: fineAmount,
                description: `Quá hạn trả sách "${log.book?.title}" ${overdueDays} ngày.`,
              },
            });
            console.log(`🔄 [Cron Fine Update] Lũy tiến tiền phạt đơn ID ${log.id}: ${fineAmount}đ (Không spam Telegram)`);
          }
        }
      } catch (err) {
        console.error(`❌ Lỗi xử lý tự động cho đơn mượn ID ${log.id}:`, err.message);
      }
    }
  }

  // ==================== LẮNG NGHE SỰ KIỆN TỪ TELEGRAM ====================
  private registerCallbacks() {
    
    // 🔥 GIỮ NGUYÊN: Tự động bắt sự kiện bấm nút START từ Deep-Link trên Web để lưu ChatID
    this.bot.start(async (ctx) => {
      const chatId = ctx.chat.id;
      const payload = ctx.payload; // Bốc lấy chuỗi "user_X" truyền từ link Web (?start=user_X)

      console.log(`📡 [Telegram Bot] Nhận lệnh /start, ChatID: ${chatId}, Payload: ${payload}`);

      if (payload && payload.startsWith('user_')) {
        const userIdStr = payload.replace('user_', '').trim();
        const userId = parseInt(userIdStr);

        if (!isNaN(userId)) {
          try {
            // Đổ tự động số telegramChatId thẳng vào đúng bản ghi sinh viên trong Postgres
            await this.prisma.user.update({
              where: { id: userId },
              data: { telegramId: String(chatId) }
            });

            console.log(`✅ [Liên kết tự động] Thành công cho Sinh viên ID: ${userId} với ChatID: ${chatId}`);

            return ctx.replyWithHTML(
              `🎉 <b>LIÊN KẾT TÀI KHOẢN THÀNH CÔNG</b>\n\n` +
              `Hệ thống Thư viện ĐH Thủy Lợi đã đồng bộ thành công thiết bị của bạn.\n` +
              `🔔 Từ bây giờ, các thông báo duyệt đơn mượn sách hoặc đặt chỗ sẽ tự động gửi đến đây!`
            );
          } catch (dbError) {
            console.error('❌ Lỗi cập nhật database khi lưu ChatID:', dbError.message);
            return ctx.reply('⚠️ Hệ thống Thư viện đang bận, liên kết tài khoản chưa thành công.');
          }
        }
      }

      // Lời chào mặc định nếu sinh viên tự tìm kiếm tên bot để bấm Start thay vì đi từ Web
      ctx.replyWithHTML(
        `📚 <b>Chào mừng bạn đến với Thư viện ĐH Thủy Lợi!</b>\n\n` +
        `Để nhận được thông báo tự động từ thư viện, bạn vui lòng đăng nhập vào trang Web của trường và bấm nút <b>"Liên kết Telegram"</b> nhé!`
      );
    });

    // 3. GIỮ NGUYÊN: Lắp các sự kiện click nút bấm inline trên tin nhắn cũ của bạn
    this.bot.action(/^confirm_receive_(\d+)$/, async (ctx) => {
      const reservationId = parseInt(ctx.match[1]);

      try {
        const reservation = await this.prisma.reservation.findUnique({
          where: { id: reservationId },
          include: { book: true }
        });

        if (!reservation || reservation.status !== 'APPROVED') {
          return ctx.answerCbQuery('⚠️ Đơn hàng không hợp lệ hoặc đã xử lý trước đó!');
        }

        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 14); // Hạn mượn 14 ngày

        await this.prisma.$transaction([
          this.prisma.reservation.update({
            where: { id: reservationId },
            data: { status: 'COMPLETED' }
          }),
          this.prisma.borrowLog.create({
            data: {
              userId: reservation.userId,
              bookId: reservation.bookId,
              status: 'BORROWING',
              dueDate: dueDate
            }
          }),
          // Hành động 3: Giữ nguyên - Trừ đi 1 số lượng sách sẵn có trong kho (availableStock)
          this.prisma.book.update({
            where: { id: reservation.bookId },
            data: { 
              availableStock: {
                decrement: 1 
              } 
            }
          })
        ]);

        await ctx.editMessageText(`✅ <b>HỆ THỐNG ĐÃ GHI NHẬN</b>\n\nBạn đã xác nhận nhận cuốn sách <b>${reservation.book?.title}</b> thành công.\nChu trình mượn sách chính thức bắt đầu, hạn trả là 14 ngày sau.`, { parse_mode: 'HTML' });
        await ctx.answerCbQuery('Xác nhận thành công!');

      } catch (err) {
        console.error(err);
        await ctx.answerCbQuery('❌ Có lỗi xảy ra trong quá trình xử lý!');
      }
    });
  }
}