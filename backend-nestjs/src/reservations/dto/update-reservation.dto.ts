// import { PartialType } from '@nestjs/swagger';
// import { CreateReservationDto } from './create-reservation.dto';

// export class UpdateReservationDto extends PartialType(CreateReservationDto) {}
import { ApiProperty } from '@nestjs/swagger';
import { ReservationStatus } from '@prisma/client';

export class UpdateReservationDto {
  @ApiProperty({ example: 'APPROVED', enum: ReservationStatus })
  status: ReservationStatus;
}