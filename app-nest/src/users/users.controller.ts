import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common'
import { Role } from '@prisma/client'
import { UsersService } from './users.service'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { AuthUser } from '../common/auth-user'
import { BanUserDto, ChangePasswordDto, CreateUserDto, ListUsersDto, UpdateMeDto, UpdateUserDto } from './dto/user.dto'

@Controller('users')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  // --- Self-service (any authenticated role) ---

  @Patch('me')
  updateMe(@CurrentUser() user: AuthUser, @Body() dto: UpdateMeDto) {
    return this.service.updateMe(user.id, dto)
  }

  @Post('me/password')
  changePassword(@CurrentUser() user: AuthUser, @Body() dto: ChangePasswordDto) {
    return this.service.changePassword(user.id, user.sid, dto)
  }

  // --- Session management (self-service) ---

  @Get('me/sessions')
  listSessions(@CurrentUser() user: AuthUser) {
    return this.service.listSessions(user.id, user.sid)
  }

  @Delete('me/sessions/:id')
  @HttpCode(204)
  revokeSession(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.revokeSession(user.id, id)
  }

  @Delete('me/sessions')
  revokeOtherSessions(@CurrentUser() user: AuthUser) {
    return this.service.revokeOtherSessions(user.id, user.sid)
  }

  // --- Admin only ---

  @Roles(Role.ADMIN)
  @Get()
  list(@Query() dto: ListUsersDto) {
    return this.service.list(dto)
  }

  @Roles(Role.ADMIN)
  @Get(':id')
  getOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.getOne(id)
  }

  @Roles(Role.ADMIN)
  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.service.create(dto)
  }

  @Roles(Role.ADMIN)
  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
    return this.service.update(user.id, id, dto)
  }

  @Roles(Role.ADMIN)
  @Patch(':id/approve')
  approve(@Param('id', ParseIntPipe) id: number) {
    return this.service.setApproved(id, true)
  }

  @Roles(Role.ADMIN)
  @Patch(':id/ban')
  ban(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: BanUserDto) {
    return this.service.setBanned(user.id, id, dto.banned)
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.service.remove(user.id, id)
  }
}
