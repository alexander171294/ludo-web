import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RoomInfo } from '../../../services/ludo.service';

@Component({
  selector: 'app-start-game',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './start-game.component.html',
  styleUrl: './start-game.component.scss'
})
export class StartGameComponent implements OnChanges {
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

  ngOnChanges(changes: SimpleChanges) {
    if (changes['gameInfo']) {
      console.log('GameInfo actualizado:', this.gameInfo);
      console.log('Número de jugadores:', this.gameInfo?.players.length);
      console.log('Es host:', this.isHost);
      console.log('Puede comenzar:', this.canStartGame());
    }
  }

  getPlayerByColor(color: string) {
    if (!this.gameInfo) return null;
    return this.gameInfo.players.find(player => player.color === color);
  }

  canStartGame(): boolean {
    if (!this.gameInfo) return false;
    const canStart = this.gameInfo.players.length >= 2 && this.isHost;
    console.log(`canStartGame: players=${this.gameInfo.players.length}, isHost=${this.isHost}, result=${canStart}`);
    return canStart;
  }

  onStartGame() {
    if (this.canStartGame()) {
      this.startGame.emit();
    }
  }
}
