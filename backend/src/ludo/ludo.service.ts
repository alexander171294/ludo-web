import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
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
  async joinGame(gameId: string, playerData: { name: string; color: string }): Promise<{ success: boolean; message: string; playerId?: string }> {
    const playerId = uuidv4();
    const result = this.gameStateManager.joinGame(gameId, { ...playerData, playerId });
    
    if (result.success) {
      // Registrar evento
      this.watchdogService.recordEvent({
        type: 'player_joined',
        gameId,
        playerId,
        data: { playerName: playerData.name, color: playerData.color },
        timestamp: new Date(),
      });
    }

    return {
      ...result,
      playerId: result.success ? playerId : undefined,
    };
  }

  // Rejoin a un juego existente
  rejoinGame(gameId: string, playerId: string): { success: boolean; message: string; playerData?: { name: string; color: string } } {
    const gameState = this.gameStateManager.getGameState(gameId);
    if (!gameState) {
      return { success: false, message: 'Juego no encontrado' };
    }

    const player = gameState.players.find(p => p.id === playerId);
    if (!player) {
      return { success: false, message: 'Jugador no encontrado en este juego' };
    }

    return {
      success: true,
      message: 'Rejoin exitoso',
      playerData: {
        name: player.name,
        color: player.color,
      },
    };
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

      // Programar aplicación del resultado después de 5 segundos
      setTimeout(() => {
        this.applyDiceResult(gameId);
      }, 5000); // 5 segundos para la animación

      // Programar verificación periódica del tiempo restante
      this.scheduleTimeoutCheck(gameId, playerId);
    }

    return result;
  }

  // Programar verificación periódica del tiempo restante
  private scheduleTimeoutCheck(gameId: string, playerId: string): void {
    const checkInterval = setInterval(() => {
      const gameState = this.gameStateManager.getGameState(gameId);
      if (!gameState) {
        clearInterval(checkInterval);
        return;
      }

      const currentPlayer = gameState.players[gameState.currentPlayer];
      if (!currentPlayer || currentPlayer.id !== playerId) {
        clearInterval(checkInterval);
        return;
      }

      // Actualizar tiempos de acción
      this.updatePlayerActionTimes(gameState);

      // Si el tiempo se agotó, ejecutar acción automática
      if (currentPlayer.actionTimeLeft === 0 || currentPlayer.actionTimeLeft === undefined) {
        clearInterval(checkInterval);
        this.handleTimeoutAction(gameId, playerId);
      }
    }, 1000); // Verificar cada segundo
  }

  // Aplicar resultado del dado
  applyDiceResult(gameId: string): { success: boolean; message: string } {
    const result = this.gameStateManager.applyDiceResult(gameId);
    
    if (result.success) {
      // Registrar evento
      this.watchdogService.recordEvent({
        type: 'dice_result_applied',
        gameId,
        data: { message: 'Resultado del dado aplicado' },
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

      // Programar verificación periódica del tiempo restante
      this.scheduleTimeoutCheck(gameId, playerId);
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

  // Obtener tiempo restante del temporizador de decisión
  getDecisionTimeLeft(gameState: LudoGameState): number | undefined {
    return this.gameStateManager.getDecisionTimeLeft(gameState);
  }

  // Actualizar tiempos de acción para todos los jugadores
  updatePlayerActionTimes(gameState: LudoGameState): void {
    this.gameStateManager.updatePlayerActionTimes(gameState);
  }

  // Manejar acción automática cuando se agota el tiempo
  private handleTimeoutAction(gameId: string, playerId: string): void {
    const gameState = this.gameStateManager.getGameState(gameId);
    if (!gameState) return;

    const currentPlayer = gameState.players[gameState.currentPlayer];
    if (currentPlayer.id !== playerId) return;

    // Si está lanzando el dado, aplicar el resultado
    if (currentPlayer.action === 'rolling') {
      this.applyDiceResult(gameId);
      return;
    }

    // Si puede lanzar dado pero no lo ha hecho, lanzarlo automáticamente
    if (gameState.canRollDice) {
      this.rollDice(gameId, playerId);
      return;
    }

    // Si puede mover pieza pero no ha seleccionado una, seleccionar automáticamente
    if (gameState.canMovePiece && !gameState.selectedPieceId) {
      const availablePieces = this.gameStateManager.getAvailablePieces(currentPlayer, gameState.diceValue);
      if (availablePieces.length > 0) {
        // Seleccionar la primera pieza disponible
        const randomPiece = availablePieces[Math.floor(Math.random() * availablePieces.length)];
        this.selectPiece(gameId, playerId, randomPiece.id);
      }
    }
  }
}
