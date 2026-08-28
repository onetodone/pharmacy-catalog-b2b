import { Role } from '@prisma/client'

/** Shape attached to `request.user` by the JWT strategy. */
export interface AuthUser {
  id: number
  login: string
  name: string
  email: string
  role: Role
}
