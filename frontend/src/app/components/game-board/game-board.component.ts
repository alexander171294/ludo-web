import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LudoBoardComponent } from '../ludo-board/ludo-board.component';
import { DiceComponent } from '../dice/dice.component';

@Component({
  selector: 'app-game-board',
  standalone: true,
  templateUrl: './game-board.component.html',
  styleUrls: ['./game-board.component.scss'],
  imports: [LudoBoardComponent, DiceComponent]
})
export class GameBoardComponent implements OnInit {
  roomCode: string = '';
  playerName: string = '';
  selectedColor: string = '';
  isHost: boolean = false;

  colors: { [key: string]: { name: string; hex: string } } = {
    'red': { name: 'Rojo', hex: '#EF422F' },
    'blue': { name: 'Azul', hex: '#2E9DE6' },
    'green': { name: 'Verde', hex: '#5DBE4D' },
    'yellow': { name: 'Amarillo', hex: '#ECBA11' }
  };

  // Datos de los jugadores
  players = {
    red: {
      name: 'Jugador Rojo',
      timeRemaining: 100,
      isRolling: false
    },
    blue: {
      name: 'Jugador Azul',
      timeRemaining: 100,
      isRolling: false
    },
    green: {
      name: 'Jugador Verde',
      timeRemaining: 100,
      isRolling: false
    },
    yellow: {
      name: 'Jugador Amarillo',
      timeRemaining: 100,
      isRolling: false
    }
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.roomCode = params['roomCode'] || '';
      this.playerName = params['playerName'] || '';
      this.selectedColor = params['color'] || '';
      this.isHost = params['isHost'] === 'true';
    });
  }

  getColorName(): string {
    return this.colors[this.selectedColor]?.name || this.selectedColor;
  }

  getColorHex(): string {
    return this.colors[this.selectedColor]?.hex || '#000000';
  }

  getPlayerColor(colorKey: string): string {
    return this.colors[colorKey]?.hex || '#000000';
  }

  goBack() {
    this.router.navigate(['/color-selector'], {
      queryParams: {
        roomCode: this.roomCode,
        isHost: this.isHost
      }
    });
  }
}
