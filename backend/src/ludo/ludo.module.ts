import { Module } from '@nestjs/common';
import { LudoController } from './ludo.controller';
import { LudoService } from './ludo.service';
import { LudoGameStateManager } from './ludo-game-state';
import { LudoWatchdogService } from './ludo-watchdog.service';

@Module({
  controllers: [LudoController],
  providers: [LudoService, LudoGameStateManager, LudoWatchdogService],
  exports: [LudoService, LudoGameStateManager, LudoWatchdogService],
})
export class LudoModule {}
