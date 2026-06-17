import { PrismaClient, Role } from '@prisma/client'; // Hoặc @prisma/client tùy dự án của bạn
import * as fs from 'fs';
import * as path from 'path';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🚨 BƯỚC 1: Đang xóa sạch toàn bộ dữ liệu cũ trong Database...');
  
  await prisma.notification.deleteMany({});
  await prisma.violation.deleteMany({});
  await prisma.renewHistory.deleteMany({});
  await prisma.borrowLog.deleteMany({});
  await prisma.reservation.deleteMany({});
  await prisma.book.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.user.deleteMany({});
  
  console.log('✨ Đã làm sạch Database.');

  // =================================================================
  
  console.log('👥 BƯỚC 2: Khởi tạo tài khoản Admin và 50 Users sinh viên mẫu...');
  const hashedPassword = await bcrypt.hash('123456', 10);

  // 👑 2.1: Tạo tài khoản Admin mặc định với ID = 1
  await prisma.user.create({
    data: {
      id: 1,
      mssv: 'ADMIN',             // Định danh đăng nhập cho Admin
      name: 'Super Admin',
      password: hashedPassword,
      role: Role.ADMIN,          // Thiết lập quyền ADMIN theo Enum của bạn
      isActive: true,
    },
  });
  console.log('👑 Đã tạo thành công tài khoản Admin (Mã đăng nhập: ADMIN / pass: 123456)');

  // 👥 2.2: Tạo dữ liệu 50 Sinh viên với tên ngẫu nhiên siêu xịn (ID chạy từ 2 đến 51)
  const hoList = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô'];
  const demList = ['Văn', 'Thị', 'Hữu', 'Đức', 'Minh', 'Hoàng', 'Thành', 'Tuấn', 'Ngọc', 'Xuân', 'Anh', 'Quốc', 'Mạnh', 'Trọng'];
  const tenList = ['Tín', 'Huy', 'Khang', 'Nam', 'Bình', 'Linh', 'Trang', 'Hải', 'Sơn', 'Dũng', 'Tùng', 'Đạt', 'Phong', 'Bách', 'Long', 'Tiến', 'Khoa', 'Tú', 'Ân', 'Vy'];

  const generateRandomName = () => {
    const ho = hoList[Math.floor(Math.random() * hoList.length)];
    const dem = demList[Math.floor(Math.random() * demList.length)];
    const ten = tenList[Math.floor(Math.random() * tenList.length)];
    return `${ho} ${dem} ${ten}`;
  };
  
  // Vòng lặp map sinh 50 sinh viên từ ID số 2 trở đi để tránh đè lên Admin
  const userPromises = Array.from({ length: 50 }, (_, index) => {
    const studentId = index + 2; // Khởi hành từ ID = 2
    const mssvCode = `225122${String(index + 1).padStart(4, '0')}`; // MSSV vẫn tăng tiến từ 2251220001
    const randomName = generateRandomName();
    
    return prisma.user.create({
      data: {
        id: studentId,
        mssv: mssvCode,
        name: randomName,
        password: hashedPassword,
        role: Role.STUDENT,
        isActive: true,
      },
    });
  });

  await Promise.all(userPromises);
  console.log('✅ Đã nạp thành công 50 tài khoản sinh viên xịn lên Postgres.');
  // =================================================================

  console.log('📂 BƯỚC 3: Tạo 7 nhóm thể loại sách theo thứ tự chỉ định...');
  const categoryNames = [
    'Văn học',               
    'Kinh tế',               
    'Kỹ năng sống',          
    'Công nghệ thông tin',   
    'Sách chính trị pháp lý', 
    'Giáo trình',            
    'Học ngoại ngữ'          
  ];

  const categoriesMap: { [key: string]: number } = {};
  
  for (let i = 0; i < categoryNames.length; i++) {
    const createdCat = await prisma.category.create({
      data: {
        id: i + 1,
        name: categoryNames[i],
        description: `Các tài liệu thuộc nhóm ${categoryNames[i]}`,
      },
    });
    categoriesMap[categoryNames[i]] = createdCat.id;
  }
  console.log('✅ Đã nạp thành công 7 danh mục thể loại vào Postgres.');

  // =================================================================

  console.log('📚 BƯỚC 4: Đọc file dữ liệu và tiến hành phân loại 203 cuốn sách...');
  
  const dataPath = path.join(__dirname, 'books-data.json');
  if (!fs.existsSync(dataPath)) {
    console.error('❌ Thất bại: Không tìm thấy file books-data.json trong thư mục prisma/.');
    return;
  }
  
  const booksData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

  // 🔥 SỬA LỖI TS: Dùng trực tiếp .map() từ mảng dữ liệu gốc giúp định hình kiểu mảng tự động 100%
  const bookPromises = booksData.map((book: { id: number | string; title: string; author?: string }) => {
    const id = Number(book.id);
    let assignedCategoryId = 1;

    if (id >= 1 && id <= 30) {
      assignedCategoryId = categoriesMap['Văn học'];
    } else if (id >= 31 && id <= 60) {
      assignedCategoryId = categoriesMap['Kinh tế'];
    } else if (id >= 61 && id <= 90) {
      assignedCategoryId = categoriesMap['Kỹ năng sống'];
    } else if (id >= 91 && id <= 130) {
      assignedCategoryId = categoriesMap['Công nghệ thông tin'];
    } else if (id >= 131 && id <= 150) {
      assignedCategoryId = categoriesMap['Sách chính trị pháp lý'];
    } else if (id >= 151 && id <= 175) {
      assignedCategoryId = categoriesMap['Giáo trình'];
    } else if (id >= 176 && id <= 203) {
      assignedCategoryId = categoriesMap['Học ngoại ngữ'];
    }

    return prisma.book.create({
      data: {
        id: id,
        title: book.title,
        author: book.author || 'Chưa cập nhật tác giả',
        totalStock: 5,        
        availableStock: 5,    
        categoryId: assignedCategoryId,
      },
    });
  });

  await Promise.all(bookPromises);
  console.log(`✅ Thành công tốt đẹp! Đã nạp trọn vẹn ${booksData.length} cuốn sách tương thích 100% với AI Service.`);

  // =================================================================
  console.log('🔄 BƯỚC 5: Đồng bộ lại bộ đếm tự động tăng (Sequence) cho ID trong Postgres...');
  
  // Câu lệnh SQL thuần để cập nhật bộ đếm id của bảng books lên max id hiện tại (203)
  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('books', 'id'), COALESCE(MAX(id), 1) + 1, false) FROM books;`
  );
  
  console.log('🚀 Bộ đếm ID đã được đồng bộ chuẩn xác!');
}

main()
  .catch((e) => {
    console.error('❌ Quá trình Seeding phát sinh lỗi nghiêm trọng:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });