import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Put,
  Delete,
  Query,
} from '@nestjs/common';
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

interface GameInfoResponse {
  gameId: string;
  players: any[];
  currentPlayer: number;
  diceValue: number;
  gamePhase: 'waiting' | 'playing' | 'finished';
  winner: string | null;
  gameStarted: boolean;
  availableColors: string[];
  decisionDuration: number;
  lastUpdated: Date;
  version: number;
  canRollDice?: boolean;
  canMovePiece?: boolean;
  selectedPieceId?: number;
  decisionTimeLeft?: number;
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
  getGameInfo(
    @Param('gameId') gameId: string,
    @Query('playerId') playerId?: string,
  ): GameInfoResponse | { error: string } {
    const gameInfo = this.ludoService.getGameInfo(gameId);
    if ('error' in gameInfo) {
      return gameInfo;
    }

    // Si no se proporciona playerId, devolver solo información básica
    if (!playerId) {
      // Actualizar tiempos de acción para todos los jugadores
      this.ludoService.updatePlayerActionTimes(gameInfo);
      
      return {
        gameId: gameInfo.gameId,
        players: gameInfo.players,
        currentPlayer: gameInfo.currentPlayer,
        diceValue: gameInfo.diceValue,
        gamePhase: gameInfo.gamePhase,
        winner: gameInfo.winner,
        gameStarted: gameInfo.gameStarted,
        availableColors: gameInfo.availableColors,
        decisionDuration: gameInfo.decisionDuration,
        lastUpdated: gameInfo.lastUpdated,
        version: gameInfo.version,
      };
    }

    // Verificar si el jugador existe en el juego
    const player = gameInfo.players.find((p) => p.id === playerId);
    if (!player) {
      return { error: 'Jugador no encontrado en este juego' };
    }

    // Verificar si es el turno del jugador
    const isPlayerTurn =
      gameInfo.currentPlayer ===
      gameInfo.players.findIndex((p) => p.id === playerId);

    // Actualizar tiempos de acción para todos los jugadores
    this.ludoService.updatePlayerActionTimes(gameInfo);

    return {
      gameId: gameInfo.gameId,
      players: gameInfo.players,
      currentPlayer: gameInfo.currentPlayer,
      diceValue: gameInfo.diceValue,
      gamePhase: gameInfo.gamePhase,
      winner: gameInfo.winner,
      gameStarted: gameInfo.gameStarted,
      availableColors: gameInfo.availableColors,
      canRollDice: isPlayerTurn ? gameInfo.canRollDice : false,
      canMovePiece: isPlayerTurn ? gameInfo.canMovePiece : false,
      selectedPieceId: isPlayerTurn ? gameInfo.selectedPieceId : undefined,
      decisionDuration: gameInfo.decisionDuration,
      lastUpdated: gameInfo.lastUpdated,
      version: gameInfo.version,
    };
  }

  @Get('games')
  getAvailableGames(): GameInfoResponse[] {
    const games = this.ludoService.getAvailableGames();
    // Devolver solo información básica sin campos sensibles
    return games.map((game) => ({
      gameId: game.gameId,
      players: game.players,
      currentPlayer: game.currentPlayer,
      diceValue: game.diceValue,
      gamePhase: game.gamePhase,
      winner: game.winner,
      gameStarted: game.gameStarted,
      availableColors: game.availableColors,
      decisionDuration: game.decisionDuration,
      lastUpdated: game.lastUpdated,
      version: game.version,
    }));
  }

  @Get('games/all')
  getAllGames(): GameInfoResponse[] {
    const games = this.ludoService.getAllGames();
    // Devolver solo información básica sin campos sensibles
    return games.map((game) => ({
      gameId: game.gameId,
      players: game.players,
      currentPlayer: game.currentPlayer,
      diceValue: game.diceValue,
      gamePhase: game.gamePhase,
      winner: game.winner,
      gameStarted: game.gameStarted,
      availableColors: game.availableColors,
      decisionDuration: game.decisionDuration,
      lastUpdated: game.lastUpdated,
      version: game.version,
    }));
  }

  @Delete('game/:gameId')
  deleteGame(@Param('gameId') gameId: string): {
    success: boolean;
    message: string;
  } {
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
  startGame(@Param('gameId') gameId: string): {
    success: boolean;
    message: string;
  } {
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
      },
    );

    return {
      subscriptionId,
      message: 'Suscripción creada. Usa polling para obtener actualizaciones.',
    };
  }

  @Delete('subscription/:subscriptionId')
  unsubscribeFromGame(@Param('subscriptionId') subscriptionId: string): {
    success: boolean;
    message: string;
  } {
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
  getGameStatus(
    @Param('gameId') gameId: string,
    @Query('playerId') playerId?: string,
  ) {
    const gameInfo = this.ludoService.getGameInfo(gameId);
    if ('error' in gameInfo) {
      return { error: 'Juego no encontrado' };
    }

    // Si no se proporciona playerId, devolver solo información básica
    if (!playerId) {
      return {
        gamePhase: gameInfo.gamePhase,
        gameStarted: gameInfo.gameStarted,
        currentPlayer: gameInfo.currentPlayer,
        diceValue: gameInfo.diceValue,
        winner: gameInfo.winner,
        decisionDuration: gameInfo.decisionDuration,
      };
    }

    const baseStatus = {
      gamePhase: gameInfo.gamePhase,
      gameStarted: gameInfo.gameStarted,
      currentPlayer: gameInfo.currentPlayer,
      diceValue: gameInfo.diceValue,
      winner: gameInfo.winner,
    };

    // Verificar si el jugador existe en el juego
    const player = gameInfo.players.find((p) => p.id === playerId);
    if (!player) {
      return { ...baseStatus, error: 'Jugador no encontrado en este juego' };
    }

    // Verificar si es el turno del jugador
    const isPlayerTurn =
      gameInfo.currentPlayer ===
      gameInfo.players.findIndex((p) => p.id === playerId);

    // Actualizar tiempos de acción para todos los jugadores
    this.ludoService.updatePlayerActionTimes(gameInfo);

    return {
      ...baseStatus,
      isPlayerTurn,
      canRollDice: isPlayerTurn ? gameInfo.canRollDice : false,
      canMovePiece: isPlayerTurn ? gameInfo.canMovePiece : false,
      selectedPieceId: isPlayerTurn ? gameInfo.selectedPieceId : undefined,
      playerColor: player.color,
      playerName: player.name,
    };
  }
}
