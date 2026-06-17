import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RenewService {
  constructor(private readonly prisma: PrismaService) {}

  // 1. Chức năng: Xem lịch sử gia hạn (Dành cho trang Admin)
  async findAll() {
    return this.prisma.renewHistory.findMany({
      orderBy: { renewedAt: 'desc' },
      include: {
        borrowLog: {
          include: {
            user: {
              select: { id: true, name: true, mssv: true, role: true } // Xem thông tin ai đã gia hạn
            },
            book: {
              select: { id: true, title: true, author: true } // Xem gia hạn cho cuốn sách nào
            }
          }
        }
      }
    });
  }

  // 2. Chức năng: Sinh viên tự ấn gia hạn trên trang của mình
  async renewBook(borrowLogId: number, reason?: string) {
    // Tìm log mượn sách tương ứng
    const borrowLog = await this.prisma.borrowLog.findUnique({
      where: { id: borrowLogId },
      include: { book: true }
    });

    if (!borrowLog) {
      throw new NotFoundException('Không tìm thấy lượt mượn sách này!');
    }

    // Kiểm tra xem có đúng đang mượn không
    if (borrowLog.status !== 'BORROWING') {
      throw new BadRequestException('Sách không trong trạng thái đang mượn, không thể gia hạn!');
    }

    const today = new Date();

    // 🛑 ĐIỀU KIỆN 1: Chưa quá hạn (dueDate phải lớn hơn hoặc bằng thời gian hiện tại)
    if (new Date(borrowLog.dueDate) < today) {
      throw new BadRequestException('Sách đã quá hạn mượn, vui lòng đến thư viện nộp phạt và trả sách!');
    }

    // 🛑 ĐIỀU KIỆN 2: Chưa vượt số lần gia hạn (Ví dụ: tối đa 3 lần)
    const MAX_RENEW_LIMIT = 3;
    if (borrowLog.renewCount >= MAX_RENEW_LIMIT) {
      throw new BadRequestException(`Bạn đã đạt giới hạn gia hạn tối đa (${MAX_RENEW_LIMIT} lần) cho lượt mượn này!`);
    }

    // 🛑 ĐIỀU KIỆN 3: Không có người đặt trước (Trạng thái PENDING hoặc APPROVED của cuốn sách đó)
    const activeReservation = await this.prisma.reservation.findFirst({
      where: {
        bookId: borrowLog.bookId,
        status: { in: ['PENDING', 'APPROVED'] } // Khớp 100% với ReservationStatus Enum của bạn
      }
    });

    if (activeReservation) {
      throw new BadRequestException('Cuốn sách này đã có sinh viên khác đặt trước, hệ thống không cho phép gia hạn!');
    }

    // --- TIẾN HÀNH GIA HẠN ---
    const oldDueDate = new Date(borrowLog.dueDate);
    
    // Cộng thêm 7 ngày vào hạn cũ
    const newDueDate = new Date(borrowLog.dueDate);
    newDueDate.setDate(newDueDate.getDate() + 7);

    // Chạy transaction để đồng bộ mượt mà hai bảng
    return this.prisma.$transaction(async (tx) => {
      // Cập nhật BorrowLog gốc
      await tx.borrowLog.update({
        where: { id: borrowLogId },
        data: {
          dueDate: newDueDate,
          renewCount: { increment: 1 } // Tăng trường renewCount sẵn có của bạn lên +1
        }
      });

      // Tạo lịch sử lưu vết đúng theo các trường trong database của bạn
      return tx.renewHistory.create({
        data: {
          borrowLogId: borrowLogId,
          oldDueDate: oldDueDate,
          newDueDate: newDueDate,
          reason: reason || 'Sinh viên gia hạn trực tuyến.',
        },
        include: {
          borrowLog: {
            include: { book: true, user: true }
          }
        }
      });
    });
  }
}