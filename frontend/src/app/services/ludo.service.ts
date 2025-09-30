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

export interface RoomInfo {
  gameId: string;
  players: Array<{
    id: string;
    name: string;
    color: string;
  }>;
  currentPlayer: number;
  diceValue: number;
  gamePhase: string;
  winner: string | null;
  gameStarted: boolean;
  availableColors: string[];
  canRollDice: boolean;
  canMovePiece: boolean;
  selectedPieceId: string | null;
  lastUpdated: string;
  version: number;
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

  getRoomInfo(gameId: string): Observable<RoomInfo | { error: string }> {
    return this.http.get<RoomInfo | { error: string }>(`${this.apiUrl}/game/${gameId}`);
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
}
