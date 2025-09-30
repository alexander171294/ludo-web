import { v4 as uuidv4 } from 'uuid';

export interface Player {
  id: string;
  name: string;
  color: string;
  pieces: Piece[];
  rollingDice?: boolean; // Si está lanzando el dado
  rollingDiceTimeLeft?: number; // Tiempo restante para lanzar dado (0-100)
  decisionTimeLeft?: number; // Tiempo restante para tomar decisión (0-100)
  diceValue?: number; // Valor del dado que obtuvo
}

export interface Piece {
  id: number; // 0-3 (pawn-1 a pawn-4)
  position: string; // sp1-sp4, p0-p51, cp0-cp4, ep1-ep4
  isInStartZone: boolean;
  isInBoard: boolean;
  isInColorPath: boolean;
  isInEndPath: boolean;
  boardPosition?: number; // 0-51 para posiciones del tablero
  colorPathPosition?: number; // 0-4 para posiciones del color path
  endPathPosition?: number; // 1-4 para posiciones del end path
}

export interface LudoGameState {
  gameId: string;
  players: Player[];
  currentPlayer: number;
  diceValue: number;
  gamePhase: 'waiting' | 'playing' | 'finished';
  winner: string | null;
  gameStarted: boolean;
  availableColors: string[];
  canRollDice: boolean;
  canMovePiece: boolean;
  selectedPieceId?: number;
  decisionStartTime?: Date; // Cuándo empezó el tiempo de decisión
  decisionDuration: number; // Duración del tiempo de decisión (30000 = 30 segundos)
  lastUpdated: Date;
  version: number; // Para control de versiones en el watchdog
}

export interface GameAction {
  id: string;
  gameId: string;
  playerId: string;
  action: string;
  data: any;
  timestamp: Date;
  processed: boolean;
}

const COLORS = ['red', 'blue', 'yellow', 'green'];
const BOARD_SIZE = 52;
const COLOR_PATH_SIZE = 5; // cp0 a cp4
const END_PATH_SIZE = 4; // ep1 a ep4

// Posiciones de entrada al color path para cada color
const COLOR_PATH_ENTRY_POSITIONS = {
  red: 50, // posición 50 del tablero
  blue: 11, // posición 11 del tablero
  yellow: 24, // posición 24 del tablero
  green: 37, // posición 37 del tablero
};

// Posiciones de inicio en el tablero para cada color
const START_BOARD_POSITIONS = {
  red: 1, // posición 1 del tablero
  blue: 14, // posición 14 del tablero
  yellow: 27, // posición 27 del tablero
  green: 40, // posición 40 del tablero
};

// Posiciones especiales donde NO se puede capturar (estrellas y comienzos de color)
const SAFE_POSITIONS = [
  // Posiciones de inicio de cada color
  1, 14, 27, 40,
  // Posiciones estrella (cada 8 casillas)
  9, 22, 35, 48,
];

export class LudoGameStateManager {
  private gameStates: Map<string, LudoGameState> = new Map();
  private gameActions: Map<string, GameAction[]> = new Map();

  // Crear un nuevo juego
  createGame(): LudoGameState {
    const gameId = uuidv4();
    const gameState: LudoGameState = {
      gameId,
      players: [],
      currentPlayer: 0,
      diceValue: 0,
      gamePhase: 'waiting',
      winner: null,
      gameStarted: false,
      availableColors: [...COLORS],
      canRollDice: false,
      canMovePiece: false,
      selectedPieceId: undefined,
      decisionStartTime: undefined,
      decisionDuration: 30000, // 30 segundos para tomar decisiones
      lastUpdated: new Date(),
      version: 1,
    };

    this.gameStates.set(gameId, gameState);
    this.gameActions.set(gameId, []);
    return gameState;
  }

  // Obtener estado del juego
  getGameState(gameId: string): LudoGameState | null {
    return this.gameStates.get(gameId) || null;
  }

