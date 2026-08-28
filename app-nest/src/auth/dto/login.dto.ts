import { IsString, MaxLength } from 'class-validator'

export class LoginDto {
  @IsString()
  @MaxLength(50)
  login!: string

  @IsString()
  @MaxLength(72)
  password!: string
}
