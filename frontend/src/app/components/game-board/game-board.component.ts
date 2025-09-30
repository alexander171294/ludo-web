import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LudoBoardComponent } from '../ludo-board/ludo-board.component';
import { DiceComponent } from '../dice/dice.component';
import { StartGameComponent } from './start-game/start-game.component';
import { LudoService, RoomInfo } from '../../services/ludo.service';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-game-board',
  standalone: true,
  templateUrl: './game-board.component.html',
  styleUrls: ['./game-board.component.scss'],
  imports: [LudoBoardComponent, DiceComponent, StartGameComponent]
})
export class GameBoardComponent implements OnInit, OnDestroy {
  roomCode: string = '';
  playerName: string = '';
  selectedColor: string = '';
  playerId: string = '';
  isHost: boolean = false;
  gameInfo: RoomInfo | null = null;
  private gameStateSubscription?: Subscription;

  // Propiedades computadas para cada color
  get redPlayerExists(): boolean {
    return this.playerExists('red');
  }

  get bluePlayerExists(): boolean {
    return this.playerExists('blue');
  }

  get greenPlayerExists(): boolean {
    return this.playerExists('green');
  }

  get yellowPlayerExists(): boolean {
    return this.playerExists('yellow');
  }

  // Métodos para determinar el jugador actual
  getCurrentPlayerColor(): string | null {
    if (!this.gameInfo || !this.gameInfo.players.length) return null;

    const currentPlayerIndex = this.gameInfo.currentPlayer;
    const currentPlayer = this.gameInfo.players[currentPlayerIndex];
    return currentPlayer ? currentPlayer.color : null;
  }

  shouldShowDice(color: string): boolean {
    if (!this.gameInfo?.canRollDice) {
      console.log(`Dice ${color}: canRollDice is false`);
      return false;
    }

    const currentPlayerColor = this.getCurrentPlayerColor();
    const shouldShow = currentPlayerColor === color;
    console.log(`Dice ${color}: currentPlayerColor=${currentPlayerColor}, shouldShow=${shouldShow}`);
    return shouldShow;
  }

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
    private router: Router,
    private ludoService: LudoService
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.roomCode = params['roomCode'] || '';
      this.playerName = params['playerName'] || '';
      this.selectedColor = params['color'] || '';
      this.playerId = params['playerId'] || '';
      this.isHost = params['isHost'] === 'true';

      if (this.roomCode) {
        this.startGameStatePolling();
      }
    });
  }

  ngOnDestroy() {
    if (this.gameStateSubscription) {
      this.gameStateSubscription.unsubscribe();
    }
  }

  startGameStatePolling() {
    // Consultar el estado inmediatamente
    this.loadGameState();

    // Luego cada segundo
    this.gameStateSubscription = interval(1000).subscribe(() => {
      this.loadGameState();
    });
  }

  loadGameState() {
    this.ludoService.getRoomInfo(this.roomCode, this.playerId).subscribe({
      next: (response) => {
        if (!('error' in response)) {
          console.log('Estado del juego actualizado:', response);
          console.log('Número de jugadores:', response.players.length);
          console.log('Fase del juego:', response.gamePhase);
          console.log('Puede lanzar dado:', response.canRollDice);
          console.log('Puede mover pieza:', response.canMovePiece);
          this.gameInfo = response;
        }
      },
      error: (error) => {
        console.error('Error loading game state:', error);
      }
    });
  }

  onStartGame() {
    if (!this.gameInfo) return;

    console.log('Iniciando juego...');
    this.ludoService.startGame(this.gameInfo.gameId).subscribe({
      next: (response) => {
        console.log('Juego iniciado:', response);
        // El estado se actualizará automáticamente con el timer
        // y el popup desaparecerá cuando gamePhase cambie de 'waiting'
      },
      error: (error) => {
        console.error('Error al iniciar el juego:', error);
        // Aquí podrías mostrar un mensaje de error al usuario
      }
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

  getPlayerByColor(color: string) {
    if (!this.gameInfo) return null;
    return this.gameInfo.players.find(player => player.color === color);
  }

  playerExists(color: string): boolean {
    if (!this.gameInfo) {
      console.log(`Player ${color} exists: false (no gameInfo)`);
      return false;
    }

    const player = this.gameInfo.players.find(p => p.color === color);
    const exists = player !== undefined && player !== null;
    console.log(`Player ${color} exists:`, exists, 'player:', player);
    return exists;
  }

  getPlayerName(color: string): string {
    const player = this.getPlayerByColor(color);
    return player?.name || '';
  }

  getPlayerTimeRemaining(color: string): number {
    // Por ahora siempre retornamos 0 como solicitaste
    return 0;
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
