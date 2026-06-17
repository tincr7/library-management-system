import { Injectable, OnModuleInit, InternalServerErrorException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

interface KnowledgeDoc {
  fileName: string;
  content: string;
  paragraphs: string[];
}

@Injectable()
export class RagService implements OnModuleInit {
  private knowledgeBase: KnowledgeDoc[] = [];

  // Tự động chạy ngay khi ứng dụng NestJS khởi động thành công
  onModuleInit() {
    this.loadKnowledgeToMemory();
  }

  private loadKnowledgeToMemory() {
    const filenames = ['library_rules.txt', 'borrowing_guide.txt', 'faq.txt'];
    // Thư mục chứa file text nằm ở gốc dự án backend
    const baseDir = path.join(process.cwd(), 'knowledge');

    try {
      // Nếu thư mục chưa tồn tại, tạo tạm để không bị sập ứng dụng
      if (!fs.existsSync(baseDir)) {
        fs.mkdirSync(baseDir);
      }

      this.knowledgeBase = filenames.map((filename) => {
        const filePath = path.join(baseDir, filename);
        let content = '';

        if (fs.existsSync(filePath)) {
          content = fs.readFileSync(filePath, 'utf-8');
        } else {
          console.warn(`⚠️ [RAG System] Không tìm thấy file: ${filePath}. Vui lòng bổ sung nội dung!`);
        }

        // Tách nhỏ nội dung thành các đoạn văn dựa trên 2 dấu xuống dòng liên tiếp
        const paragraphs = content
          .split(/\n\s*\n/)
          .map((p) => p.trim())
          .filter((p) => p.length > 0);

        return {
          fileName: filename,
          content,
          paragraphs,
        };
      });

      console.log(`✅ [RAG Memory] Đã nạp thành công 3 tài liệu vào RAM hệ thống.`);
    } catch (error) {
      console.error('❌ [RAG Memory] Lỗi đọc file tri thức:', error.message);
      throw new InternalServerErrorException('Không thể khởi tạo bộ nhớ tri thức RAG.');
    }
  }

  /**
   * Thuật toán Simple RAG: Tách từ khóa viết thường, đếm tần suất xuất hiện trên từng đoạn văn
   */
  searchKnowledge(query: string): string {
    if (!query) return '';

    // 1. Chuẩn hóa câu hỏi: Chuyển về lowercase và xử lý lỗi gõ sai dấu cơ bản của chữ "định"
    let cleanQuery = query.toLowerCase().trim();
    if (cleanQuery.includes('quy dịnh')) {
      cleanQuery = cleanQuery.replace('quy dịnh', 'quy định');
    }

    // Tách từ khóa để dò tìm
    const keywords = cleanQuery
      .split(/[\s,.\-!?]+/)
      .filter((word) => word.length > 1 && !['của', 'là', 'các', 'cho'].includes(word)); 

    if (keywords.length === 0) return '';

    const matchedParagraphs: { text: string; score: number }[] = [];

    // 2. Duyệt qua toàn bộ kho RAM tri thức
    for (const doc of this.knowledgeBase) {
      for (const paragraph of doc.paragraphs) {
        const lowerParagraph = paragraph.toLowerCase();
        let score = 0;

        // TÌM KIẾM THEO CỤM TỪ (Ưu tiên cực cao)
        // Nếu sinh viên hỏi chung chung về "quy định", bốc luôn toàn bộ các đoạn có nhãn quy định
        if (cleanQuery.includes('quy định') || cleanQuery.includes('nội quy')) {
          if (lowerParagraph.includes('quy định') || lowerParagraph.includes('mượn tối đa') || lowerParagraph.includes('thời hạn')) {
            score += 10; // Tăng điểm mạnh để bốc trọn vẹn quy chế mượn/trả
          }
        }

        // TÌM KIẾM THEO TỪ KHÓA LẺ
        keywords.forEach((keyword) => {
          if (lowerParagraph.includes(keyword)) {
            score += 2;
          }
        });

        // Thưởng điểm nếu khớp chính xác cụm từ liên tục
        if (lowerParagraph.includes(cleanQuery)) {
          score += 15;
        }

        if (score > 0) {
          matchedParagraphs.push({ text: paragraph, score });
        }
      }
    }

    // 3. Sắp xếp điểm số giảm dần
    matchedParagraphs.sort((a, b) => b.score - a.score);

    // 🔥 NÂNG CẤP: Lấy hẳn Top 5 đoạn văn liên quan nhất để Gemini có đủ dữ liệu bao quát toàn bộ quy chế
    const topParagraphs = matchedParagraphs.slice(0, 5).map((p) => p.text);

    return topParagraphs.join('\n\n---\n\n');
  }
}