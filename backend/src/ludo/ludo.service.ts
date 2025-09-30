import { Injectable } from '@nestjs/common';
import { LudoGameStateManager, LudoGameState } from './ludo-game-state';
import { LudoWatchdogService, WatchdogEvent } from './ludo-watchdog.service';

export interface RoomInfo {
  roomId: string;
  players: any[];
  gameState: any;
  isFull: boolean;
  gameStarted: boolean;
  availableColors: string[];
}

@Injectable()
export class LudoService {
  constructor(
    private gameStateManager: LudoGameStateManager,
    private watchdogService: LudoWatchdogService,
  ) {}

  // Crear una nueva sala de juego
  createGame(): { gameId: string; message: string } {
    const gameState = this.gameStateManager.createGame();
    
    // Registrar evento
    this.watchdogService.recordEvent({
      type: 'game_created',
      gameId: gameState.gameId,
      data: { gameId: gameState.gameId },
      timestamp: new Date(),
    });

    return {
      gameId: gameState.gameId,
      message: 'Juego creado exitosamente',
    };
  }

  // Obtener información de un juego
  getGameInfo(gameId: string): LudoGameState | { error: string } {
    const gameState = this.gameStateManager.getGameState(gameId);
    if (!gameState) {
      return { error: 'Juego no encontrado' };
    }
    return gameState;
  }

  // Unirse a un juego
  async joinGame(gameId: string, playerData: { name: string; color: string; playerId: string }): Promise<{ success: boolean; message: string }> {
    const result = this.gameStateManager.joinGame(gameId, playerData);
    
    if (result.success) {
      // Registrar evento
      this.watchdogService.recordEvent({
        type: 'player_joined',
        gameId,
        playerId: playerData.playerId,
        data: { playerName: playerData.name, color: playerData.color },
        timestamp: new Date(),
      });
    }

    return result;
  }

  // Marcar jugador como listo
  setPlayerReady(gameId: string, playerId: string, isReady: boolean): { success: boolean; message: string } {
    const result = this.gameStateManager.setPlayerReady(gameId, playerId, isReady);
    
    if (result.success) {
      // Registrar evento
      this.watchdogService.recordEvent({
        type: 'player_ready',
        gameId,
        playerId,
        data: { isReady },
        timestamp: new Date(),
      });
    }

    return result;
  }

  // Iniciar el juego
  startGame(gameId: string): { success: boolean; message: string } {
    const result = this.gameStateManager.startGame(gameId);
    
    if (result.success) {
      // Registrar evento
      this.watchdogService.recordEvent({
        type: 'game_started',
        gameId,
        data: { gameId },
        timestamp: new Date(),
      });
    }

    return result;
  }

  // Lanzar dado
  rollDice(gameId: string, playerId: string): { success: boolean; message: string; diceValue?: number } {
    const result = this.gameStateManager.rollDice(gameId, playerId);
    
    if (result.success) {
      // Registrar evento
      this.watchdogService.recordEvent({
        type: 'dice_rolled',
        gameId,
        playerId,
        data: { diceValue: result.diceValue },
        timestamp: new Date(),
      });
    }

    return result;
  }

  // Seleccionar pieza
  selectPiece(gameId: string, playerId: string, pieceId: number): { success: boolean; message: string } {
    const result = this.gameStateManager.selectPiece(gameId, playerId, pieceId);
    
    if (result.success) {
      // Registrar evento
      this.watchdogService.recordEvent({
        type: 'piece_selected',
        gameId,
        playerId,
        data: { pieceId },
        timestamp: new Date(),
      });
    }

    return result;
  }

  // Mover ficha
  movePiece(gameId: string, playerId: string): { success: boolean; message: string } {
    const result = this.gameStateManager.movePiece(gameId, playerId);
    
    if (result.success) {
      // Registrar evento
      this.watchdogService.recordEvent({
        type: 'piece_moved',
        gameId,
        playerId,
        data: { success: true },
        timestamp: new Date(),
      });

      // Verificar si el juego terminó
      const gameState = this.gameStateManager.getGameState(gameId);
      if (gameState?.gamePhase === 'finished') {
        this.watchdogService.recordEvent({
          type: 'game_finished',
          gameId,
          playerId: gameState.winner,
          data: { winner: gameState.winner },
          timestamp: new Date(),
        });
      }
    }

    return result;
  }

  // Obtener todos los juegos disponibles
  getAvailableGames(): LudoGameState[] {
    return this.gameStateManager.getAvailableGames();
  }

  // Obtener todos los juegos
  getAllGames(): LudoGameState[] {
    return this.gameStateManager.getAllGames();
  }

  // Eliminar juego
  deleteGame(gameId: string): { success: boolean; message: string } {
    const deleted = this.gameStateManager.deleteGame(gameId);
    return {
      success: deleted,
      message: deleted ? 'Juego eliminado exitosamente' : 'Juego no encontrado',
    };
  }

  // Suscribirse a cambios en un juego
  subscribeToGame(gameId: string, playerId: string, callback: (gameState: LudoGameState) => void): string {
    return this.watchdogService.subscribe(gameId, playerId, callback);
  }

  // Cancelar suscripción
  unsubscribeFromGame(subscriptionId: string): boolean {
    return this.watchdogService.unsubscribe(subscriptionId);
  }

  // Obtener historial de eventos de un juego
  getGameEventHistory(gameId: string, limit: number = 50): WatchdogEvent[] {
    return this.watchdogService.getGameEventHistory(gameId, limit);
  }

  // Obtener estadísticas del watchdog
  getWatchdogStats() {
    return this.watchdogService.getWatchdogStats();
  }

  // Limpiar datos antiguos
  cleanupOldData(): void {
    this.watchdogService.cleanupOldData();
  }
}
