import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RecommendationService {
  constructor(private prisma: PrismaService) {}

  async getHybridRecommendations(userId: number) {
    // Kiểm tra user có tồn tại không
    const userExists = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!userExists) {
      throw new HttpException('Không tìm thấy tài liệu của sinh viên này!', HttpStatus.NOT_FOUND);
    }

    // 🌟 BƯỚC 1: Lấy toàn bộ lịch sử mượn sách (BorrowLog) của user để bốc categoryId
    const borrowLogs = await this.prisma.borrowLog.findMany({
      where: { userId: userId },
      select: {
        bookId: true,
        book: {
          select: { id: true, categoryId: true }
        }
      }
    });

    // 🌟 BƯỚC 2: Lấy toàn bộ lịch sử tìm kiếm bằng ảnh (ImageSearchLog) của user
    const imageSearchLogs = await this.prisma.imageSearchLog.findMany({
      where: { 
        userId: userId,
        resultBookId: { not: null } // Chỉ lấy những lượt AI nhận diện ra sách thành công
      },
      select: {
        resultBookId: true,
        resultBook: {
          select: { id: true, categoryId: true }
        }
      }
    });

    // Gom mảng ID các sách user đã từng tương tác để tý nữa loại bỏ (Bước 6)
    const borrowedBookIds = borrowLogs.map(log => log.bookId);
    const searchedBookIds = imageSearchLogs.map(log => log.resultBookId as number);
    const interactedBookIds = Array.from(new Set([...borrowedBookIds, ...searchedBookIds]));

    // 🌟 BƯỚC 3: Tính toán trọng số điểm cho từng Category (70% Borrow - 30% Image Search)
    const categoryScores: Record<number, number> = {};

    // Duyệt qua lịch sử mượn (Trọng số 0.7)
    borrowLogs.forEach(log => {
      if (log.book?.categoryId) {
        const catId = log.book.categoryId;
        categoryScores[catId] = (categoryScores[catId] || 0) + 1 * 0.7;
      }
    });

    // Duyệt qua lịch sử tìm ảnh (Trọng số 0.3)
    imageSearchLogs.forEach(log => {
      if (log.resultBook?.categoryId) {
        const catId = log.resultBook.categoryId;
        categoryScores[catId] = (categoryScores[catId] || 0) + 1 * 0.3;
      }
    });

    // Nếu user hoàn toàn mới, chưa từng mượn hay tìm ảnh -> Gợi ý sách mới ngẫu nhiên
    const hasScores = Object.keys(categoryScores).length > 0;
    if (!hasScores) {
      const defaultBooks = await this.prisma.book.findMany({
        take: 30, // Bốc hẳn 30 cuốn mới nhất ra RAM
        orderBy: { id: 'desc' },
        include: { category: true }
      });
      
      // 🔥 Xáo trộn ngẫu nhiên 30 cuốn này rồi cắt lấy 10 cuốn để mỗi lần F5 là ra sách khác nhau
      const shuffledDefault = defaultBooks.sort(() => Math.random() - 0.5);
      return {
        success: true,
        matchMethod: "NEW_ARRIVALS",
        message: "Sinh viên mới chưa có lịch sử, gợi ý tài liệu đổi mới liên tục!",
        books: shuffledDefault.slice(0, 10)
      };
    }

    // 🌟 BƯỚC 4: Sắp xếp danh mục Category theo điểm giảm dần
    const sortedCategories = Object.entries(categoryScores)
      .map(([categoryId, score]) => ({ categoryId: Number(categoryId), score }))
      .sort((a, b) => b.score - a.score);

    // Mảng chứa các ID danh mục có điểm cao nhất để ưu tiên bốc sách trước
    const preferredCategoryIds = sortedCategories.map(c => c.categoryId);

    // 🌟 BƯỚC 5 & 6 & 7: Lấy sách thuộc category điểm cao, loại bỏ sách đã/đang mượn
    const recommendedBooks = await this.prisma.book.findMany({
      where: {
        categoryId: { in: preferredCategoryIds }, 
        id: { notIn: interactedBookIds },         
        availableStock: { gte: 0 }                 
      },
      include: {
        category: true
      }
    });

    // 🔥 CẢI TIẾN THUẬT TOÁN KHÔNG DÙNG DB: Xáo trộn ngẫu nhiên nội bộ các sách trong CÙNG danh mục
    // Cách này giúp giữ đúng quy luật: Category điểm cao vẫn xếp trước, nhưng thứ tự các cuốn sách bên trong Category đó sẽ bị đảo lộn ngẫu nhiên mỗi lần gọi API.
    const orderedRecommendedBooks = recommendedBooks.sort((a, b) => {
      const scoreA = categoryScores[a.categoryId || 0] || 0;
      const scoreB = categoryScores[b.categoryId || 0] || 0;

      // Nếu hai cuốn sách thuộc 2 danh mục có điểm khác nhau -> Nhóm điểm cao hơn xếp trước
      if (scoreB !== scoreA) {
        return scoreB - scoreA;
      }
      
      // 🔥 MẤU CHỐT: Nếu hai cuốn sách cùng thuộc 1 danh mục (hoặc danh mục bằng điểm) -> Thổi xúc xắc ngẫu nhiên 50/50 để đảo vị trí
      return Math.random() - 0.5;
    });

    // Cắt lấy tối đa 10 cuốn sách sáng giá nhất sau khi đã xáo trộn trên RAM
    const finalBooks = orderedRecommendedBooks.slice(0, 10);

    return {
      success: true,
      matchMethod: "HYBRID_RECOMMENDATION",
      message: `Đã tính toán gợi ý dựa trên ${borrowLogs.length} lượt mượn và ${imageSearchLogs.length} lượt quét ảnh! (Danh sách đã được làm mới ngẫu nhiên ngầm)`,
      targetCategories: sortedCategories, 
      books: finalBooks
    };
  }
}