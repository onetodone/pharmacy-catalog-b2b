import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common'
import { IsString, Length } from 'class-validator'
import { Role } from '@prisma/client'
import { ManufacturersService } from './manufacturers.service'
import { Roles } from '../common/decorators/roles.decorator'

class ManufacturerDto {
  @IsString()
  @Length(2, 100)
  name!: string
}

@Controller('manufacturers')
export class ManufacturersController {
  constructor(private readonly service: ManufacturersService) {}

  @Get()
  list() {
    return this.service.list()
  }

  @Roles(Role.ADMIN)
  @Post()
  create(@Body() dto: ManufacturerDto) {
    return this.service.create(dto.name)
  }

  @Roles(Role.ADMIN)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: ManufacturerDto) {
    return this.service.update(id, dto.name)
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id)
  }
}
