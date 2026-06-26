import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import FormData = require('form-data');

@Injectable()
export class BooksService {
  constructor(private prisma: PrismaService) {}

 // 1. Thêm mới một đầu sách kèm đồng bộ AI thời gian thực
  async create(createBookDto: CreateBookDto, file?: Express.Multer.File) {
    const { categoryId, stock, ...rest } = createBookDto;

    // 1. Lưu sạch sẽ vào database Postgres trước để lấy ID tự động tăng
    const newBook = await this.prisma.book.create({
      data: {
        ...rest,
        totalStock: stock ? Number(stock) : 1,
        availableStock: stock ? Number(stock) : 1, 
        categoryId: categoryId ? Number(categoryId) : null,
      },
      include: {
        category: true, 
      },
    });

    console.log(`📌 [NestJS DB] Đã lưu sách thành công vào Postgres với ID: ${newBook.id}`);

    // 2. 🚀 BẮN WEBHOOK ĐỒNG BỘ SANG AI ENGINE (FASTAPI)
    // Tín chú ý: Key nhận file từ Swagger NestJS phải trùng khớp với biến 'file' ở đây
    if (file) {
      try {
        // Khởi tạo FormData chuẩn tương thích với Axios
        const FormData = require('form-data');
        const formData = new FormData();
        
        // Đóng gói dữ liệu khớp 100% với các tham số nhận của FastAPI (main.py)
        formData.append('bookId', String(newBook.id)); // Khớp với bookId: int = Form(...)
        formData.append('title', newBook.title);       // Khớp với title: str = Form(...)
        formData.append('author', newBook.author || 'Chưa rõ tác giả'); // Khớp with author: str = Form(...)
        
        // Đóng gói file nhị phân kèm filename và mimetype chuẩn cấu trúc multipart
        formData.append('file', file.buffer, {
          filename: file.originalname,
          contentType: file.mimetype,
        });

        console.log(`📡 [NestJS Sync] Đang gửi request đồng bộ sách ID ${newBook.id} sang FastAPI...`);

        // Thực hiện bắn sang cổng 8000 của Python
        //const response = await axios.post('http://localhost:8000/ai/sync-new-book', formData, {
        const response = await axios.post('http://library_ai:8000/ai/sync-new-book', formData, {  
          headers: { 
            ...formData.getHeaders() // Ép bắt buộc lấy header multipart kèm boundary xịn của form-data
          },
          timeout: 15000, // Chờ tối đa 15 giây cho OpenCV tính toán
        });
        
        console.log(`✅ [NestJS Sync] Phản hồi từ FastAPI:`, response.data);
      } catch (aiSyncError) {
        console.error('❌ [NestJS Sync Error] Lỗi nghẽn mạch gọi sang Python:', aiSyncError.message);
        if (aiSyncError.response) {
          // Dòng này sẽ lôi toàn bộ lý do FastAPI từ chối (Ví dụ lỗi 422 chi tiết trường nào thiếu)
          console.error('📋 Chi tiết lỗi từ FastAPI trả về:', JSON.stringify(aiSyncError.response.data));
        }
      }
    } else {
      // Nếu dòng này lòi ra, nghĩa là ô chọn ảnh trên Swagger NestJS đang bị gửi lên rỗng (undefined)
      console.log(`⚠️ [NestJS Sync] Không tìm thấy file ảnh bìa truyền xuống Service -> Bỏ qua đồng bộ AI.`);
    }

    return newBook;
  }

  // 2. Lấy toàn bộ danh sách đầu sách
  async findAll() {
    return this.prisma.book.findMany({
      include: {
        category: true,
      },
      orderBy: { 
        createdAt: 'desc' 
      },
    });
  }

  // 3. Lấy thông tin chi tiết một cuốn sách theo ID
  async findOne(id: number) {
    const book = await this.prisma.book.findUnique({
      where: { id },
      include: {
        category: true,
      },
    });
    
    if (!book) {
      throw new NotFoundException(`Không tìm thấy đầu sách có ID bằng ${id}`);
    }
    return book;
  }

