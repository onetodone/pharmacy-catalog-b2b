import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common'
import { IsOptional, IsString, Length } from 'class-validator'
import { Role } from '@prisma/client'
import { PostsService } from './posts.service'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { AuthUser } from '../common/auth-user'
import { PaginationDto } from '../common/dto/pagination.dto'

class CreatePostDto {
  @IsString()
  @Length(2, 120)
  title!: string

  @IsString()
  @Length(2, 5000)
  content!: string
}

class UpdatePostDto {
  @IsOptional()
  @IsString()
  @Length(2, 120)
  title?: string

  @IsOptional()
  @IsString()
  @Length(2, 5000)
  content?: string
}

@Controller('posts')
export class PostsController {
  constructor(private readonly service: PostsService) {}

  @Get()
  list(@Query() dto: PaginationDto) {
    return this.service.list(dto)
  }

  @Get(':id')
  getOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.getOne(id)
  }

  @Roles(Role.ADMIN)
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePostDto) {
    return this.service.create(user.id, dto)
  }

  @Roles(Role.ADMIN)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePostDto) {
    return this.service.update(id, dto)
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id)
  }
}
