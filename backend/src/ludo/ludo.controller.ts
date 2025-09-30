import { Controller, Post, Get, Body, Param, Put, Delete, Query } from '@nestjs/common';
import { LudoService } from './ludo.service';
import { LudoGameState } from './ludo-game-state';
import { WatchdogEvent } from './ludo-watchdog.service';

interface JoinGameDto {
  name: string;
  color: string;
}


interface SelectPieceDto {
  pieceId: number;
}

interface CreateGameResponse {
  gameId: string;
  message: string;
}

interface JoinGameResponse {
  success: boolean;
  message: string;
  gameId?: string;
  playerId?: string;
}

interface RejoinGameResponse {
  success: boolean;
  message: string;
  playerData?: {
    name: string;
    color: string;
  };
}

interface GameActionResponse {
  success: boolean;
  message: string;
  diceValue?: number;
}

@Controller('ludo')
export class LudoController {
  constructor(private readonly ludoService: LudoService) {}

  // ===== GESTIÓN DE JUEGOS =====

  @Post('create-game')
  createGame(): CreateGameResponse {
    return this.ludoService.createGame();
  }

  @Get('game/:gameId')
  getGameInfo(@Param('gameId') gameId: string): LudoGameState | { error: string } {
    return this.ludoService.getGameInfo(gameId);
  }

  @Get('games')
  getAvailableGames(): LudoGameState[] {
    return this.ludoService.getAvailableGames();
  }

  @Get('games/all')
  getAllGames(): LudoGameState[] {
    return this.ludoService.getAllGames();
  }

  @Delete('game/:gameId')
  deleteGame(@Param('gameId') gameId: string): { success: boolean; message: string } {
    return this.ludoService.deleteGame(gameId);
  }

  // ===== GESTIÓN DE JUGADORES =====

  @Post('game/:gameId/join')
  async joinGame(
    @Param('gameId') gameId: string,
    @Body() joinData: JoinGameDto,
  ): Promise<JoinGameResponse> {
    const result = await this.ludoService.joinGame(gameId, joinData);
    return {
      ...result,
      gameId: result.success ? gameId : undefined,
    };
  }

  @Get('game/:gameId/rejoin/:playerId')
  rejoinGame(
    @Param('gameId') gameId: string,
    @Param('playerId') playerId: string,
  ): RejoinGameResponse {
    return this.ludoService.rejoinGame(gameId, playerId);
  }


  // ===== ACCIONES DEL JUEGO =====

  @Post('game/:gameId/start')
  startGame(@Param('gameId') gameId: string): { success: boolean; message: string } {
    return this.ludoService.startGame(gameId);
  }

  @Post('game/:gameId/player/:playerId/roll-dice')
  rollDice(
    @Param('gameId') gameId: string,
    @Param('playerId') playerId: string,
  ): GameActionResponse {
    return this.ludoService.rollDice(gameId, playerId);
  }

  @Post('game/:gameId/player/:playerId/select-piece')
  selectPiece(
    @Param('gameId') gameId: string,
    @Param('playerId') playerId: string,
    @Body() selectData: SelectPieceDto,
  ): { success: boolean; message: string } {
    return this.ludoService.selectPiece(gameId, playerId, selectData.pieceId);
  }

  @Post('game/:gameId/player/:playerId/move-piece')
  movePiece(
    @Param('gameId') gameId: string,
    @Param('playerId') playerId: string,
  ): { success: boolean; message: string } {
    return this.ludoService.movePiece(gameId, playerId);
  }

  // ===== WATCHDOG Y SUSCRIPCIONES =====

  @Post('game/:gameId/subscribe/:playerId')
  subscribeToGame(
    @Param('gameId') gameId: string,
    @Param('playerId') playerId: string,
  ): { subscriptionId: string; message: string } {
    // Nota: En una implementación real, esto debería manejar WebSockets o Server-Sent Events
    // Por ahora, devolvemos un ID de suscripción para polling
    const subscriptionId = this.ludoService.subscribeToGame(
      gameId, 
      playerId, 
      (gameState) => {
        // En una implementación real, esto enviaría datos via WebSocket
        console.log(`Estado actualizado para juego ${gameId}:`, gameState);
      }
    );
    
    return {
      subscriptionId,
      message: 'Suscripción creada. Usa polling para obtener actualizaciones.',
    };
  }

  @Delete('subscription/:subscriptionId')
  unsubscribeFromGame(@Param('subscriptionId') subscriptionId: string): { success: boolean; message: string } {
    const success = this.ludoService.unsubscribeFromGame(subscriptionId);
    return {
      success,
      message: success ? 'Suscripción cancelada' : 'Suscripción no encontrada',
    };
  }

  // ===== HISTORIAL Y ESTADÍSTICAS =====

  @Get('game/:gameId/events')
  getGameEventHistory(
    @Param('gameId') gameId: string,
    @Query('limit') limit?: string,
  ): WatchdogEvent[] {
    const limitNumber = limit ? parseInt(limit, 10) : 50;
    return this.ludoService.getGameEventHistory(gameId, limitNumber);
  }

  @Get('watchdog/stats')
  getWatchdogStats() {
    return this.ludoService.getWatchdogStats();
  }

  @Post('watchdog/cleanup')
  cleanupOldData(): { message: string } {
    this.ludoService.cleanupOldData();
    return { message: 'Limpieza de datos antiguos completada' };
  }

  // ===== ENDPOINTS DE UTILIDAD =====

  @Get('available-colors/:gameId')
  getAvailableColors(@Param('gameId') gameId: string) {
    const gameInfo = this.ludoService.getGameInfo(gameId);
    if ('error' in gameInfo) {
      return { error: 'Juego no encontrado' };
    }
    return {
      colors: gameInfo.availableColors,
    };
  }

  @Get('game/:gameId/players')
  getGamePlayers(@Param('gameId') gameId: string) {
    const gameInfo = this.ludoService.getGameInfo(gameId);
    if ('error' in gameInfo) {
      return { error: 'Juego no encontrado' };
    }
    return {
      players: gameInfo.players,
      currentPlayer: gameInfo.currentPlayer,
    };
  }

  @Get('game/:gameId/status')
  getGameStatus(@Param('gameId') gameId: string) {
    const gameInfo = this.ludoService.getGameInfo(gameId);
    if ('error' in gameInfo) {
      return { error: 'Juego no encontrado' };
    }
    return {
      gamePhase: gameInfo.gamePhase,
      gameStarted: gameInfo.gameStarted,
      currentPlayer: gameInfo.currentPlayer,
      canRollDice: gameInfo.canRollDice,
      canMovePiece: gameInfo.canMovePiece,
      selectedPieceId: gameInfo.selectedPieceId,
      diceValue: gameInfo.diceValue,
      winner: gameInfo.winner,
    };
  }
}
