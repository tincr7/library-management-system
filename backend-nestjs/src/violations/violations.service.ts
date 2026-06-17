import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ViolationType } from '@prisma/client';

@Injectable()
export class ViolationsService {
  constructor(private prisma: PrismaService) {}

  // 1. Chức năng: Tạo vi phạm thủ công (Dành cho Admin khi phát hiện hỏng/mất sách tại quầy)
  async createViolation(data: {
    userId: number;
    borrowLogId?: number;
    type: ViolationType;
    description?: string;
    fineAmount?: number;
  } = {} as any) { 
    
    // Kiểm tra an toàn dữ liệu đầu vào
    if (!data) {
      throw new BadRequestException('Dữ liệu gửi lên không hợp lệ!');
    }

    // Tự động áp mức phạt sàn nếu Admin không nhập số tiền cụ thể
    let calculatedFine = data.fineAmount || 0;
    
    if (!calculatedFine) {
      if (data.type === ViolationType.LOST_BOOK) calculatedFine = 150000;
      if (data.type === ViolationType.DAMAGED_BOOK) calculatedFine = 50000;
    }

    return this.prisma.violation.create({
      data: {
        userId: Number(data.userId), 
        borrowLogId: data.borrowLogId ? Number(data.borrowLogId) : null,
        type: data.type,
        description: data.description || '',
        fineAmount: calculatedFine,
        isPaid: false,
      },
      include: { user: true }
    });
  }

  // 💡 CHÚ Ý: Hàm tự động @Cron cũ (autoCreateLateReturnViolations) đã được loại bỏ 
  // để nhường chỗ cho logic tích hợp "2 trong 1" chạy bên TelegramService.

  // 2. Chức năng: Đánh dấu đã thanh toán tiền phạt (Xử lý khi sinh viên đóng tiền tại quầy)
  async markAsPaid(violationId: number) {
    const violation = await this.prisma.violation.findUnique({ where: { id: violationId } });
    if (!violation) throw new NotFoundException('Không tìm thấy bản ghi vi phạm!');

    return this.prisma.violation.update({
      where: { id: violationId },
      data: { isPaid: true },
    });
  }

  // 3. Chức năng: Xem lịch sử vi phạm (Dành cho Admin Dashboard để quản lý toàn bộ trường)
  async findAllViolations() {
    return this.prisma.violation.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, mssv: true } }, 
        borrowLog: { include: { book: true } }
      }
    });
  }

  // 4. Chức năng: Xem lịch sử vi phạm của riêng 1 sinh viên (API cấp data cho trang cá nhân Sinh viên)
  async findUserViolations(userId: number) {
    return this.prisma.violation.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { borrowLog: { include: { book: true } } }
    });
  }
}