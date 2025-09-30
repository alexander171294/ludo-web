import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RoomInfo } from '../../../services/ludo.service';

@Component({
  selector: 'app-start-game',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './start-game.component.html',
  styleUrl: './start-game.component.scss'
})
export class StartGameComponent {
  @Input() gameInfo: RoomInfo | null = null;
  @Input() isHost: boolean = false;
  @Output() startGame = new EventEmitter<void>();

  colors = ['red', 'blue', 'green', 'yellow'];
  colorNames = {
    red: 'Rojo',
    blue: 'Azul',
    green: 'Verde',
    yellow: 'Amarillo'
  };

  getPlayerByColor(color: string) {
    if (!this.gameInfo) return null;
    return this.gameInfo.players.find(player => player.color === color);
  }

  canStartGame(): boolean {
    if (!this.gameInfo) return false;
    return this.gameInfo.players.length >= 2 && this.isHost;
  }

  onStartGame() {
    if (this.canStartGame()) {
      this.startGame.emit();
    }
  }
}
