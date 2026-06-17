import { Injectable, InternalServerErrorException } from '@nestjs/common';
import OpenAI from 'openai';
import { RagService } from './rag.service';
import { RecommendationService } from '../recommendation/recommendation.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GeminiService {
  private openai: OpenAI;
  // 🔥 ĐƯỜNG DẪN MODEL CHUẨN OPENROUTER: Bản 2.5 Flash hoàn toàn miễn phí
  private model = 'qwen/qwen3-8b'; 

  constructor(
    private ragService: RagService,
    private prisma: PrismaService,
    private recommendationService: RecommendationService,
  ) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.error('⚠️ [OpenRouter] Chưa cấu hình OPENROUTER_API_KEY trong file .env!');
    }

    // Khởi tạo OpenAI Client trỏ về Gateway của OpenRouter
    this.openai = new OpenAI({
      apiKey: apiKey,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': 'http://localhost:3000', // Định danh ứng dụng (Bắt buộc theo chuẩn OpenRouter)
        'X-Title': 'Smart Library Assistant',
      }
    });
  }

  /**
   * 1. Định nghĩa cấu trúc Tools theo chuẩn OpenAI / OpenRouter
   */
  private getLibraryTools(): OpenAI.Chat.ChatCompletionTool[] {
    return [
      {
        type: 'function',
        function: {
          name: 'getCurrentBorrowBooks',
          description: 'Lấy danh sách các cuốn sách sinh viên hiện tại đang mượn của thư viện.',
          parameters: { type: 'object', properties: {} },
        }
      },
      {
        type: 'function',
        function: {
          name: 'getBorrowHistory',
          description: 'Lấy toàn bộ lịch sử mượn trả tài liệu từ trước tới nay của sinh viên.',
          parameters: { type: 'object', properties: {} },
        }
      },
      {
        type: 'function',
        function: {
          name: 'getViolations',
          description: 'Kiểm tra xem sinh viên có dính biên bản vi phạm nào do trả trễ hạn hay không.',
          parameters: { type: 'object', properties: {} },
        }
      },
      {
        type: 'function',
        function: {
          name: 'getReservations',
          description: 'Lấy danh sách các đầu sách sinh viên đang nằm trong danh sách chờ xếp hàng đặt trước.',
          parameters: { type: 'object', properties: {} },
        }
      },
      {
        type: 'function',
        function: {
          name: 'recommendBooks',
          description: 'Lấy danh sách tối đa 10 cuốn sách được cá nhân hóa gợi ý cho sinh viên dựa trên thuật toán Hybrid (BorrowLog + ImageSearchLog). Chỉ gọi khi sinh viên xin gợi ý sách chung chung theo sở thích cá nhân.',
          parameters: { type: 'object', properties: {} },
        }
      },
      {
        type: "function",
        function: {
          name: "searchBooksByKeyword",
          description: "Tìm kiếm danh sách sách trong thư viện dựa trên từ khóa. Từ khóa có thể là tên cuốn sách, tên tác giả (ví dụ: Nguyễn Nhật Ánh, Edward Fishman) hoặc tên thể loại/chuyên ngành (ví dụ: Công nghệ thông tin, Kinh tế, Giáo trình).",
          parameters: {
            type: "object",
            properties: {
              keyword: {
                type: "string",
                description: "Từ khóa chính xác hoặc thể loại, tác giả cần tìm kiếm."
              }
            },
            required: ["keyword"]
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'renewBook',
          description: 'Thực hiện gia hạn thêm thời gian mượn cho một cuốn sách cụ thể đang mượn.',
          parameters: {
            type: 'object',
            properties: {
              bookId: { type: 'integer', description: 'ID của cuốn sách cần được gia hạn' },
            },
            required: ['bookId'],
          },
        }
      }
    ];
  }

  /**
   * 2. Hàm xử lý tin nhắn chat chính thức qua OpenRouter Proxy
   */
  async handleUserMessage(userId: number, userMessage: string): Promise<string> {
    try {
      const ragContext = this.ragService.searchKnowledge(userMessage);

      const systemInstruction = `
Bạn là AI Library Assistant - Trợ lý thư viện thông minh CHỈ thuộc về trường Đại học Thủy Lợi.
Nhiệm vụ của bạn là hỗ trợ sinh viên Thủy Lợi tra cứu thông tin cá nhân và giải đáp quy chế thư viện Thủy Lợi một cách lịch sự, ngắn gọn.

[QUY TẮC RÀNG BUỘC KIỂM SOÁT THÔNG TIN - TUYỆT ĐỐI TUÂN THỦ]
1. Bạn CHỈ ĐƯỢC PHÉP trả lời các câu hỏi liên quan đến Đại học Thủy Lợi hoặc các quy định có sẵn trong bộ Tri thức RAG được cung cấp dưới đây.
2. KHÔNG ĐƯỢC XÀO NẤU: Nếu sinh viên hỏi về quy định, sách vở, hoặc thông tin của bất kỳ trường học, thư viện nào khác (Ví dụ: Bách Khoa, Kinh tế Quốc dân, Quốc gia...) hoặc câu hỏi ngoài luồng không có trong RAG, bạn phải từ chối thẳng thắn và lịch sự, TUYỆT ĐỐI không được lấy dữ liệu của Thủy Lợi để gán ghép cho trường khác.
3. Đối với các yêu cầu cá nhân (Sách đang mượn, lịch sử, vi phạm, đặt trước, gia hạn, đề xem): BẮT BUỘC phải gọi các function thích hợp.
4. Nếu sinh viên yêu cầu bạn làm những việc vượt quá thẩm quyền hệ thống như "mở khóa tài khoản ngầm", "sửa đổi dữ liệu quá hạn hệ thống", bạn phải từ chối lịch sự và hướng dẫn họ liên hệ trực tiếp quầy thủ thư để xử lý bằng quy trình chuẩn.

[TRI THỨC RAG HỆ THỐNG CUNG CẤP]
${ragContext || 'Không có dữ liệu tri thức phù hợp cho câu hỏi này trong file văn bản.'}
`;

      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: userMessage }
      ];

      // Gọi OpenRouter lần 1 để phân loại Intent câu hỏi
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: messages,
        tools: this.getLibraryTools(),
        temperature: 0.1, // Giảm bớt độ sáng tạo xuống 0.1 để phân tích Tool chuẩn xác, không bị bốc đồng
      });

      const responseMessage = response.choices[0].message;
      const toolCalls = responseMessage.tool_calls;

      // TRƯỜNG HỢP 1: Nếu AI không cần gọi hàm (Hỏi quy chế, hỏi bậy bạ, nhờ hack tài khoản ngầm...)
      if (!toolCalls || toolCalls.length === 0) {
        return responseMessage.content || 'Tôi chưa tìm thấy câu trả lời phù hợp trong dữ liệu tri thức.';
      }

      // TRƯỜNG HỢP 2: Nếu AI kích hoạt gọi Function Calling
      if (toolCalls && toolCalls.length > 0) {
        const toolCall = toolCalls[0];
        
        if (!('function' in toolCall)) {
          return 'Hệ thống phát hiện lệnh gọi công cụ không hợp lệ.';
        }

        const toolName = toolCall.function.name;
        const toolArgs = JSON.parse(toolCall.function.arguments || '{}');

        console.log(`📡 [OpenRouter Action] AI kích hoạt Tool: ${toolName}`);

        // Chạy nghiệp vụ bốc dữ liệu từ Postgres
        const toolResult = await this.executeLibraryTool(toolName, userId, toolArgs);

        // Nạp lịch sử gọi hàm vào mạch hội thoại theo đúng cấu trúc tiêu chuẩn
        messages.push(responseMessage); 
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify({ result: toolResult }),
        });

        // 🔥 BIẾN CỜ XÁC ĐỊNH: Chỉ áp dụng luật BOOK_DATA khi gọi hàm tìm kiếm sách hoặc gợi ý sách
        const isBookRenderTool = toolName === 'searchBooksByKeyword' || toolName === 'recommendBooks';

        if (isBookRenderTool) {
          messages.push({
            role: 'system',
            content: `
[QUY TẮC PHẢN HỒI KẾT QUẢ SÁCH TỐI CAO]
1. Bạn CHỈ ĐƯỢC PHÉP đưa ra một câu chào/dẫn dắt ngắn gọn (Ví dụ: "Dưới đây là các cuốn sách liên quan đến từ khóa bạn tìm kiếm tại thư viện Đại học Thủy Lợi:").
2. TUYỆT ĐỐI KHÔNG ĐƯỢC liệt kê lại danh sách sách bằng văn bản thô theo kiểu numbered list (1., 2., 3.) hay viết lại tên tác giả, link ảnh ra màn hình chat chính.
3. BẮT BUỘC phải đóng gói toàn bộ danh sách sách lấy từ 'tool' thành cấu trúc JSON chuẩn và đặt duy nhất trong cặp thẻ ở cuối câu trả lời:
<BOOK_DATA>[{"id":..., "title":..., "author":..., "coverImage":...}]</BOOK_DATA>
4. Giữ nguyên chính xác các trường dữ liệu thực tế nhận được, không tự chế. Nếu mảng sách trả về từ tool là rỗng [], hãy báo: "Thư viện hiện không có tài liệu phù hợp" và TUYỆT ĐỐI KHÔNG in thẻ <BOOK_DATA>.
`
          });
        } else {
          // Các luồng tra cứu cá nhân (mượn sách, vi phạm, gia hạn): Ép AI tổng hợp dạng text thô rõ ràng, CẤM TRẢ VỀ THẺ BOOK_DATA
          messages.push({
            role: 'system',
            content: `
[QUY TẮC TRẢ LỜI THÔNG TIN CÁ NHÂN]
Dựa vào dữ liệu từ 'tool' vừa phản hồi, hãy giải đáp trực tiếp, cụ thể và chính xác câu hỏi của sinh viên.
- Nếu sinh viên hỏi về sách đang mượn, hãy liệt kê rõ tên sách và hạn trả.
- Nếu hỏi về vi phạm/phạt, hãy thống kê rõ các lỗi trễ hạn nếu có từ DB.
- Tuyệt đối KHÔNG sử dụng cấu trúc thẻ <BOOK_DATA> trong luồng trả lời này.
`
          });
        }

        // Gọi OpenRouter lần 2 để tổng hợp câu trả lời
        const finalResponse = await this.openai.chat.completions.create({
          model: this.model,
          messages: messages,
          temperature: 0.2,
        });

        return finalResponse.choices[0].message.content || 'Hệ thống đã thực hiện lệnh nhưng không thể xuất câu trả lời.';
      }

      return 'Hệ thống trợ lý ảo không thể xử lý yêu cầu.';
    } catch (error) {
      console.error('❌ [OpenRouter Error] Lỗi xử lý hội thoại:', error.message);
      throw new InternalServerErrorException('Hệ thống AI OpenRouter đang bận, vui lòng thử lại sau!');
    }
  }

  /**
   * 3. Lõi tương tác Database Postgres (Giữ nguyên logic chuẩn của Tín)
   */
  private async executeLibraryTool(toolName: string, userId: number, args: any): Promise<any> {
    switch (toolName) {
      case 'getCurrentBorrowBooks':
        return await this.prisma.borrowLog.findMany({
          where: { userId, returnDate: null },
          include: { book: true },
        });

      case 'getBorrowHistory':
        return await this.prisma.borrowLog.findMany({
          where: { userId },
          include: { book: true },
          orderBy: { createdAt: 'desc' },
        });

      case 'getViolations':
        return await this.prisma.violation.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        });

      case 'getReservations':
        return await this.prisma.reservation.findMany({
          where: { userId },
          include: { book: true },
        });

      case 'recommendBooks': {
        const recResult = await this.recommendationService.getHybridRecommendations(userId);
        return recResult.books.map(book => ({
          id: book.id,
          title: book.title,
          author: book.author,
          coverImage: book.coverImage || 'https://via.placeholder.com/150',
        }));
      }

      case 'searchBooksByKeyword': {
        const keyword = String(args.keyword || '').trim();
        if (!keyword) return [];
        
        console.log(`📡 [AI Tool Call] Đang tìm kiếm nâng cao với từ khóa: "${keyword}"`);

        const matchedBooks = await this.prisma.book.findMany({
          where: {
            OR: [
              { title: { contains: keyword, mode: 'insensitive' } },
              { author: { contains: keyword, mode: 'insensitive' } },
              {
                category: {
                  name: { contains: keyword, mode: 'insensitive' }
                }
              }
            ],
            availableStock: { gte: 0 }
          },
          take: 6,
          include: { category: true }
        });
        
        console.log(`📦 [DB Result] Tìm thấy ${matchedBooks.length} cuốn sách thực tế.`);

        return matchedBooks.map(book => ({
          id: book.id,
          title: book.title,
          author: book.author,
          category: book.category?.name || 'Tài liệu',
          coverImage: book.coverImage || 'https://via.placeholder.com/150',
        }));
      }

      case 'renewBook':
        const bookId = Number(args.bookId);
        try {
          const existingLog = await this.prisma.borrowLog.findFirst({
            where: { userId, bookId, returnDate: null },
          });

          if (!existingLog) {
            return { success: false, message: 'Bạn không có đơn mượn cuốn sách này hiện tại để gia hạn!' };
          }

          const currentDueDate = new Date(existingLog.dueDate);
          currentDueDate.setDate(currentDueDate.getDate() + 7);

          await this.prisma.borrowLog.update({
            where: { id: existingLog.id },
            data: { dueDate: currentDueDate },
          });

          return { success: true, message: `Gia hạn thành công sách ID ${bookId}! Hạn trả mới là: ${currentDueDate.toLocaleDateString('vi-VN')}` };
        } catch (err) {
          return { success: false, message: `Lỗi thao tác gia hạn: ${err.message}` };
        }

      default:
        return { message: 'Công cụ hệ thống chưa được tích hợp.' };
    }
  }
}