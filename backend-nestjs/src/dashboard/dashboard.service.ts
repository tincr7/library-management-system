import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BorrowStatus, ReservationStatus } from '@prisma/client';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardStats() {
    // Lấy thời gian hiện tại và đồng bộ mốc đầu ngày 00:00:00 để tính khoảng cách chuẩn xác
    const today = new Date();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // ==================== 1. THỐNG KÊ NHANH (CARDS) ====================
    const [totalBooks, totalStudents, borrowingBooks, overdueBooks] = await Promise.all([
      this.prisma.book.count(),
      this.prisma.user.count({ where: { role: 'STUDENT' } }),
      // Sách đang được mượn bao gồm cả đang trong hạn (BORROWING) và đã quá hạn (OVERDUE)
      this.prisma.borrowLog.count({ 
        where: { 
          status: { in: [BorrowStatus.BORROWING, 'OVERDUE' as BorrowStatus] },
          returnDate: null 
        } 
      }),
      // Sách quá hạn phạt
      this.prisma.borrowLog.count({
        where: {
          status: { in: [BorrowStatus.BORROWING, 'OVERDUE' as BorrowStatus] },
          returnDate: null,
          dueDate: { lt: today }, // Đã vượt qua thời hạn trả quy định
        },
      }),
    ]);

    // ==================== 2. BIỂU ĐỒ SỐ LƯỢT MƯỢN THEO THÁNG ====================
    const currentYear = today.getFullYear();
    const monthlyBorrowsRaw: any[] = await this.prisma.$queryRaw`
      SELECT TO_CHAR("borrowDate", 'MM') as month, COUNT(id)::int as count
      FROM borrow_logs
      WHERE EXTRACT(YEAR FROM "borrowDate") = ${currentYear}
      GROUP BY TO_CHAR("borrowDate", 'MM')
      ORDER BY month ASC
    `;

    const monthlyBorrows = Array.from({ length: 12 }, (_, i) => {
      const monthStr = String(i + 1).padStart(2, '0');
      const found = monthlyBorrowsRaw.find((d) => d.month === monthStr);
      return {
        month: `Tháng ${i + 1}`,
        count: found ? found.count : 0,
      };
    });

    // ==================== 3. BIỂU ĐỒ SÁCH THEO DANH MỤC ====================
    const categoriesWithBookCount = await this.prisma.category.findMany({
      include: {
        _count: {
          select: { books: true },
        },
      },
    });
    const categoryStats = categoriesWithBookCount.map((c) => ({
      categoryName: c.name,
      count: c._count.books,
    }));

    // ==================== 4. DANH SÁCH CẦN XỬ LÝ NGAY (URGENT TASKS) ====================
    
    // 4.1. Sách sắp đến hạn (Hạn trả nằm trong vòng 3 ngày tới)
    const threeDaysLater = new Date(startOfToday.getTime() + 3 * 24 * 60 * 60 * 1000);

    const upcomingRaw = await this.prisma.borrowLog.findMany({
      where: {
        status: BorrowStatus.BORROWING,
        returnDate: null,
        dueDate: { gte: today, lte: threeDaysLater },
      },
      include: { user: true, book: true },
      take: 5,
    });

    const upcomingReturns = upcomingRaw.map((log) => {
      const logDueDate = new Date(log.dueDate);
      logDueDate.setHours(0, 0, 0, 0);
      
      const diffTime = logDueDate.getTime() - startOfToday.getTime();
      const daysLeft = Math.round(diffTime / (1000 * 60 * 60 * 24));
      
      return {
        studentName: log.user?.name || 'Sinh viên',
        bookTitle: log.book?.title || 'Tài liệu',
        daysLeft: daysLeft >= 0 ? daysLeft : 0,
      };
    });

    // 4.2. 🔥 ĐÃ SỬA LỖI: Sách đã quá hạn thực tế (Bao sân cả trạng thái OVERDUE)
    const overdueRaw = await this.prisma.borrowLog.findMany({
      where: {
        status: { in: [BorrowStatus.BORROWING, 'OVERDUE' as BorrowStatus] },
        returnDate: null,
        dueDate: { lt: today },
      },
      include: { user: true, book: true },
      take: 5,
    });

    const overdueReturns = overdueRaw.map((log) => {
      const logDueDate = new Date(log.dueDate);
      logDueDate.setHours(0, 0, 0, 0);
      
      const diffTime = startOfToday.getTime() - logDueDate.getTime();
      const daysOverdue = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      return {
        studentName: log.user?.name || 'Sinh viên',
        bookTitle: log.book?.title || 'Tài liệu',
        daysOverdue: daysOverdue > 0 ? daysOverdue : 1, // Nếu bằng 0 thì chớm trễ tính là 1 ngày
      };
    });

    // 4.3. Yêu cầu mượn sách đang nằm trong hàng chờ duyệt (PENDING)
    const pendingBorrowsRaw = await this.prisma.borrowLog.findMany({
      where: { status: BorrowStatus.PENDING },
      include: { user: true, book: true },
      take: 5,
    });

    const pendingBorrows = pendingBorrowsRaw.map((log) => ({
      bookTitle: log.book?.title || 'Tài liệu',
      mssv: log.user?.mssv || 'N/A',
    }));

    // 4.4. Đặt trước chờ xử lý (Hàng chờ gối đầu của sách khi hết hàng trên kệ)
    const pendingReservationsRaw = await this.prisma.reservation.findMany({
      where: { status: ReservationStatus.PENDING },
      include: { book: true },
    });

    const reservationMap = new Map<string, number>();
    pendingReservationsRaw.forEach((res) => {
      const title = res.book?.title || 'Sách';
      reservationMap.set(title, (reservationMap.get(title) || 0) + 1);
    });

    const pendingReservations = Array.from(reservationMap.entries()).map(([title, count]) => ({
      bookTitle: title,
      waitingStudents: count,
    })).slice(0, 5);

    // ==================== TRẢ VỀ TOÀN BỘ OBJECT PHÙ HỢP FRONTEND ====================
    return {
      stats: {
        totalBooks,
        totalStudents,
        borrowingBooks,
        overdueBooks,
      },
      charts: {
        monthlyBorrows,
        categoryStats,
      },
      urgentTasks: {
        upcomingReturns,
        overdueReturns,
        pendingBorrows,
        pendingReservations,
      },
    };
  }
}