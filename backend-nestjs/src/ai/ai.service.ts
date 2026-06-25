import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';
import FormData = require('form-data');

@Injectable()
export class AiService {
  constructor(private prisma: PrismaService) {}

  async scanBookCover(file: Express.Multer.File, userIdStr?: string) {
    if (!file) {
      throw new HttpException('Vui lòng cung cấp hình ảnh bìa sách chụp!', HttpStatus.BAD_REQUEST);
    }

    // Tạm thời lấy tên file làm imagePath log, nếu Frontend chụp từ webcam có thể là blob/image.png
    const imagePathLog = file.originalname || 'camera_shot.png';
    const parsedUserId = userIdStr ? parseInt(userIdStr, 10) : null;

    let matchedBookId: number | null = null;
    let maxConfidence: number | null = null;
    let firstBookTitle: string | null = null;

    try {
      const formData = new FormData();
      formData.append('file', file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype,
      });

      //const aiServerUrl = 'http://localhost:8000/ai/predict-cover';
      const aiServerUrl = 'http://library_ai:8000/ai/predict-cover';
      const aiResponse = await axios.post(aiServerUrl, formData, {
        headers: {
          ...formData.getHeaders(),
        },
        timeout: 60000,
      });

      const { success, matchMethod, candidates } = aiResponse.data;

      if (!success || !candidates || candidates.length === 0) {
        // 🔥 GHI LOG HỤT: AI chạy xong nhưng không nhận diện được sách nào
        await this.safeWriteSearchLog(parsedUserId, imagePathLog, null, null, 'AI không tìm thấy ứng viên khớp');
        
        throw new HttpException('Hệ thống AI không nhận diện được bìa cuốn sách này.', HttpStatus.NOT_FOUND);
      }

      // 1. Trích xuất mảng các ID của Top 10 cuốn sách từ AI trả về [62, 3, 105, ...]
      const candidateIds = candidates.map((c: any) => Number(c.bookId));

      // 2. Dùng toán tử "in" của Prisma để lấy toàn bộ thông tin của 10 cuốn sách từ Postgres
      const booksInDb = await this.prisma.book.findMany({
        where: {
          id: {
            in: candidateIds,
          },
        },
        include: {
          category: true, // Lấy kèm thể loại
        },
      });

      // 3. Tiến hành sắp xếp lại mảng sách trả về từ DB theo đúng thứ tự điểm số của AI từ cao xuống thấp
      const orderedBooks = candidates
        .map((candidate: any) => {
          const matchedBook = booksInDb.find((b) => b.id === Number(candidate.bookId));
          if (!matchedBook) return null;
          
          return {
            confidenceScore: candidate.confidenceScore, // Đính kèm điểm số AI trực tiếp vào từng cuốn sách
            ...matchedBook,
          };
        })
        .filter((item) => item !== null); // Lọc bỏ phần tử rỗng nếu có sai lệch

      // 4. 🔥 LẤY THÔNG TIN ỨNG VIÊN CAO NHẤT ĐỂ GHI LOG THÀNH CÔNG
      if (orderedBooks.length > 0) {
        matchedBookId = orderedBooks[0].id;
        maxConfidence = orderedBooks[0].confidenceScore || null;
        firstBookTitle = orderedBooks[0].title || null;
      }

      // Ghi log tìm kiếm thành công vào DB
      await this.safeWriteSearchLog(parsedUserId, imagePathLog, matchedBookId, maxConfidence, firstBookTitle);

      return {
        success: true,
        message: `Đã trích xuất danh sách Top ${orderedBooks.length} ứng viên sách phù hợp nhất!`,
        matchMethod,
        totalCandidates: orderedBooks.length,
        books: orderedBooks, // Mảng chứa đầy đủ thông tin sách đã xếp hạng xịn sò
      };

    } catch (error) {
      // 🔥 GHI LOG LỖI: Hệ thống nghẽn mạch hoặc FastAPI sập, vẫn lưu lại vết ảnh lỗi để kiểm tra
      if (!(error instanceof HttpException)) {
        await this.safeWriteSearchLog(parsedUserId, imagePathLog, null, null, `Lỗi hệ thống: ${error.message}`);
      }

      if (error.response?.data?.detail) {
        throw new HttpException(`Lỗi từ AI Engine: ${error.response.data.detail}`, HttpStatus.BAD_REQUEST);
      }
      throw error;
    }
  }

  /**
   * 🔥 HÀM PHỤ TRỢ: Đảm bảo ghi log an toàn, không làm sập luồng tìm sách của sinh viên nếu DB gặp sự cố
   */
  private async safeWriteSearchLog(
    userId: number | null,
    imagePath: string,
    resultBookId: number | null,
    confidence: number | null,
    searchText: string | null,
  ) {
    try {
      await this.prisma.imageSearchLog.create({
        data: {
          userId,
          imagePath,
          resultBookId,
          confidence: confidence ? parseFloat(Number(confidence).toFixed(4)) : null, // Giữ 4 chữ số thập phân cho đẹp
          searchText: searchText ? (searchText.length > 255 ? searchText.substring(0, 250) + '...' : searchText) : null,
        },
      });
      console.log(`📝 [ImageSearchLog] Ghi vết thành công: User -> ${userId}, Book -> ${resultBookId}, Score -> ${confidence}`);
    } catch (dbErr) {
      console.error('⚠️ [ImageSearchLog] Lỗi ngầm khi lưu log tìm kiếm ảnh:', dbErr.message);
    }
  }
}