import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface JoinGameDto {
  name: string;
  color: string;
  playerId: string;
}

export interface CreateRoomResponse {
  gameId: string;
  message: string;
}

export interface JoinRoomResponse {
  success: boolean;
  message: string;
  roomId?: string;
}

export interface RoomInfo {
  roomId: string;
  players: Array<{
    id: string;
    name: string;
    color: string;
  }>;
  availableColors: string[];
  isGameStarted: boolean;
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

  getRoomInfo(roomId: string): Observable<RoomInfo | { error: string }> {
    return this.http.get<RoomInfo | { error: string }>(`${this.apiUrl}/room/${roomId}`);
  }

  joinRoom(roomId: string, joinData: JoinGameDto): Observable<JoinRoomResponse> {
    return this.http.post<JoinRoomResponse>(`${this.apiUrl}/room/${roomId}/join`, joinData);
  }

  getAvailableRooms(): Observable<RoomInfo[]> {
    return this.http.get<RoomInfo[]>(`${this.apiUrl}/rooms`);
  }

  getAvailableColors(roomId: string): Observable<AvailableColorsResponse> {
    return this.http.get<AvailableColorsResponse>(`${this.apiUrl}/available-colors/${roomId}`);
  }
}
