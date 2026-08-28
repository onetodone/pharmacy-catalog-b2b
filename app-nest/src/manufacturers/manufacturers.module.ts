import { Module } from '@nestjs/common'
import { ManufacturersController } from './manufacturers.controller'
import { ManufacturersService } from './manufacturers.service'

@Module({
  controllers: [ManufacturersController],
  providers: [ManufacturersService],
})
export class ManufacturersModule {}