  // Unirse al juego
  joinGame(gameId: string, playerData: { name: string; color: string; playerId: string }): { success: boolean; message: string } {
    const gameState = this.gameStates.get(gameId);
    if (!gameState) {
      return { success: false, message: 'Juego no encontrado' };
    }

    if (gameState.gamePhase !== 'waiting') {
      return { success: false, message: 'El juego ya ha comenzado' };
    }

    if (gameState.players.length >= 4) {
      return { success: false, message: 'El juego está lleno' };
    }

    if (!gameState.availableColors.includes(playerData.color)) {
      return { success: false, message: 'Color no disponible' };
    }

    // Verificar si el jugador ya está en el juego
    if (gameState.players.find(p => p.id === playerData.playerId)) {
      return { success: false, message: 'Ya estás en este juego' };
    }

    const player: Player = {
      id: playerData.playerId,
      name: playerData.name,
      color: playerData.color,
      pieces: Array.from({ length: 4 }, (_, i) => ({
        id: i,
        position: `sp${i + 1}`, // sp1, sp2, sp3, sp4
        isInStartZone: true,
        isInBoard: false,
        isInColorPath: false,
        isInEndPath: false,
      })),
    };

    gameState.players.push(player);
    gameState.availableColors = gameState.availableColors.filter(c => c !== playerData.color);
    this.updateGameState(gameId, gameState);

    return { success: true, message: 'Te uniste exitosamente al juego' };
  }


  // Iniciar el juego
  startGame(gameId: string): { success: boolean; message: string } {
    const gameState = this.gameStates.get(gameId);
    if (!gameState) {
      return { success: false, message: 'Juego no encontrado' };
    }

    if (gameState.gamePhase !== 'waiting') {
      return { success: false, message: 'El juego ya ha comenzado' };
    }

    if (gameState.players.length < 2) {
      return { success: false, message: 'Se necesitan al menos 2 jugadores' };
    }

    gameState.gamePhase = 'playing';
    gameState.gameStarted = true;
    gameState.currentPlayer = 0;
    gameState.canRollDice = true;
    gameState.canMovePiece = false;
    this.updateGameState(gameId, gameState);

    return { success: true, message: 'Juego iniciado' };
  }

  // Lanzar dado
  rollDice(gameId: string, playerId: string): { success: boolean; message: string; diceValue?: number } {
    const gameState = this.gameStates.get(gameId);
    if (!gameState) {
      return { success: false, message: 'Juego no encontrado' };
    }

    if (gameState.gamePhase !== 'playing') {
      return { success: false, message: 'El juego no está en curso' };
    }

    const currentPlayer = gameState.players[gameState.currentPlayer];
    if (currentPlayer.id !== playerId) {
      return { success: false, message: 'No es tu turno' };
    }

    if (!gameState.canRollDice) {
      return { success: false, message: 'No puedes lanzar el dado en este momento' };
    }

    // Generar valor del dado inmediatamente
    const diceValue = Math.floor(Math.random() * 6) + 1;
    gameState.diceValue = diceValue;
    gameState.canRollDice = false;

    // Marcar que el jugador está lanzando el dado
    currentPlayer.rollingDice = true;
    currentPlayer.diceValue = diceValue;

    // Iniciar temporizador de decisión
    gameState.decisionStartTime = new Date();

    this.updateGameState(gameId, gameState);

    return { success: true, message: 'Dado lanzado', diceValue };
  }


  // Seleccionar pieza para mover
  selectPiece(gameId: string, playerId: string, pieceId: number): { success: boolean; message: string } {
    const gameState = this.gameStates.get(gameId);
    if (!gameState) {
      return { success: false, message: 'Juego no encontrado' };
    }

    if (gameState.gamePhase !== 'playing') {
      return { success: false, message: 'El juego no está en curso' };
    }

    const currentPlayer = gameState.players[gameState.currentPlayer];
    if (currentPlayer.id !== playerId) {
      return { success: false, message: 'No es tu turno' };
    }

    if (!gameState.canMovePiece) {
      return { success: false, message: 'No puedes seleccionar una pieza en este momento' };
    }

    const piece = currentPlayer.pieces.find(p => p.id === pieceId);
    if (!piece) {
      return { success: false, message: 'Pieza no encontrada' };
    }

    const availablePieces = this.getAvailablePieces(currentPlayer, gameState.diceValue);
    if (!availablePieces.find(p => p.id === pieceId)) {
      return { success: false, message: 'Esta pieza no puede moverse' };
    }

    gameState.selectedPieceId = pieceId;
    
    // Limpiar estado del jugador
    currentPlayer.rollingDice = false;
    currentPlayer.diceValue = undefined;
    gameState.decisionStartTime = undefined;

    this.updateGameState(gameId, gameState);

    return { success: true, message: 'Pieza seleccionada' };
  }

