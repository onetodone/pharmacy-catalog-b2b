import { Type } from 'class-transformer'
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator'
import { OrderStatus, PaymentStatus } from '@prisma/client'
import { PaginationDto } from '../../common/dto/pagination.dto'

export class CheckoutItemDto {
  @Type(() => Number)
  @IsInt()
  productId!: number

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number
}

export class CheckoutDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CheckoutItemDto)
  items!: CheckoutItemDto[]

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string
}

export class ListOrdersDto extends PaginationDto {
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus

  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus
}

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  status!: OrderStatus
}

export class UpdatePaymentStatusDto {
  @IsEnum(PaymentStatus)
  paymentStatus!: PaymentStatus
}