  /// 4. Cập nhật thông tin sách (Sửa)
  async update(id: number, updateBookDto: UpdateBookDto, file?: Express.Multer.File) {
    // 🔥 SỬA TẠI ĐÂY: Thêm 'file' vào để bóc tách loại bỏ nó ra khỏi biến 'rest'
    const { categoryId, stock, file: unusedFile, ...rest } = updateBookDto as any;

    const currentBook = await this.prisma.book.findUnique({ where: { id } });
    if (!currentBook) {
      throw new NotFoundException(`Không tìm thấy đầu sách có ID bằng ${id} để cập nhật`);
    }

    // Lúc này biến 'rest' đã hoàn toàn sạch sẽ, không còn chứa thuộc tính 'file' nữa
    const dataUpdate: any = { ...rest };

    if (stock !== undefined) {
      const parsedStock = Number(stock);
      const diff = parsedStock - currentBook.totalStock; 
      
      dataUpdate.totalStock = parsedStock;
      dataUpdate.availableStock = Math.max(0, currentBook.availableStock + diff);
    }

    if (categoryId !== undefined) {
      dataUpdate.categoryId = categoryId ? Number(categoryId) : null;
    }

    // Lệnh thực hiện cập nhật lúc này sẽ chạy mượt mà 100%
    const updatedBook = await this.prisma.book.update({
      where: { id },
      data: dataUpdate,
      include: {
        category: true,
      },
    });

    // 🚀 ĐỒNG BỘ SỬA SANG AI:
    if (file) {
      // Kịch bản A: Admin có tải lên file ảnh bìa mới -> Ghi đè file ảnh và tính toán lại ORB
      try {
        const formData = new FormData();
        formData.append('bookId', updatedBook.id);
        formData.append('title', updatedBook.title);
        formData.append('author', updatedBook.author || 'Chưa rõ tác giả');
        formData.append('file', file.buffer, {
          filename: file.originalname,
          contentType: file.mimetype,
        });

        //await axios.post('http://localhost:8000/ai/sync-new-book', formData, {
        await axios.post('http://library_ai:8000/ai/sync-new-book', formData, {
          headers: { ...formData.getHeaders() },
          timeout: 15000,
        });
        console.log(`🔄 [AI Sync] Đã cập nhật đè ảnh bìa và thông tin cho sách ID ${updatedBook.id}!`);
      } catch (err) {
        console.error('⚠️ Lỗi cập nhật ảnh bìa sang FastAPI:', err.message);
      }
    } else {
      // 🎯 KỊCH BẢN B: Admin chỉ sửa thông tin chữ (KHÔNG đổi ảnh bìa)
      try {
        // 🔥 Gửi đối tượng JSON thuần qua Body thay vì dùng FormData
        const payload = {
          bookId: updatedBook.id,
          title: updatedBook.title,
          author: updatedBook.author || 'Chưa rõ tác giả',
        };

        //await axios.post('http://localhost:8000/ai/update-book-info', payload, {
        await axios.post('http://library_ai:8000/ai/update-book-info', payload, {  
          headers: { 'Content-Type': 'application/json' }, // Định dạng JSON
          timeout: 10000,
        });
        console.log(`🔄 [AI Sync] Đã đồng bộ thông tin chữ mới cho sách ID ${updatedBook.id}`);
      } catch (err) {
        console.error('⚠️ Lỗi cập nhật thông tin chữ sang FastAPI:', err.message);
      }
    }

    return updatedBook;
  }

