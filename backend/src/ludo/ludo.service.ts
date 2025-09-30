import { Injectable } from '@nestjs/common';

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
  private rooms: Map<string, RoomInfo> = new Map();

  // Crear una nueva sala de juego
  createRoom(): string {
    const roomId = this.generateRoomId();
    
    // Inicializar información de la sala
    this.rooms.set(roomId, {
      roomId,
      players: [],
      gameState: null,
      isFull: false,
      gameStarted: false,
      availableColors: ['red', 'blue', 'yellow', 'green']
    });

    return roomId;
  }

  // Obtener información de una sala
  getRoomInfo(roomId: string): RoomInfo | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    // Actualizar estado de la sala
    room.isFull = room.players.length >= 4;
    room.gameStarted = room.gameState?.gamePhase === 'playing';

    return room;
  }

  // Unirse a una sala
  async joinRoom(roomId: string, playerData: { name: string; color: string; playerId: string }): Promise<{ success: boolean; message: string }> {
    const room = this.rooms.get(roomId);
    if (!room) {
      return { success: false, message: 'Sala no encontrada' };
    }

    if (room.players.length >= 4) {
      return { success: false, message: 'La sala está llena' };
    }

    if (!room.availableColors.includes(playerData.color)) {
      return { success: false, message: 'Color no disponible' };
    }

    // Verificar si el jugador ya está en la sala
    if (room.players.find(p => p.id === playerData.playerId)) {
      return { success: false, message: 'Ya estás en esta sala' };
    }

    // Agregar jugador a la sala
    room.players.push({
      id: playerData.playerId,
      name: playerData.name,
      color: playerData.color,
      isReady: false
    });

    // Remover color de disponibles
    room.availableColors = room.availableColors.filter(c => c !== playerData.color);

    return { success: true, message: 'Te uniste exitosamente a la sala' };
  }

  // Obtener todas las salas disponibles
  getAvailableRooms(): RoomInfo[] {
    return Array.from(this.rooms.values()).filter(room => !room.isFull && !room.gameStarted);
  }

  // Generar ID único para la sala
  private generateRoomId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
}
