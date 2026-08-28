import { Type } from 'class-transformer'
import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Length, Min } from 'class-validator'
import { PaginationDto } from '../../common/dto/pagination.dto'

export class ListProductsDto extends PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  categoryId?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  manufacturerId?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  ownerId?: number

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  inStock?: boolean

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeArchived?: boolean
}

export class CreateProductDto {
  @IsString()
  @Length(3, 100)
  name!: string

  @IsString()
  @Length(3, 50)
  code!: string

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  price!: number

  @Type(() => Number)
  @IsInt()
  @Min(0)
  quantity!: number

  @IsString()
  @Length(3, 2000)
  description!: string

  @Type(() => Number)
  @IsInt()
  categoryId!: number

  @Type(() => Number)
  @IsInt()
  manufacturerId!: number

  // Required for ADMIN (the supplier who owns it); ignored for SUPPLIER (forced to self).
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  ownerId?: number
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @Length(3, 100)
  name?: string

  @IsOptional()
  @IsString()
  @Length(3, 50)
  code?: string

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  price?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  quantity?: number

  @IsOptional()
  @IsString()
  @Length(3, 2000)
  description?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  categoryId?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  manufacturerId?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  ownerId?: number

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  archived?: boolean
}
