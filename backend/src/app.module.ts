import { Module } from '@nestjs/common';
import { LudoModule } from './ludo/ludo.module';

@Module({
  imports: [LudoModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
