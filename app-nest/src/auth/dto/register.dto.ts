import { IsEmail, IsString, Length, Matches } from 'class-validator'

export const LOGIN_REGEX = /^[a-zA-Z0-9_-]{3,20}$/
export const PASSWORD_REGEX = /^[a-zA-Z0-9_-]{8,32}$/

export class RegisterDto {
  @Matches(LOGIN_REGEX, { message: 'login: 3-20 chars, only a-z A-Z 0-9 - _' })
  login!: string

  @Matches(PASSWORD_REGEX, { message: 'password: 8-32 chars, only a-z A-Z 0-9 - _' })
  password!: string

  @IsString()
  @Length(3, 100)
  name!: string

  @IsString()
  @Length(3, 100)
  managerName!: string

  @IsEmail()
  @Length(6, 50)
  email!: string

  @IsString()
  @Length(6, 20)
  phone!: string

  @IsString()
  @Length(6, 60)
  taxId!: string

  @IsString()
  @Length(6, 200)
  address!: string
}
