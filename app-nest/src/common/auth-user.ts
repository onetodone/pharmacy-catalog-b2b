import { Role } from '@prisma/client'

export interface AuthUser {
  id: number
  login: string
  name: string
  email: string
  role: Role
  /** Id of the Session backing this access token — used to scope logout / session revocation. */
  sid: string
}