  // Mover ficha
  movePiece(gameId: string, playerId: string): { success: boolean; message: string } {
    const gameState = this.gameStates.get(gameId);
    if (!gameState) {
      return { success: false, message: 'Juego no encontrado' };
    }

    if (gameState.gamePhase !== 'playing') {
      return { success: false, message: 'El juego no está en curso' };
    }

    const currentPlayer = gameState.players[gameState.currentPlayer];
    if (currentPlayer.id !== playerId) {
      return { success: false, message: 'No es tu turno' };
    }

    if (!gameState.canMovePiece || gameState.selectedPieceId === undefined) {
      return { success: false, message: 'No hay pieza seleccionada para mover' };
    }

    const piece = currentPlayer.pieces.find(p => p.id === gameState.selectedPieceId);
    if (!piece) {
      return { success: false, message: 'Pieza no encontrada' };
    }

    // Mover la ficha y verificar capturas
    this.movePieceLogic(piece, gameState.diceValue, currentPlayer.color, gameState.players);

    // Verificar si ganó
    if (this.isPlayerWinner(currentPlayer)) {
      gameState.winner = currentPlayer.id;
      gameState.gamePhase = 'finished';
      this.updateGameState(gameId, gameState);
      return { success: true, message: `¡${currentPlayer.name} ha ganado!` };
    }

    // Limpiar estado del jugador actual
    currentPlayer.rollingDice = false;
    currentPlayer.diceValue = undefined;
    gameState.decisionStartTime = undefined;

    // Si sacó 6, puede tirar de nuevo
    if (gameState.diceValue === 6) {
      gameState.canRollDice = true;
      gameState.canMovePiece = false;
      gameState.selectedPieceId = undefined;
    } else {
      // Pasar turno al siguiente jugador
      gameState.currentPlayer = (gameState.currentPlayer + 1) % gameState.players.length;
      gameState.canRollDice = true;
      gameState.canMovePiece = false;
      gameState.selectedPieceId = undefined;
    }

    this.updateGameState(gameId, gameState);

    return { success: true, message: 'Ficha movida exitosamente' };
  }

  // Obtener piezas que pueden moverse
  public getAvailablePieces(player: Player, diceValue: number): Piece[] {
    return player.pieces.filter(piece => this.canMovePiece(piece, diceValue));
  }

  // Verificar si una ficha puede moverse
  private canMovePiece(piece: Piece, diceValue: number): boolean {
    // Si está en start zone, solo puede salir con 6
    if (piece.isInStartZone) {
      return diceValue === 6;
    }

    // Si está en end path, no puede moverse más
    if (piece.isInEndPath) {
      return false;
    }

    // Si está en color path, verificar si puede avanzar
    if (piece.isInColorPath) {
      const currentPos = piece.colorPathPosition || 0;
      const newPos = currentPos + diceValue;
      return newPos <= COLOR_PATH_SIZE - 1; // cp0 a cp4
    }

    // Si está en el tablero, puede moverse normalmente
    if (piece.isInBoard) {
      return true;
    }

    return false;
  }

