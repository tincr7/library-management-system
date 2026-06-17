import cv2
import pandas as pd
import numpy as np
from rapidfuzz import process, fuzz
from paddleocr import PaddleOCR
import os
import logging

os.environ['FLAGS_use_onednn'] = '0'
os.environ['DISABLE_PIR'] = '1'
logging.getLogger("ppocr").setLevel(logging.WARNING)

class BookMatcher:
    def __init__(self, excel_path, covers_dir):
        self.covers_dir = covers_dir
        self.excel_path = excel_path
        
        self.df = pd.read_excel(excel_path, engine='openpyxl') 
        self.book_titles = self.df['Title'].tolist()
        self.book_ids = self.df['STT'].tolist()
        
        # 🔥 CẬP NHẬT TẠI ĐÂY: Thêm tham số use_dilation=True hoặc mặc định để ép chạy mượt trên CPU
        self.ocr = PaddleOCR(use_angle_cls=True, lang='vi') 
        
        self.orb = cv2.ORB_create(nfeatures=2000)
        self.bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
        
        self.loaded_covers = {}
        self._precompute_orb_features()
        
        print("📥 Đang nạp sẵn bộ mô hình AI PaddleOCR...")
        try:
            for ext in ['.jpg', '.jpeg', '.png', '.JPG']:
                test_path = os.path.join(covers_dir, f"1{ext}")
                if os.path.exists(test_path):
                    # Chạy mồi ảnh thật
                    self.ocr.ocr(test_path)
                    break
            print("🚀 Bộ mô hình PaddleOCR đã sẵn sàng chiến đấu!")
        except Exception as ocr_init_err:
            print(f"⚠️ Cảnh báo khởi tạo OCR: {ocr_init_err}")

    def add_new_book_to_runtime(self, book_id, title, author, file_bytes, filename):
        """Hàm tự động lưu ảnh bìa và ghi đè/thêm sách vào file Excel Books.xlsx"""
        try:
            # 🔥 BƯỚC MỚI: Dọn dẹp sạch sẽ tất cả các ảnh cũ có đuôi khác (.jpg, .png, .jpeg, .webp) nếu có
            for ext_check in ['.jpg', '.png', '.jpeg', '.webp']:
                old_img_path = os.path.join(self.covers_dir, f"{book_id}{ext_check}")
                if os.path.exists(old_img_path):
                    os.remove(old_img_path)
                    print(f"🗑️ [AI Clean] Đã dọn dẹp file ảnh cũ trùng ID: {book_id}{ext_check}")

            # 1. Lưu ảnh bìa mới vào thư mục book_covers (Lúc này folder đã sạch bóng ảnh cũ của ID này)
            ext = os.path.splitext(filename)[1].lower() or '.jpg'
            new_image_name = f"{book_id}{ext}"
            new_image_path = os.path.join(self.covers_dir, new_image_name)
            
            with open(new_image_path, "wb") as f:
                f.write(file_bytes)
                
            # 2. Đọc file Excel hiện tại lên để kiểm tra xử lý dữ liệu
            current_df = pd.read_excel(self.excel_path, engine='openpyxl')
            
            # Kiểm tra xem ID sách đã tồn tại trong file Excel chưa
            mask = current_df['STT'] == int(book_id)
            if mask.any():
                # 🔥 Nếu đã tồn tại (Kịch bản Sửa kèm ảnh): Tiến hành ghi đè thông tin cũ
                current_df.loc[mask, 'Title'] = title
                current_df.loc[mask, 'Author'] = author
                print(f"🔄 [AI Sync Excel] Đã ghi đè thông tin & ảnh mới cho sách cũ ID: {book_id}")
            else:
                # 🔥 Nếu chưa tồn tại (Kịch bản Thêm sách mới): Nối dòng mới vào cuối file
                new_row = pd.DataFrame([{"STT": int(book_id), "Title": title, "Author": author}])
                current_df = pd.concat([current_df, new_row], ignore_index=True)
                print(f"➕ [AI Sync Excel] Đã chèn thêm sách mới hoàn toàn ID: {book_id}")
            
            # Lưu lại vào file Excel
            current_df.to_excel(self.excel_path, index=False, engine='openpyxl')
            
            # Đồng bộ lại dữ liệu lên RAM của server Python
            self.df = current_df
            self.book_titles = self.df['Title'].tolist()
            self.book_ids = self.df['STT'].tolist()

            # 3. Trích xuất lại đặc trưng ảnh bìa nạp thẳng vào RAM
            img = cv2.imread(new_image_path)
            if img is not None:
                gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
                _, des_train = self.orb.detectAndCompute(gray, None)
                self.loaded_covers[str(book_id)] = des_train
                return True
            return False
            
        except Exception as e:
            print(f"❌ Lỗi xử lý đồng bộ ảnh/Excel: {str(e)}")
            return False

    def update_book_in_runtime(self, book_id, title, author):
        """Hàm cập nhật thông tin chữ (Title, Author) trong file Excel và RAM"""
        try:
            df_current = pd.read_excel(self.excel_path, engine='openpyxl')
            
            # 🔥 SỬA DÒNG NÀY: Ép cả cột STT và book_id về kiểu chuỗi (str) để so sánh không lo lệch kiểu dữ liệu
            mask = df_current['STT'].astype(str) == str(book_id)
            
            if mask.any():
                df_current.loc[mask, 'Title'] = title
                df_current.loc[mask, 'Author'] = author
                
                df_current.to_excel(self.excel_path, index=False, engine='openpyxl')
                
                self.df = df_current
                self.book_titles = self.df['Title'].tolist()
                self.book_ids = self.df['STT'].tolist()
                print(f"🔄 [AI Update Excel] Đã cập nhật thông tin mới cho sách ID: {book_id} trên RAM & Excel")
                return True
                
            print(f"⚠️ [AI Update Excel] Không tìm thấy sách ID: {book_id} để sửa")
            return False
        except Exception as e:
            print(f"❌ Lỗi cập nhật Excel ngầm: {str(e)}")
            return False

    def remove_book_from_runtime(self, book_id):
        """Hàm xóa vĩnh viễn sách khỏi file Excel, xóa ảnh bìa trong thư mục và xóa đặc trưng trên RAM"""
        try:
            # 1. Xóa dòng sách trong file Excel
            df_current = pd.read_excel(self.excel_path, engine='openpyxl')
            df_updated = df_current[df_current['STT'] != int(book_id)]
            df_updated.to_excel(self.excel_path, index=False, engine='openpyxl')
            
            # Cập nhật lại biến RAM của Pandas
            self.df = df_updated
            self.book_titles = self.df['Title'].tolist()
            self.book_ids = self.df['STT'].tolist()

            # 2. Xóa đặc trưng vector ORB trên bộ nhớ RAM (để AI không so khớp trúng nữa)
            if str(book_id) in self.loaded_covers:
                del self.loaded_covers[str(book_id)]

            # 3. Quét quét tìm và xóa file ảnh bìa trong folder book_covers (bất kể đuôi .jpg, .png, .jpeg)
            deleted_file = False
            for ext in ['.jpg', '.png', '.jpeg', '.webp']:
                img_path = os.path.join(self.covers_dir, f"{book_id}{ext}")
                if os.path.exists(img_path):
                    os.remove(img_path)
                    deleted_file = True
            
            print(f"🗑️ [AI Delete Sync] Đã xóa sạch sách ID: {book_id} (Excel: Giảm dòng, Folder: {'Đã xóa ảnh' if deleted_file else 'Không có ảnh'}, RAM: Đã hủy)")
            return True
        except Exception as e:
            print(f"❌ Lỗi xóa đồng bộ AI ngầm: {str(e)}")
            return False

    def _precompute_orb_features(self):
        print("🔄 Đang trích xuất tính năng ORB cho 203 cuốn sách mẫu...")
        for _, row in self.df.iterrows():
            book_id = row['STT']
            
            # Khai báo các kiểu đuôi file có thể có
            possible_extensions = ['.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG']
            img_path = None
            
            # Vòng lặp tự động tìm xem ảnh của STT này đang dùng đuôi nào
            for ext in possible_extensions:
                test_path = os.path.join(self.covers_dir, f"{book_id}{ext}")
                if os.path.exists(test_path):
                    img_path = test_path
                    break
            
            # Nếu tìm thấy ảnh hợp lệ thì tiến hành trích xuất đặc trưng hình học
            if img_path and os.path.exists(img_path):
                img = cv2.imread(img_path, cv2.IMREAD_GRAYSCALE)
                if img is not None:
                    kp, des = self.orb.detectAndCompute(img, None)
                    if des is not None:
                        self.loaded_covers[book_id] = des
                        
        print(f"✅ Đã nạp thành công bộ tính năng của {len(self.loaded_covers)} ảnh bìa.")

    def match_by_orb(self, query_img_gray):
        """Thuật toán 1: Tìm kiếm và xếp hạng toàn bộ sách theo đặc trưng ORB (Đã chuẩn hóa 0.0 - 1.0)"""
        kp_query, des_query = self.orb.detectAndCompute(query_img_gray, None)
        
        if des_query is None:
            return []

        scored_results = []

        for book_id, des_train in self.loaded_covers.items():
            if des_train is None:
                continue
                
            matches = self.bf.match(des_query, des_train)
            good_matches = [m for m in matches if m.distance < 45]
            score = len(good_matches)
            
            # 🔥 CHUẨN HÓA: Chia số điểm khớp cho tổng số điểm đặc trưng của ảnh gốc lưu trong RAM
            total_train_keypoints = len(des_train) if des_train is not None else 1
            confidence_score = float(score / total_train_keypoints)
            
            if confidence_score > 1.0:
                confidence_score = 1.0

            scored_results.append({
                "bookId": int(book_id),
                "confidenceScore": float(round(confidence_score, 4)) # Giữ 4 chữ số thập phân
            })

        # Sắp xếp danh sách theo điểm số giảm dần
        scored_results.sort(key=lambda x: x["confidenceScore"], reverse=True)
        
        return scored_results[:10]

    def match_by_ocr_fuzz(self, query_img_path):
        """Thuật toán 2: Đọc chữ bằng PaddleOCR + Dò sai số bằng RapidFuzz (Đã chuẩn hóa 0.0 - 1.0)"""
        try:
            # 🔥 ĐÃ SỬA: Xóa bỏ tham số cls=True để dứt điểm lỗi 500 bất ngờ
            result = self.ocr.ocr(query_img_path)
        except Exception as ocr_err:
            print(f"❌ Lỗi Engine PaddleOCR khi đọc ảnh: {str(ocr_err)}")
            return None, 0

        if not result or result[0] is None:
            return None, 0
        
        # Ghép tất cả các đoạn chữ AI đọc được trên bìa thành 1 chuỗi văn bản
        detected_text = " ".join([line[1][0] for line in result[0]]).lower()
        print(f"📝 Chữ nhận diện được trên bìa: {detected_text}")

        if not detected_text.strip():
            return None, 0

        # Dùng RapidFuzz tìm kiếm tương đối chuỗi chữ này trong danh sách 203 đầu sách Excel
        match_res = process.extractOne(
            detected_text, 
            self.book_titles, 
            scorer=fuzz.token_sort_ratio
        )
        
        if match_res:
            matched_title, score, index = match_res
            if score > 55: # Ngưỡng tự tin trên 55%
                matched_id = self.book_ids[index]
                
                # 🔥 CHUẨN HÓA: Quy đổi từ hệ 0-100 của RapidFuzz về hệ thập phân 0.0 - 1.0
                normalized_score = float(score / 100.0)
                return matched_id, float(round(normalized_score, 4))
                
        return None, 0

    def find_book(self, query_img_path):
        """Hàm tổng hợp trả về danh sách Top 10 ứng viên sáng giá nhất (Hệ điểm thống nhất)"""
        img = cv2.imread(query_img_path)
        if img is None:
            return {"success": False, "matchMethod": "NOT_FOUND", "candidates": []}
            
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        # 1. Lấy danh sách Top 10 từ ORB (Điểm số lúc này đã nằm trong khoảng từ 0.0 đến 1.0)
        top_candidates = self.match_by_orb(gray)
        
        # 🔥 QUY ĐỔI NGƯỠNG BẬT OCR: 
        # Thay vì check điểm thô > 15, ta kiểm tra xem tỷ lệ khớp tính năng có lớn hơn 0.015 (1.5%) hay không
        if top_candidates and top_candidates[0]["confidenceScore"] > 0.015:
            return {
                "success": True,
                "matchMethod": "ORB_MATCH",
                "candidates": top_candidates
            }

        # 2. Bước đệm: Nếu ORB điểm quá thấp, kích hoạt trích xuất chữ viết (OCR) để bổ trợ thêm
        print("⚠️ ORB điểm thấp, kích hoạt PaddleOCR trích xuất chữ viết...")
        book_id_ocr, score_ocr = self.match_by_ocr_fuzz(query_img_path)
        
        if book_id_ocr:
            return {
                "success": True,
                "matchMethod": "OCR_FUZZ_MATCH",
                "candidates": [{
                    "bookId": int(book_id_ocr),
                    "confidenceScore": float(score_ocr) # Đã là hệ 0.0 - 1.0 từ hàm match_by_ocr_fuzz
                }]
            }

        return {
            "success": False,
            "matchMethod": "NOT_FOUND",
            "candidates": []
        }