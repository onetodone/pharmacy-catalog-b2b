import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common'
import { Role } from '@prisma/client'
import { OrdersService } from './orders.service'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { AuthUser } from '../common/auth-user'
import { CheckoutDto, ListOrdersDto, UpdateOrderStatusDto, UpdatePaymentStatusDto } from './dto/order.dto'

@Controller('orders')
export class OrdersController {
  constructor(private readonly service: OrdersService) {}

  @Roles(Role.CUSTOMER)
  @Post('checkout')
  checkout(@CurrentUser() user: AuthUser, @Body() dto: CheckoutDto) {
    return this.service.checkout(user, dto)
  }

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() dto: ListOrdersDto) {
    return this.service.list(user, dto)
  }

  @Get(':id')
  getOne(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.service.getOne(user, id)
  }

  @Patch(':id/status')
  updateStatus(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.service.updateStatus(user, id, dto.status)
  }

  @Roles(Role.ADMIN, Role.SUPPLIER)
  @Patch(':id/payment-status')
  updatePaymentStatus(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePaymentStatusDto,
  ) {
    return this.service.updatePaymentStatus(user, id, dto.paymentStatus)
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id)
  }
}