  // Mover una ficha
  private movePieceLogic(piece: Piece, diceValue: number, color: string, allPlayers: Player[]): void {
    if (piece.isInStartZone && diceValue === 6) {
      // Salir de start zone al tablero
      piece.isInStartZone = false;
      piece.isInBoard = true;
      piece.position = `p${START_BOARD_POSITIONS[color as keyof typeof START_BOARD_POSITIONS]}`;
      piece.boardPosition = START_BOARD_POSITIONS[color as keyof typeof START_BOARD_POSITIONS];
    } else if (piece.isInBoard) {
      // Mover en el tablero
      const currentPos = piece.boardPosition || 0;
      const newPos = currentPos + diceValue;
      const entryPos = COLOR_PATH_ENTRY_POSITIONS[color as keyof typeof COLOR_PATH_ENTRY_POSITIONS];

      if (newPos >= entryPos) {
        // Entrar al color path
        const colorPathPos = newPos - entryPos;
        if (colorPathPos < COLOR_PATH_SIZE) {
          piece.isInBoard = false;
          piece.isInColorPath = true;
          piece.position = `cp${colorPathPos}`;
          piece.colorPathPosition = colorPathPos;
          piece.boardPosition = undefined;
        } else {
          // Pasar de largo, continuar en el tablero
          const finalPos = newPos % BOARD_SIZE;
          piece.position = `p${finalPos}`;
          piece.boardPosition = finalPos;

          // Verificar captura en el tablero
          this.checkCapture(piece, finalPos, color, allPlayers);
        }
      } else {
        // Continuar en el tablero
        piece.position = `p${newPos}`;
        piece.boardPosition = newPos;

        // Verificar captura en el tablero
        this.checkCapture(piece, newPos, color, allPlayers);
      }
    } else if (piece.isInColorPath) {
      // Mover en el color path
      const currentPos = piece.colorPathPosition || 0;
      const newPos = currentPos + diceValue;

      if (newPos >= COLOR_PATH_SIZE) {
        // Entrar al end path
        const endPathPos = newPos - COLOR_PATH_SIZE + 1; // ep1 a ep4
        if (endPathPos <= END_PATH_SIZE) {
          piece.isInColorPath = false;
          piece.isInEndPath = true;
          piece.position = `ep${endPathPos}`;
          piece.endPathPosition = endPathPos;
          piece.colorPathPosition = undefined;
        }
      } else {
        // Continuar en el color path
        piece.position = `cp${newPos}`;
        piece.colorPathPosition = newPos;
      }
    }
  }

  // Verificar capturas
  private checkCapture(movingPiece: Piece, newPosition: number, movingPlayerColor: string, allPlayers: Player[]): void {
    // No se puede capturar en posiciones seguras
    if (SAFE_POSITIONS.includes(newPosition)) {
      return;
    }

    // Buscar piezas enemigas en la misma posición
    allPlayers.forEach(player => {
      if (player.color === movingPlayerColor) return; // No capturar piezas propias

      player.pieces.forEach(enemyPiece => {
        if (enemyPiece.isInBoard && enemyPiece.boardPosition === newPosition) {
          // Capturar pieza enemiga - enviarla de vuelta a su start zone
          enemyPiece.isInBoard = false;
          enemyPiece.isInColorPath = false;
          enemyPiece.isInEndPath = false;
          enemyPiece.isInStartZone = true;
          enemyPiece.position = `sp${enemyPiece.id + 1}`;
          enemyPiece.boardPosition = undefined;
          enemyPiece.colorPathPosition = undefined;
          enemyPiece.endPathPosition = undefined;
        }
      });
    });
  }

  // Verificar si un jugador ganó
  private isPlayerWinner(player: Player): boolean {
    return player.pieces.every(piece => piece.isInEndPath && piece.endPathPosition === END_PATH_SIZE);
  }

  // Actualizar estado del juego
  private updateGameState(gameId: string, gameState: LudoGameState): void {
    gameState.lastUpdated = new Date();
    gameState.version += 1;
    this.gameStates.set(gameId, gameState);
  }

  // Obtener todos los juegos
  getAllGames(): LudoGameState[] {
    return Array.from(this.gameStates.values());
  }

  // Obtener juegos disponibles (no llenos y no iniciados)
  getAvailableGames(): LudoGameState[] {
    return this.getAllGames().filter(game => 
      game.players.length < 4 && 
      game.gamePhase === 'waiting'
    );
  }

  // Calcular tiempo restante del temporizador de decisión
  getDecisionTimeLeft(gameState: LudoGameState): number | undefined {
    if (!gameState.decisionStartTime) {
      return undefined;
    }

    const now = new Date();
    const elapsed = now.getTime() - gameState.decisionStartTime.getTime();
    const remaining = Math.max(0, gameState.decisionDuration - elapsed);
    
    // Devolver como porcentaje (0-100)
    return Math.round((remaining / gameState.decisionDuration) * 100);
  }

  // Eliminar juego
  deleteGame(gameId: string): boolean {
    const deleted = this.gameStates.delete(gameId);
    this.gameActions.delete(gameId);
    return deleted;
  }
}
