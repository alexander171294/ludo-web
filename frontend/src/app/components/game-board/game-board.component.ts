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
  private rollingPlayers: Set<string> = new Set(); // Control de jugadores que ya están rodando

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
    if (!this.gameInfo) {
      return false;
    }

    const player = this.getPlayerByColor(color);
    if (!player) {
      return false;
    }

    // Mostrar dado si el jugador puede lanzar o si está rodando
    const canRoll = this.gameInfo.canRollDice && this.getCurrentPlayerColor() === color;
    const isRolling = player.action === 'rolling';

    const shouldShow = canRoll || isRolling;
    console.log(`Dice ${color}: canRoll=${canRoll}, isRolling=${isRolling}, shouldShow=${shouldShow}`);
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
    // Limpiar el estado de rolling
    this.rollingPlayers.clear();
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

          // Procesar jugadores que están rodando
          this.processRollingPlayers(response);

          this.gameInfo = response;
        }
      },
      error: (error) => {
        console.error('Error loading game state:', error);
      }
    });
  }

  /**
   * Procesa los jugadores que tienen action: 'rolling' y hace rodar sus dados
   */
  private processRollingPlayers(gameInfo: RoomInfo) {
    gameInfo.players.forEach(player => {
      if (player.action === 'rolling' && player.diceValue !== undefined) {
        const playerColor = player.color;

        // Verificar si este jugador ya está rodando para evitar múltiples llamadas
        if (!this.rollingPlayers.has(playerColor)) {
          console.log(`Iniciando roll para jugador ${playerColor} con valor ${player.diceValue}`);

          // Marcar como rodando
          this.rollingPlayers.add(playerColor);

          // Hacer rodar el dado
          this.rollDiceWithValue(playerColor, player.diceValue);
        }
      } else if (player.action !== 'rolling') {
        // Si el jugador ya no está rodando, removerlo del set
        this.rollingPlayers.delete(player.color);
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
    const player = this.getPlayerByColor(color);
    return player?.actionTimeLeft || 0;
  }

  isPlayerTurn(color: string): boolean {
    const player = this.getPlayerByColor(color);
    return player?.action === 'roll_dice' || false;
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
    if (!this.gameInfo || !this.playerId) {
      console.error('No hay información del juego o playerId');
      return;
    }

    // Verificar que es el turno del jugador actual
    const currentPlayerColor = this.getCurrentPlayerColor();
    if (currentPlayerColor !== color) {
      console.log(`No es el turno del jugador ${color}`);
      return;
    }

    // Verificar que el dado no esté rodando
    if (this.players[color as keyof typeof this.players].isRolling) {
      return; // No permitir click si ya está rodando
    }

    console.log(`Lanzando dado para ${color}...`);

    // Llamar al endpoint del backend
    this.ludoService.rollDice(this.gameInfo.gameId, this.playerId).subscribe({
      next: (response) => {
        console.log('Respuesta del dado:', response);

        if (response.success && response.diceValue) {
          // Llamar al método roll del dado correspondiente con el valor del backend
          this.rollDiceWithValue(color, response.diceValue);
        } else {
          console.error('Error al lanzar el dado:', response.message);
        }
      },
      error: (error) => {
        console.error('Error al lanzar el dado:', error);
      }
    });
  }

  /**
   * Lanza el dado con el valor específico del backend
   * @param color - Color del jugador
   * @param value - Valor del dado del backend
   */
  private rollDiceWithValue(color: string, value: number) {
    console.log(`Dado ${color} lanzado con valor: ${value}`);

    // Asegurar que el dado esté visible antes de hacer la animación
    setTimeout(() => {
      // Llamar al método roll del dado correspondiente
      switch (color) {
        case 'red':
          if (this.redDice) {
            console.log('Lanzando dado rojo...');
            this.animateDiceRoll(this.redDice, value);
          }
          break;
        case 'blue':
          if (this.blueDice) {
            console.log('Lanzando dado azul...');
            this.animateDiceRoll(this.blueDice, value);
          }
          break;
        case 'green':
          if (this.greenDice) {
            console.log('Lanzando dado verde...');
            this.animateDiceRoll(this.greenDice, value);
          }
          break;
        case 'yellow':
          if (this.yellowDice) {
            console.log('Lanzando dado amarillo...');
            this.animateDiceRoll(this.yellowDice, value);
          }
          break;
      }
    }, 100); // Pequeño delay para asegurar que el dado esté renderizado
  }

  /**
   * Anima el dado correctamente para que ruede antes de mostrar el resultado
   * @param diceComponent - Componente del dado
   * @param result - Resultado final del dado
   */
  private animateDiceRoll(diceComponent: DiceComponent, result: number) {
    // Primero establecer el estado de rodando
    diceComponent.isRolling = true;
    diceComponent.rollingStateChanged.emit(true);

    // Iniciar la animación de lanzamiento
    setTimeout(() => {
      diceComponent.isThrowing = true;
    }, 50);

    // Mostrar el resultado después de la animación (2 segundos)
    setTimeout(() => {
      diceComponent.diceValue = result;
      diceComponent.isRolling = false;
      diceComponent.isThrowing = false;
      diceComponent.rollingStateChanged.emit(false);
      diceComponent.diceRolled.emit(result);
    }, 2000);
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
