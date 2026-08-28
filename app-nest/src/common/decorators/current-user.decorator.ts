import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import { AuthUser } from '../auth-user'

export const CurrentUser = createParamDecorator(
  (data: keyof AuthUser | undefined, ctx: ExecutionContext): AuthUser | AuthUser[keyof AuthUser] => {
    const request = ctx.switchToHttp().getRequest()
    const user = request.user as AuthUser
    return data ? user?.[data] : user
  },
)
