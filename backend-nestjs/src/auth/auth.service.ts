import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async login(mssv: string, pass: string) {
    // 1. Tìm user trong DB bằng hàm nội bộ (trả về cả password và isActive)
    const user = await this.usersService.findByMssvInternal(mssv);

    if (!user) {
      throw new UnauthorizedException('Mã số sinh viên hoặc mật khẩu không chính xác');
    }

    // 2. KIỂM TRA TRẠNG THÁI TÀI KHOẢN (Bổ sung mới)
    // Nếu isActive là false, chặn đăng nhập ngay lập tức
    if (user.isActive === false) {
      throw new ForbiddenException('Tài khoản của bạn đã bị khóa bởi Admin');
    }

    // 3. So sánh mật khẩu
    const isMatch = await bcrypt.compare(pass, user.password);
    
    if (isMatch) {
      // 4. Nếu đúng, tạo Payload để đưa vào Token
      const payload = { mssv: user.mssv, sub: user.id, role: user.role };
      
      return {
        access_token: this.jwtService.sign(payload),
        user: {
          id: user.id,
          name: user.name,
          role: user.role,
          mssv: user.mssv
        }
      };
    }
    
    // Nếu sai mật khẩu
    throw new UnauthorizedException('Mã số sinh viên hoặc mật khẩu không chính xác');
  }
}