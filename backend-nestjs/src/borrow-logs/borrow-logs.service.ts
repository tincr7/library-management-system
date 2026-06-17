import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';
import { CreateBorrowLogDto } from './dto/create-borrow-log.dto';
import { UpdateBorrowLogDto } from './dto/update-borrow-log.dto';

@Injectable()
export class BorrowLogsService {
  constructor(private prisma: PrismaService,
  private readonly telegramService: TelegramService,
  ) {}

  // 1. Tạo yêu cầu mượn sách mới (Mặc định ở trạng thái PENDING)
  async create(dto: CreateBorrowLogDto) {
    // Kiểm tra xem sách còn trên kệ không
    const book = await this.prisma.book.findUnique({ where: { id: dto.bookId } });
    if (!book) throw new NotFoundException('Không tìm thấy sách này!');
    if (book.availableStock <= 0) throw new BadRequestException('Sách này hiện tại đã hết trên kệ!');

    // Tính toán hạn trả mặc định (ví dụ: 14 ngày sau)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14);

    return this.prisma.borrowLog.create({
      data: {
        userId: Number(dto.userId),
        bookId: Number(dto.bookId),
        dueDate: dueDate,
        status: 'PENDING',
      },
      include: { user: true, book: true }
    });
  }

  // 2. Lấy toàn bộ danh sách đơn mượn kèm thông tin Sinh viên & Sách để hiển thị lên bảng Admin
  async findAll() {
    return this.prisma.borrowLog.findMany({
      include: {
        user: { select: { mssv: true, name: true, telegramId: true } },
        book: { select: { title: true, coverImage: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  // 3. Xử lý Duyệt mượn / Trả sách bằng cách cập nhật Trạng thái (Status)
async update(id: number, dto: UpdateBorrowLogDto) {
  const log = await this.prisma.borrowLog.findUnique({ where: { id } });
  if (!log) throw new NotFoundException('Không tìm thấy lịch sử mượn sách này!');

  const oldStatus = log.status;
  const newStatus = dto.status;

  // --- CASE 1: Duyệt cho mượn sách (PENDING -> BORROWING) ---
  if (newStatus === 'BORROWING' && oldStatus !== 'BORROWING') {
    const book = await this.prisma.book.findUnique({ where: { id: log.bookId } });
    
    // Kiểm tra xem sách có thực sự tồn tại trong DB không
    if (!book) throw new NotFoundException('Đầu sách liên kết không tồn tại!');
    
    if (book.availableStock <= 0) {
      throw new BadRequestException('Sách đã hết trên kệ, không thể duyệt mượn!');
    }
    
    // 1. Khấu trừ 1 cuốn trên kệ khả dụng
    await this.prisma.book.update({
      where: { id: log.bookId },
      data: { availableStock: book.availableStock - 1 }
    });

    // 2. CHÈN LỆNH GỬI TELEGRAM TẠI ĐÂY (Sau khi DB đã update thành công)
    // Lấy lại thông tin log đầy đủ kèm quan hệ user và book để lấy tên và telegramId
    const updatedLog = await this.prisma.borrowLog.findUnique({
      where: { id: log.id },
      include: { user: true, book: true }
    });
    
    // Nếu sinh viên có cấu hình telegramId thì tiến hành bắn thông báo
    if (updatedLog?.user?.telegramId) {
      // Vì hàm gửi tin nhắn là async (bất đồng bộ), bạn có thể dùng hoặc không dùng await.
      // Không dùng await sẽ giúp API phản hồi nhanh hơn cho Admin mà không phải đợi Telegram xử lý xong.
      this.telegramService.sendBorrowApprovedNotification(
        updatedLog.user.telegramId, 
        {
          studentName: updatedLog.user.name,
          bookTitle: updatedLog.book.title,
          // Định dạng ngày trả theo chuẩn Việt Nam DD/MM/YYYY
          dueDate: updatedLog.dueDate ? updatedLog.dueDate.toLocaleDateString('vi-VN') : '---'
        }
      ).catch(err => console.error('Lỗi gửi Telegram khi duyệt mượn:', err.message));
    }
  }

  // --- CASE 2: Sinh viên mang sách tới trả thành công (BORROWING -> RETURNED) ---
  let returnDate: Date | null = null;
  if (newStatus === 'RETURNED' && oldStatus !== 'RETURNED') {
    returnDate = new Date(); // Ghi nhận thời gian trả thực tế

    const book = await this.prisma.book.findUnique({ where: { id: log.bookId } });
    
    // THÊM DÒNG NÀY: Đảm bảo khi trả sách, đầu sách vẫn tồn tại trong hệ thống
    if (!book) throw new NotFoundException('Không tìm thấy đầu sách để hoàn lại kho!');

    // Hoàn trả lại 1 cuốn lên kệ khả dụng
    await this.prisma.book.update({
      where: { id: log.bookId },
      data: { availableStock: book.availableStock + 1 }
    });
  }

  // Tiến hành cập nhật trạng thái đơn mượn
  return this.prisma.borrowLog.update({
    where: { id },
    data: {
      status: newStatus,
      returnDate: returnDate ? returnDate : undefined
    },
    include: { user: true, book: true }
  });
}
}