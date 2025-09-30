import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
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

  // Referencias a los componentes de dados
  @ViewChild('redDice') redDice!: DiceComponent;
  @ViewChild('blueDice') blueDice!: DiceComponent;
  @ViewChild('greenDice') greenDice!: DiceComponent;
  @ViewChild('yellowDice') yellowDice!: DiceComponent;

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
      isRolling: false,
      diceValue: 1
    },
    blue: {
      name: 'Jugador Azul',
      timeRemaining: 100,
      isRolling: false,
      diceValue: 1
    },
    green: {
      name: 'Jugador Verde',
      timeRemaining: 100,
      isRolling: false,
      diceValue: 1
    },
    yellow: {
      name: 'Jugador Amarillo',
      timeRemaining: 100,
      isRolling: false,
      diceValue: 1
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

  /**
   * Maneja el click en un dado específico
   * @param color - Color del jugador (red, blue, green, yellow)
   */
  onDiceClick(color: string) {
    if (this.players[color as keyof typeof this.players].isRolling) {
      return; // No permitir click si ya está rodando
    }

    // Generar número aleatorio del 1 al 6
    const randomValue = Math.floor(Math.random() * 6) + 1;

    console.log(`Dado ${color} lanzado: ${randomValue}`);

    // Llamar al método roll del dado correspondiente
    switch (color) {
      case 'red':
        this.redDice?.roll(randomValue);
        break;
      case 'blue':
        this.blueDice?.roll(randomValue);
        break;
      case 'green':
        this.greenDice?.roll(randomValue);
        break;
      case 'yellow':
        this.yellowDice?.roll(randomValue);
        break;
    }
  }

  /**
   * Maneja el evento cuando el dado termina de rodar
   * @param color - Color del jugador
   * @param value - Valor final del dado
   */
  onDiceRolled(color: string, value: number) {
    this.players[color as keyof typeof this.players].isRolling = false;
    this.players[color as keyof typeof this.players].diceValue = value;
    console.log(`Dado ${color} terminó de rodar con valor: ${value}`);
  }

  /**
   * Maneja el cambio de estado de rodado del dado
   * @param color - Color del jugador
   * @param isRolling - Estado de rodado
   */
  onRollingStateChanged(color: string, isRolling: boolean) {
    this.players[color as keyof typeof this.players].isRolling = isRolling;
  }
}
