import { Controller, Get } from '@nestjs/common'
import { Role } from '@prisma/client'
import { StatsService } from './stats.service'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { AuthUser } from '../common/auth-user'

@Controller('stats')
export class StatsController {
  constructor(private readonly service: StatsService) {}

  @Roles(Role.ADMIN, Role.SUPPLIER)
  @Get('overview')
  overview(@CurrentUser() user: AuthUser) {
    return this.service.overview(user)
  }
}
