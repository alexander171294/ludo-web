import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cors from 'cors';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configurar CORS
  app.use(
    cors({
      origin: true,
      credentials: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
  console.log(`🚀 Servidor ejecutándose en puerto ${process.env.PORT ?? 3000}`);
  console.log(
    `🎮 API REST de Ludo: http://localhost:${process.env.PORT ?? 3000}/ludo`,
  );
  console.log(`📊 Watchdog activo para monitorear cambios en las partidas`);
}
bootstrap();
