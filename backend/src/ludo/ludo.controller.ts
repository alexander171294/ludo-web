import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { LudoService, RoomInfo } from './ludo.service';

interface JoinGameDto {
  name: string;
  color: string;
  playerId: string;
}

interface CreateRoomResponse {
  roomId: string;
  message: string;
}

interface JoinRoomResponse {
  success: boolean;
  message: string;
  roomId?: string;
}

@Controller('ludo')
export class LudoController {
  constructor(private readonly ludoService: LudoService) {}

  @Post('create-room')
  createRoom(): CreateRoomResponse {
    const roomId = this.ludoService.createRoom();
    return {
      roomId,
      message: 'Sala creada exitosamente',
    };
  }

  @Get('room/:roomId')
  getRoomInfo(@Param('roomId') roomId: string): RoomInfo | { error: string } {
    const roomInfo = this.ludoService.getRoomInfo(roomId);
    if (!roomInfo) {
      return { error: 'Sala no encontrada' };
    }
    return roomInfo;
  }

  @Post('room/:roomId/join')
  async joinRoom(
    @Param('roomId') roomId: string,
    @Body() joinData: JoinGameDto,
  ): Promise<JoinRoomResponse> {
    const result = await this.ludoService.joinRoom(roomId, joinData);
    return {
      ...result,
      roomId: result.success ? roomId : undefined,
    };
  }

  @Get('rooms')
  getAvailableRooms(): RoomInfo[] {
    return this.ludoService.getAvailableRooms();
  }

  @Get('available-colors')
  getAvailableColors() {
    return {
      colors: ['red', 'blue', 'yellow', 'green'],
    };
  }
}