  // 5. Xóa đầu sách ra khỏi hệ thống (Xóa)
  async remove(id: number) {
    const book = await this.prisma.book.findUnique({ where: { id } });
    if (!book) {
      throw new NotFoundException(`Không tìm thấy đầu sách có ID bằng ${id} để xóa`);
    }

    // Tiến hành xóa bản ghi trong Postgres trước
    const deletedBook = await this.prisma.book.delete({
      where: { id },
    });

    // 🚀 ĐỒNG BỘ XÓA SANG AI: Bắn tín hiệu DELETE sang để Python dọn dẹp folder và Excel
    try {
      //await axios.delete(`http://localhost:8000/ai/delete-book/${id}`, {
      await axios.delete(`http://library_ai:8000/ai/delete-book/${id}`, {  
        timeout: 10000,
      });
      console.log(`🗑️ [AI Sync] Đã bắn lệnh xóa sạch dữ liệu sách ID ${id} sang AI Service thành công!`);
    } catch (aiDeleteError) {
      console.error(`⚠️ Lỗi không thể đồng bộ lệnh xóa sách ID ${id} sang FastAPI:`, aiDeleteError.message);
    }

    return deletedBook;
  }

  //Đồng bộ bìa sách từ thư mục books_covers
  async autoMigrationCoversToCloudinary() {
    // Đường dẫn trỏ thẳng vào thư mục chứa ảnh bìa (Đặt theo ID sách) trên VPS
    const coversDir = path.join(process.cwd(), '..', 'ai-service', 'data', 'books_covers');
    const cloudName = 'dbupojkeb';
    const uploadPreset = 'ml_default';

    try {
      // 1. Đọc danh sách file ảnh trong thư mục
      const files = fs.readdirSync(coversDir);
      console.log(`Bắt đầu xử lý quét ${files.length} file ảnh...`);
      
      let successCount = 0;

      for (const fileName of files) {
        // Tách lấy ID từ tên file (Ví dụ: "225.webp" -> 225)
        const bookIdStr = path.parse(fileName).name;
        const bookId = parseInt(bookIdStr, 10);

        if (isNaN(bookId)) continue;

        // 2. Kiểm tra xem cuốn sách có ID này có thực sự nằm trong DB không
        const bookExists = await this.prisma.book.findUnique({ where: { id: bookId } });
        if (!bookExists) {
          console.log(`⚠️ Bỏ qua file ${fileName} vì ID ${bookId} không tồn tại trong DB`);
          continue;
        }

        const filePath = path.join(coversDir, fileName);
        
        // 3. Chuyển ảnh thành Data URI (Base64) để bắn API thuần cho Cloudinary nuốt
        const fileBase64 = fs.readFileSync(filePath, { encoding: 'base64' });
        const extension = path.extname(fileName).replace('.', '').toLowerCase();
        // Xử lý chuẩn MIME-type cho file ảnh (.webp, .jpg, .png...)
        const mimeType = extension === 'jpg' || extension === 'jpeg' ? 'jpeg' : extension;
        const fileDataUri = `data:image/${mimeType};base64,${fileBase64}`;

        console.log(`🚀 Đang đẩy ảnh của Sách ID ${bookId} lên Cloudinary...`);

      const response = await axios.post(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        file: fileDataUri,
        upload_preset: uploadPreset,
        // 💡 Mẹo nhỏ: Bỏ public_id cấu hình cứng đi, để Cloudinary tự sinh mã băm ngẫu nhiên 
        // giống hệt như lúc Tín dùng giao diện Up Unsigned để đồng bộ tuyệt đối cấu trúc URL!
      });

      // Kiểm tra xem URL trả về có phải là HTTPS chưa, nếu là http thì ép sang https
      let finalSecureUrl = response.data.secure_url;
      if (finalSecureUrl.startsWith('http://')) {
        finalSecureUrl = finalSecureUrl.replace('http://', 'https://');
      }

      // Cập nhật chuỗi URL sạch sẽ này vào đúng Database
      await this.prisma.book.update({
        where: { id: bookId },
        data: { coverImage: finalSecureUrl },
      });

      console.log(` Đã đồng bộ thành công Sách ID ${bookId} -> ${finalSecureUrl}`);
        successCount++;
      }

      return { 
        status: 'Success', 
        message: `Đã hoàn thành upload và cập nhật link Cloudinary cho ${successCount} cuốn sách!` 
      };

    } catch (error) {
      console.error('Lỗi trong quá trình chạy Migration:', error?.response?.data || error.message);
      throw error;
    }
  }
}