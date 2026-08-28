import { Type } from 'class-transformer'
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator'

export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20

  @IsOptional()
  @IsString()
  search?: string
}

export interface Paginated<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  pageCount: number
}

export function paginate<T>(data: T[], total: number, dto: PaginationDto): Paginated<T> {
  return {
    data,
    total,
    page: dto.page,
    pageSize: dto.pageSize,
    pageCount: Math.max(1, Math.ceil(total / dto.pageSize)),
  }
}
