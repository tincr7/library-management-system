from fastapi import FastAPI, UploadFile, Form, File, HTTPException
import shutil
import os
from matcher import BookMatcher
from pydantic import BaseModel

class UpdateBookInfoInput(BaseModel):
    bookId: int
    title: str
    author: str

app = FastAPI(title="AI Book Cover Recognition Service")

# Định nghĩa đường dẫn file dữ liệu
excel_data_path = "./data/Books.xlsx"  # hoặc books-data.csv tùy dự án của bạn
covers_video_dir = "./data/books_covers"

# Khởi tạo đối tượng Matcher tổng
matcher = BookMatcher(excel_path=excel_data_path, covers_dir=covers_video_dir)

@app.post("/ai/update-book-info")
async def update_book_info(data: UpdateBookInfoInput): # Nhận dữ liệu dưới dạng JSON body chuẩn
    success = matcher.update_book_in_runtime(
        book_id=data.bookId, 
        title=data.title, 
        author=data.author
    )
    if success:
        return {"success": True, "message": "Cập nhật thông tin chữ sang AI thành công!"}
    raise HTTPException(status_code=500, detail="Cập nhật thông tin chữ thất bại.")

@app.delete("/ai/delete-book/{book_id}")
async def delete_book(book_id: int):
    success = matcher.remove_book_from_runtime(book_id=book_id)
    if success:
        return {"success": True, "message": f"Đã xóa đồng bộ sách ID {book_id} khỏi AI Engine!"}
    raise HTTPException(status_code=500, detail="Xóa đồng bộ sang AI Engine thất bại.")

@app.post("/ai/sync-new-book")
async def sync_new_book(
    bookId: int = Form(...),
    title: str = Form(...),
    author: str = Form(...),
    file: UploadFile = File(...)
):
    try:
        # Đọc file ảnh dưới dạng nhị phân
        file_bytes = await file.read()
        
        # Gọi hàm đồng bộ thời gian thực
        success = matcher.add_new_book_to_runtime(
            book_id=bookId,
            title=title,
            author=author,
            file_bytes=file_bytes,
            filename=file.filename
        )
        
        if success:
            return {"success": True, "message": f"AI Engine đã đồng bộ thành công sách ID {bookId}!"}
        else:
            raise HTTPException(status_code=500, detail="Trích xuất đặc trưng ảnh bìa mới thất bại.")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi đồng bộ AI: {str(e)}")

@app.post("/ai/predict-cover")
async def predict_cover(file: UploadFile = File(...)):
    # 1. Kiểm tra định dạng file gửi lên
    if not file.filename.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
        raise HTTPException(status_code=400, detail="Định dạng file ảnh không hợp lệ!")

    # 2. Tạo file tạm để lưu trữ ảnh chụp từ client gửi qua
    temp_file_path = f"temp_{file.filename}"
    try:
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # 3. Gọi hàm tổng để tìm kiếm danh sách Top 10 ứng viên
        result = matcher.find_book(temp_file_path)
        
        # 4. Trả kết quả (Mảng candidates chứa top 10) về cho NestJS Backend
        return result

    except Exception as e:
        print(f"❌ Lỗi xử lý tại AI Server: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi nội bộ AI Server: {str(e)}")
        
    finally:
        # 5. Luôn luôn dọn dẹp xóa file tạm sau khi dự đoán xong để tránh đầy ổ cứng
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)