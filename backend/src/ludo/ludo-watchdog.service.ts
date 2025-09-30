import { Injectable, Logger } from '@nestjs/common';
import { LudoGameState, LudoGameStateManager } from './ludo-game-state';

export interface WatchdogSubscription {
  id: string;
  gameId: string;
  playerId: string;
  lastVersion: number;
  callback: (gameState: LudoGameState) => void;
  isActive: boolean;
}

export interface WatchdogEvent {
  type:
    | 'game_created'
    | 'player_joined'
    | 'player_ready'
    | 'game_started'
    | 'dice_rolled'
    | 'piece_selected'
    | 'piece_moved'
    | 'game_finished';
  gameId: string;
  playerId?: string;
  data: any;
  timestamp: Date;
}

@Injectable()
export class LudoWatchdogService {
  private readonly logger = new Logger(LudoWatchdogService.name);
  private subscriptions: Map<string, WatchdogSubscription> = new Map();
  private gameVersions: Map<string, number> = new Map();
  private eventHistory: Map<string, WatchdogEvent[]> = new Map();
  private isRunning = false;
  private checkInterval: NodeJS.Timeout | null = null;

  constructor(private gameStateManager: LudoGameStateManager) {
    this.startWatchdog();
  }

  // Suscribirse a cambios en un juego
  subscribe(
    gameId: string,
    playerId: string,
    callback: (gameState: LudoGameState) => void,
  ): string {
    const subscriptionId = `${gameId}-${playerId}-${Date.now()}`;

    const subscription: WatchdogSubscription = {
      id: subscriptionId,
      gameId,
      playerId,
      lastVersion: this.gameVersions.get(gameId) || 0,
      callback,
      isActive: true,
    };

    this.subscriptions.set(subscriptionId, subscription);
    this.logger.log(
      `Nueva suscripción: ${subscriptionId} para juego ${gameId}`,
    );

    // Enviar estado actual inmediatamente
    const currentState = this.gameStateManager.getGameState(gameId);
    if (currentState) {
      callback(currentState);
    }

    return subscriptionId;
  }

  // Cancelar suscripción
  unsubscribe(subscriptionId: string): boolean {
    const subscription = this.subscriptions.get(subscriptionId);
    if (subscription) {
      subscription.isActive = false;
      this.subscriptions.delete(subscriptionId);
      this.logger.log(`Suscripción cancelada: ${subscriptionId}`);
      return true;
    }
    return false;
  }

  // Cancelar todas las suscripciones de un jugador en un juego
  unsubscribePlayer(gameId: string, playerId: string): number {
    let count = 0;
    for (const [id, subscription] of this.subscriptions.entries()) {
      if (
        subscription.gameId === gameId &&
        subscription.playerId === playerId
      ) {
        subscription.isActive = false;
        this.subscriptions.delete(id);
        count++;
      }
    }
    this.logger.log(
      `Canceladas ${count} suscripciones para jugador ${playerId} en juego ${gameId}`,
    );
    return count;
  }

  // Registrar un evento
  recordEvent(event: WatchdogEvent): void {
    if (!this.eventHistory.has(event.gameId)) {
      this.eventHistory.set(event.gameId, []);
    }

    const events = this.eventHistory.get(event.gameId)!;
    events.push(event);

    // Mantener solo los últimos 100 eventos por juego
    if (events.length > 100) {
      events.splice(0, events.length - 100);
    }

    this.logger.debug(
      `Evento registrado: ${event.type} para juego ${event.gameId}`,
    );
  }

  // Obtener historial de eventos de un juego
  getGameEventHistory(gameId: string, limit: number = 50): WatchdogEvent[] {
    const events = this.eventHistory.get(gameId) || [];
    return events.slice(-limit);
  }

