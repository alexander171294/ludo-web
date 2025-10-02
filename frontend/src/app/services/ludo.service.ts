import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface JoinGameDto {
  name: string;
  color: string;
}

export interface CreateRoomResponse {
  gameId: string;
  message: string;
}

export interface JoinRoomResponse {
  success: boolean;
  message: string;
  gameId: string;
  playerId: string;
}

export interface Piece {
  id: number;
  position: string;
  isInStartZone: boolean;
  isInBoard: boolean;
  isInColorPath: boolean;
  isInEndPath: boolean;
}

export interface Player {
  id: string;
  name: string;
  color: string;
  pieces: Piece[];
  actionTimeLeft?: number;
  action?: string;
  diceValue?: number;
}

export interface Move {
  pieceId: number;
  playerColor: string;
  fromPosition: string;
  toPosition: string;
  moveType: string;
}

export interface LastMove {
  moveId: string;
  moves: Move[];
  playerColor: string;
  diceValue: number;
  timestamp: string;
}

export interface RoomInfo {
  gameId: string;
  players: Player[];
  currentPlayer: number;
  diceValue: number;
  gamePhase: string;
  winner: string | null;
  gameStarted: boolean;
  availableColors: string[];
  canRollDice: boolean;
  canMovePiece: boolean;
  selectedPieceId: string | null;
  decisionDuration: number;
  lastUpdated: string;
  version: number;
  lastMove?: LastMove;
}

export interface AvailableColorsResponse {
  colors: string[];
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class LudoService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  createRoom(): Observable<CreateRoomResponse> {
    return this.http.post<CreateRoomResponse>(`${this.apiUrl}/create-game`, {});
  }

  getRoomInfo(gameId: string, playerId?: string): Observable<RoomInfo | { error: string }> {
    const url = playerId
      ? `${this.apiUrl}/game/${gameId}?playerId=${playerId}`
      : `${this.apiUrl}/game/${gameId}`;
    return this.http.get<RoomInfo | { error: string }>(url);
  }

  joinRoom(gameId: string, joinData: JoinGameDto): Observable<JoinRoomResponse> {
    return this.http.post<JoinRoomResponse>(`${this.apiUrl}/game/${gameId}/join`, joinData);
  }

  getAvailableRooms(): Observable<RoomInfo[]> {
    return this.http.get<RoomInfo[]>(`${this.apiUrl}/rooms`);
  }

  getAvailableColors(roomId: string): Observable<AvailableColorsResponse> {
    return this.http.get<AvailableColorsResponse>(`${this.apiUrl}/available-colors/${roomId}`);
  }

  startGame(gameId: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.apiUrl}/game/${gameId}/start`, {});
  }

  rollDice(gameId: string, playerId: string): Observable<{ success: boolean; message: string; diceValue?: number }> {
    return this.http.post<{ success: boolean; message: string; diceValue?: number }>(`${this.apiUrl}/game/${gameId}/player/${playerId}/roll-dice`, {});
  }

  selectPiece(gameId: string, playerId: string, pieceId: number): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.apiUrl}/game/${gameId}/player/${playerId}/select-piece`, {
      pieceId: pieceId
    });
  }
}
