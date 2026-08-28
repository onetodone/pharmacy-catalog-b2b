import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common'
import { IsString, Length } from 'class-validator'
import { Role } from '@prisma/client'
import { CategoriesService } from './categories.service'
import { Roles } from '../common/decorators/roles.decorator'

class CategoryDto {
  @IsString()
  @Length(2, 100)
  name!: string
}

@Controller('categories')
export class CategoriesController {
  constructor(private readonly service: CategoriesService) {}

  @Get()
  list() {
    return this.service.list()
  }

  @Roles(Role.ADMIN)
  @Post()
  create(@Body() dto: CategoryDto) {
    return this.service.create(dto.name)
  }

  @Roles(Role.ADMIN)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: CategoryDto) {
    return this.service.update(id, dto.name)
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id)
  }
}
