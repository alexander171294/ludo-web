import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { LudoService } from './ludo/ludo.service';
import { Server } from 'boardgame.io/server';
import { LudoGame } from './ludo/ludo.game';
import * as cors from 'cors';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Configurar CORS
  app.use(cors({
    origin: true,
    credentials: true,
  }));

  // Configurar servidor de boardgame.io
  const gameServer = Server({
    games: [LudoGame],
    origins: [
      'http://localhost:3000',
      'http://localhost:3001', 
      'http://localhost:8080',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:8080'
    ],
  });

  // Montar el servidor de boardgame.io en la ruta /api
  app.use('/api', gameServer.app);

  await app.listen(process.env.PORT ?? 3000);
  console.log(`🚀 Servidor ejecutándose en puerto ${process.env.PORT ?? 3000}`);
  console.log(`🎮 API REST de Ludo: http://localhost:${process.env.PORT ?? 3000}/ludo`);
  console.log(`🎲 WebSocket de Juego: ws://localhost:${process.env.PORT ?? 3000}/api`);
}
bootstrap();