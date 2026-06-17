import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    const { mssv, ...rest } = createUserDto;

    const existing = await this.prisma.user.findUnique({ where: { mssv } });
    if (existing) throw new ConflictException('MSSV này đã được đăng ký!');

    const salt = await bcrypt.genSalt();
  const hashedPassword = await bcrypt.hash('123456', salt);

    const user = await this.prisma.user.create({
      data: { ...rest, mssv, password: hashedPassword },
    });

    const { password: _, ...result } = user;
    return result;
  }

  async findAll() {
    return this.prisma.user.findMany({
      select: { id: true, mssv: true, name: true,password: true, role: true, telegramId: true, isActive: true }
    });
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User không tồn tại');
    const { password, ...result } = user;
    return result;
  }

  async update(id: number, updateUserDto: any) {
  // Nếu Admin gửi mật khẩu mới (Reset), thì mới hash
  if (updateUserDto.password) {
    const salt = await bcrypt.genSalt();
    updateUserDto.password = await bcrypt.hash(updateUserDto.password, salt);
  }

  // Prisma .update sẽ chỉ cập nhật những field có trong updateUserDto
  // Những field không gửi lên sẽ được GIỮ NGUYÊN trong DB
  return this.prisma.user.update({
    where: { id },
    data: updateUserDto, 
  });
}

  async remove(id: number) {
    return this.prisma.user.delete({ where: { id } });
  }
  async findByMssvInternal(mssv: string) {
  const user = await this.prisma.user.findUnique({
    where: { mssv },
  });
  return user;
}
}