import { Type } from 'class-transformer'
import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString, Length, Matches } from 'class-validator'
import { Role } from '@prisma/client'
import { LOGIN_REGEX, PASSWORD_REGEX } from '../../auth/dto/register.dto'
import { PaginationDto } from '../../common/dto/pagination.dto'

export class ListUsersDto extends PaginationDto {
  @IsOptional()
  @IsEnum(Role)
  role?: Role
}

export class CreateUserDto {
  @Matches(LOGIN_REGEX, { message: 'login: 3-20 chars, only a-z A-Z 0-9 - _' })
  login!: string

  @Matches(PASSWORD_REGEX, { message: 'password: 8-32 chars, only a-z A-Z 0-9 - _' })
  password!: string

  @IsString()
  @Length(3, 100)
  name!: string

  @IsEmail()
  @Length(6, 50)
  email!: string

  @IsEnum(Role)
  role!: Role

  @IsOptional()
  @IsString()
  @Length(3, 20)
  phone?: string

  @IsOptional()
  @IsString()
  @Length(3, 60)
  taxId?: string

  @IsOptional()
  @IsString()
  @Length(3, 100)
  managerName?: string

  @IsOptional()
  @IsString()
  @Length(3, 200)
  address?: string
}

export class UpdateUserDto {
  @IsOptional()
  @Matches(LOGIN_REGEX)
  login?: string

  @IsOptional()
  @Matches(PASSWORD_REGEX)
  password?: string

  @IsOptional()
  @IsString()
  @Length(3, 100)
  name?: string

  @IsOptional()
  @IsEmail()
  @Length(6, 50)
  email?: string

  @IsOptional()
  @IsEnum(Role)
  role?: Role

  @IsOptional()
  @IsBoolean()
  approved?: boolean

  @IsOptional()
  @IsBoolean()
  banned?: boolean

  @IsOptional()
  @IsString()
  @Length(0, 20)
  phone?: string

  @IsOptional()
  @IsString()
  @Length(0, 60)
  taxId?: string

  @IsOptional()
  @IsString()
  @Length(0, 100)
  managerName?: string

  @IsOptional()
  @IsString()
  @Length(0, 200)
  address?: string
}

export class BanUserDto {
  @Type(() => Boolean)
  @IsBoolean()
  banned!: boolean
}

/** Self-service profile update (used by /users/me from any authenticated role). */
export class UpdateMeDto {
  @IsOptional()
  @IsString()
  @Length(3, 100)
  name?: string

  @IsOptional()
  @IsEmail()
  @Length(6, 50)
  email?: string

  @IsOptional()
  @IsString()
  @Length(0, 20)
  phone?: string

  @IsOptional()
  @IsString()
  @Length(0, 60)
  taxId?: string

  @IsOptional()
  @IsString()
  @Length(0, 100)
  managerName?: string

  @IsOptional()
  @IsString()
  @Length(0, 200)
  address?: string
}

export class ChangePasswordDto {
  @IsString()
  currentPassword!: string

  @Matches(PASSWORD_REGEX, { message: 'password: 8-32 chars, only a-z A-Z 0-9 - _' })
  newPassword!: string
}