  // Obtener estadísticas del watchdog
  getWatchdogStats(): {
    activeSubscriptions: number;
    totalGames: number;
    totalEvents: number;
    isRunning: boolean;
  } {
    const activeSubscriptions = Array.from(this.subscriptions.values()).filter(
      (sub) => sub.isActive,
    ).length;

    const totalGames = this.gameStateManager.getAllGames().length;

    const totalEvents = Array.from(this.eventHistory.values()).reduce(
      (sum, events) => sum + events.length,
      0,
    );

    return {
      activeSubscriptions,
      totalGames,
      totalEvents,
      isRunning: this.isRunning,
    };
  }

  // Iniciar el watchdog
  private startWatchdog(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.logger.log('Iniciando watchdog de Ludo...');

    // Verificar cambios cada 500ms
    this.checkInterval = setInterval(() => {
      this.checkForChanges();
    }, 500);
  }

  // Detener el watchdog
  stopWatchdog(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.isRunning = false;
    this.logger.log('Watchdog detenido');
  }

  // Verificar cambios en los juegos
  private checkForChanges(): void {
    const games = this.gameStateManager.getAllGames();

    for (const game of games) {
      const currentVersion = this.gameVersions.get(game.gameId) || 0;

      if (game.version > currentVersion) {
        this.gameVersions.set(game.gameId, game.version);
        this.notifySubscribers(game);
      }
    }
  }

  // Notificar a los suscriptores
  private notifySubscribers(game: LudoGameState): void {
    const gameSubscriptions = Array.from(this.subscriptions.values()).filter(
      (sub) => sub.gameId === game.gameId && sub.isActive,
    );

    for (const subscription of gameSubscriptions) {
      try {
        subscription.callback(game);
        subscription.lastVersion = game.version;
      } catch (error) {
        this.logger.error(
          `Error notificando suscripción ${subscription.id}:`,
          error,
        );
        // Marcar suscripción como inactiva si hay error
        subscription.isActive = false;
      }
    }
  }

  // Limpiar suscripciones inactivas
  cleanupInactiveSubscriptions(): number {
    let count = 0;
    for (const [id, subscription] of this.subscriptions.entries()) {
      if (!subscription.isActive) {
        this.subscriptions.delete(id);
        count++;
      }
    }

    if (count > 0) {
      this.logger.log(`Limpiadas ${count} suscripciones inactivas`);
    }

    return count;
  }

  // Obtener suscripciones activas para un juego
  getGameSubscriptions(gameId: string): WatchdogSubscription[] {
    return Array.from(this.subscriptions.values()).filter(
      (sub) => sub.gameId === gameId && sub.isActive,
    );
  }

  // Verificar si un jugador está suscrito a un juego
  isPlayerSubscribed(gameId: string, playerId: string): boolean {
    return Array.from(this.subscriptions.values()).some(
      (sub) =>
        sub.gameId === gameId && sub.playerId === playerId && sub.isActive,
    );
  }

  // Forzar notificación a todos los suscriptores de un juego
  forceNotifyGame(gameId: string): void {
    const game = this.gameStateManager.getGameState(gameId);
    if (game) {
      this.notifySubscribers(game);
    }
  }

  // Limpiar datos antiguos (ejecutar periódicamente)
  cleanupOldData(): void {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Limpiar eventos antiguos
    for (const [gameId, events] of this.eventHistory.entries()) {
      const recentEvents = events.filter(
        (event) => event.timestamp > oneHourAgo,
      );
      if (recentEvents.length === 0) {
        this.eventHistory.delete(gameId);
      } else {
        this.eventHistory.set(gameId, recentEvents);
      }
    }

    // Limpiar versiones de juegos que ya no existen
    const existingGameIds = new Set(
      this.gameStateManager.getAllGames().map((g) => g.gameId),
    );
    for (const gameId of this.gameVersions.keys()) {
      if (!existingGameIds.has(gameId)) {
        this.gameVersions.delete(gameId);
      }
    }

    this.logger.log('Limpieza de datos antiguos completada');
  }
}
