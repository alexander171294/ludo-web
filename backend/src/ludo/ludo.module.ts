import { Module } from '@nestjs/common';
import { LudoController } from './ludo.controller';
import { LudoService } from './ludo.service';

@Module({
  controllers: [LudoController],
  providers: [LudoService],
  exports: [LudoService],
})
export class LudoModule {}
