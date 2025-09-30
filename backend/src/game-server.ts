import { Server } from 'boardgame.io/server';
import { LudoGame } from './ludo/ludo.game';

const PORT = process.env.GAME_PORT ?? '3001';

const server = Server({
  games: [LudoGame],
  origins: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:8080',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'http://127.0.0.1:8080',
  ],
});

server.run(parseInt(PORT), () => {
  console.log(`🎲 Servidor de Juego ejecutándose en puerto ${PORT}`);
  console.log(`🎮 WebSocket disponible en: ws://localhost:${PORT}`);
  console.log(`🌐 API de Juego disponible en: http://localhost:${PORT}`);
});
