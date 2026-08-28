import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { Role } from '@prisma/client'
import { ProductsService } from './products.service'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { AuthUser } from '../common/auth-user'
import { imageUpload, relativeUploadPath } from '../common/upload'
import { CreateProductDto, ListProductsDto, UpdateProductDto } from './dto/product.dto'

@Controller('products')
export class ProductsController {
  constructor(private readonly service: ProductsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() dto: ListProductsDto) {
    return this.service.list(user, dto)
  }

  @Get(':id')
  getOne(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.service.getOne(user, id)
  }

  @Roles(Role.ADMIN, Role.SUPPLIER)
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateProductDto) {
    return this.service.create(user, dto)
  }

  @Roles(Role.ADMIN, Role.SUPPLIER)
  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProductDto) {
    return this.service.update(user, id, dto)
  }

  @Roles(Role.ADMIN, Role.SUPPLIER)
  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.service.remove(user, id)
  }

  @Roles(Role.ADMIN, Role.SUPPLIER)
  @Post(':id/cover')
  @UseInterceptors(FileInterceptor('file', imageUpload('products')))
  uploadCover(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.service.setCover(user, id, relativeUploadPath('products', file))
  }
}
