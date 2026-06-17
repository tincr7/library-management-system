import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { TelegramService } from '../telegram/telegram.service';

@Injectable()
export class ReservationsService {
  constructor(private prisma: PrismaService,
    private readonly telegramService: TelegramService,
  ) {}

  //Sinh viên đăng ký đặt trước sách
  async create(dto: CreateReservationDto) {
    // 1. Kiểm tra xem sách có tồn tại trong hệ thống không
    const book = await this.prisma.book.findUnique({ where: { id: dto.bookId } });
    if (!book) {
      throw new NotFoundException('Cuốn sách bạn muốn đặt trước không tồn tại trên hệ thống!');
    }

    // 2. Kiểm tra xem người dùng (Sinh viên) có tồn tại không
    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) {
      throw new NotFoundException('Không tìm thấy thông tin tài khoản sinh viên này!');
    }

    // 3. Tiến hành tạo bản ghi đặt chỗ với trạng thái mặc định là PENDING
    return this.prisma.reservation.create({
      data: {
        userId: Number(dto.userId),
        bookId: Number(dto.bookId),
        status: 'PENDING', // Luôn là CHỜ DUYỆT khi mới đăng ký
        note: dto.note || null,
      },
      include: {
        book: { select: { title: true, availableStock: true } },
        user: { select: { name: true, mssv: true } }
      }
    });
  }

  // 1. Xem danh sách đặt trước (Tự động xếp theo thứ tự ưu tiên thời gian đặt)
  async findAll() {
    return this.prisma.reservation.findMany({
      include: {
        user: { select: { mssv: true, name: true, telegramId: true } },
        book: { select: { title: true, availableStock: true, totalStock: true } },
      },
      orderBy: {
        reservedAt: 'asc', // Luôn ưu tiên người đặt trước lên đầu danh sách
      },
    });
  }

 // 2. Duyệt hoặc Hủy đặt trước sách
  async update(id: number, dto: UpdateReservationDto) {
    const reservation = await this.prisma.reservation.findUnique({ where: { id } });
    if (!reservation) throw new NotFoundException('Không tìm thấy đơn đặt trước này!');

    const newStatus = dto.status;
    let approvedAt: Date | null = null;
    let expiredAt: Date | null = null;

    if (newStatus === 'APPROVED') {
      approvedAt = new Date();
      
      // Tính hạn giữ chỗ: 3 ngày kể từ ngày duyệt, sinh viên phải đến thư viện lấy sách
      expiredAt = new Date();
      expiredAt.setDate(expiredAt.getDate() + 3);
    }

    // 1. Tiến hành cập nhật trạng thái đơn đặt trước trong Database
    const updatedReservation = await this.prisma.reservation.update({
      where: { id },
      data: {
        status: newStatus,
        approvedAt,
        expiredAt,
      },
      include: { user: true, book: true },
    });

    // 2. CHÈN LỆNH GỬI TELEGRAM TẠI ĐÂY (Sau khi DB update thành công và trạng thái là APPROVED)
    if (newStatus === 'APPROVED' && updatedReservation?.user?.telegramId) {
      this.telegramService.sendReservationApprovedNotification(
        updatedReservation.user.telegramId,
        updatedReservation.id, // Truyền ID đơn để Bot làm callback data cho nút bấm
        {
          studentName: updatedReservation.user.name,
          bookTitle: updatedReservation.book?.title || 'Sách chưa rõ tên'
        }
      ).catch(err => console.error('Lỗi gửi Telegram khi duyệt đặt trước:', err.message));
    }

    return updatedReservation;
  }
}