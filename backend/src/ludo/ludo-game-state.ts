import { v4 as uuidv4 } from 'uuid';

export interface Player {
  id: string;
  name: string;
  color: string;
  pieces: Piece[];
  action?: 'roll_dice' | 'rolling' | 'select_piece' | 'move_piece'; // Acción que debe realizar
  actionTimeLeft?: number; // Tiempo restante para realizar la acción (0-100)
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

export interface Move {
  pieceId: number;
  playerColor: string;
  fromPosition: string;
  toPosition: string;
  moveType: 'start_to_board' | 'board_move' | 'board_to_color' | 'color_move' | 'color_to_end' | 'end_move' | 'captured_to_start';
  capturedPiece?: {
    pieceId: number;
    playerColor: string;
  };
}

export interface LastMove {
  moveId: string; // UUID único para identificar el movimiento
  moves: Move[]; // Lista de todos los movimientos que ocurrieron
  playerColor: string; // Color del jugador que hizo el movimiento
  diceValue: number; // Valor del dado que causó estos movimientos
  timestamp: Date; // Cuándo ocurrió el movimiento
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
  lastMove?: LastMove; // Último movimiento realizado
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
const COLOR_PATH_SIZE = 5; // cp1 a cp5 (cp0 es la entry position)
const END_PATH_SIZE = 4; // ep1 a ep4

// Posiciones de entrada al color path para cada color
const COLOR_PATH_ENTRY_POSITIONS = {
  red: 51, // posición 50 del tablero
  blue: 12, // posición 11 del tablero
  yellow: 25, // posición 24 del tablero
  green: 38, // posición 37 del tablero
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
    
    // Marcar al jugador actual como en turno
    const currentPlayer = gameState.players[gameState.currentPlayer];
    currentPlayer.action = 'roll_dice';
    gameState.decisionStartTime = new Date();
    
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

    // Generar valor del dado inmediatamente (generamos entre 3 y 6 para pruebas)
    const diceValue = Math.floor(Math.random() * 2) + 5;
    gameState.diceValue = diceValue;
    gameState.canRollDice = false;

    // Marcar que el jugador está lanzando el dado (para animación)
    currentPlayer.action = 'rolling';
    currentPlayer.diceValue = diceValue;
    gameState.decisionStartTime = new Date();

    this.updateGameState(gameId, gameState);

    return { success: true, message: 'Lanzando dado...', diceValue };
  }

  // Aplicar resultado del dado después de la animación
  applyDiceResult(gameId: string): { success: boolean; message: string } {
    const gameState = this.gameStates.get(gameId);
    if (!gameState) {
      return { success: false, message: 'Juego no encontrado' };
    }

    const currentPlayer = gameState.players[gameState.currentPlayer];
    if (!currentPlayer || currentPlayer.action !== 'rolling') {
      return { success: false, message: 'No hay dado siendo lanzado' };
    }

    const diceValue = gameState.diceValue;
    
    // Verificar qué piezas pueden moverse
    const availablePieces = this.getAvailablePieces(currentPlayer, diceValue);

    if (availablePieces.length === 0) {
      // No hay piezas que se puedan mover, pasar turno
      currentPlayer.action = undefined;
      currentPlayer.diceValue = undefined;
      gameState.decisionStartTime = undefined;
      gameState.currentPlayer = (gameState.currentPlayer + 1) % gameState.players.length;
      gameState.canRollDice = true;
      gameState.canMovePiece = false;
      
      // Marcar al siguiente jugador como en turno
      const nextPlayer = gameState.players[gameState.currentPlayer];
      nextPlayer.action = 'roll_dice';
      gameState.decisionStartTime = new Date();
    } else if (availablePieces.length === 1) {
      // Solo una pieza puede moverse, seleccionarla automáticamente
      gameState.selectedPieceId = availablePieces[0].id;
      gameState.canMovePiece = true;
      currentPlayer.action = 'move_piece';
      // Iniciar temporizador de decisión para mover pieza
      gameState.decisionStartTime = new Date();
    } else {
      // Múltiples piezas pueden moverse, esperar selección
      gameState.canMovePiece = true;
      currentPlayer.action = 'select_piece';
      // Iniciar temporizador de decisión para seleccionar pieza
      gameState.decisionStartTime = new Date();
    }

    this.updateGameState(gameId, gameState);

    return { success: true, message: 'Resultado del dado aplicado' };
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
    
    // Cambiar acción a mover pieza
    currentPlayer.action = 'move_piece';
    // Reiniciar temporizador para mover pieza
    gameState.decisionStartTime = new Date();

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

    // Registrar el movimiento
    const moves: Move[] = [];
    const fromPosition = piece.position;
    
    // Mover la ficha y verificar capturas
    const capturedPieces = this.movePieceLogicWithCapture(piece, gameState.diceValue, currentPlayer.color, gameState.players);
    
    // Crear movimiento principal
    const moveType = this.getMoveType(piece, fromPosition, gameState.diceValue);
    const mainMove = this.createMove(
      piece.id,
      currentPlayer.color,
      fromPosition,
      piece.position,
      moveType
    );
    moves.push(mainMove);

    // Agregar movimientos de capturas
    capturedPieces.forEach(captured => {
      const captureMove = this.createMove(
        captured.pieceId,
        captured.playerColor,
        `p${this.getPiecePosition(captured.pieceId, captured.playerColor, gameState.players)}`,
        `sp${captured.pieceId + 1}`,
        'captured_to_start'
      );
      moves.push(captureMove);
    });

    // Crear y guardar LastMove
    gameState.lastMove = this.createLastMove(moves, currentPlayer.color, gameState.diceValue);

    // Verificar si ganó
    if (this.isPlayerWinner(currentPlayer)) {
      gameState.winner = currentPlayer.id;
      gameState.gamePhase = 'finished';
      this.updateGameState(gameId, gameState);
      return { success: true, message: `¡${currentPlayer.name} ha ganado!` };
    }

    // Limpiar estado del jugador actual
    currentPlayer.action = undefined;
    currentPlayer.diceValue = undefined;
    gameState.decisionStartTime = undefined;

    // Si sacó 6, puede tirar de nuevo
    if (gameState.diceValue === 6) {
      gameState.canRollDice = true;
      gameState.canMovePiece = false;
      gameState.selectedPieceId = undefined;
      // Marcar al jugador actual como en turno
      currentPlayer.action = 'roll_dice';
      gameState.decisionStartTime = new Date();
    } else {
      // Pasar turno al siguiente jugador
      gameState.currentPlayer = (gameState.currentPlayer + 1) % gameState.players.length;
      gameState.canRollDice = true;
      gameState.canMovePiece = false;
      gameState.selectedPieceId = undefined;
      // Marcar al siguiente jugador como en turno
      const nextPlayer = gameState.players[gameState.currentPlayer];
      nextPlayer.action = 'roll_dice';
      gameState.decisionStartTime = new Date();
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
      // Permitir movimientos que se mantengan dentro del color path (newPos <= COLOR_PATH_SIZE)
      // o que lleven al end path (newPos > COLOR_PATH_SIZE)
      return newPos <= COLOR_PATH_SIZE + 1; // cp1 a cp5, o cp6 que va a ep1
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

      if (newPos > entryPos) {
        // Entrar al color path
        const colorPathPos = newPos - entryPos;
        if (colorPathPos <= COLOR_PATH_SIZE) {
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
      } else if (newPos === entryPos) {
        // Llegar exactamente a la entry position, quedarse en el tablero
        piece.position = `p${newPos}`;
        piece.boardPosition = newPos;

        // Verificar captura en el tablero
        this.checkCapture(piece, newPos, color, allPlayers);
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

  // Verificar capturas y devolver información de capturas
  private checkCapture(movingPiece: Piece, newPosition: number, movingPlayerColor: string, allPlayers: Player[]): { pieceId: number; playerColor: string }[] {
    const capturedPieces: { pieceId: number; playerColor: string }[] = [];
    
    // No se puede capturar en posiciones seguras
    if (SAFE_POSITIONS.includes(newPosition)) {
      return capturedPieces;
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
          
          capturedPieces.push({
            pieceId: enemyPiece.id,
            playerColor: player.color
          });
        }
      });
    });

    return capturedPieces;
  }

  // Crear un movimiento
  private createMove(
    pieceId: number,
    playerColor: string,
    fromPosition: string,
    toPosition: string,
    moveType: Move['moveType'],
    capturedPiece?: { pieceId: number; playerColor: string }
  ): Move {
    return {
      pieceId,
      playerColor,
      fromPosition,
      toPosition,
      moveType,
      capturedPiece
    };
  }

  // Crear LastMove
  private createLastMove(moves: Move[], playerColor: string, diceValue: number): LastMove {
    return {
      moveId: uuidv4(),
      moves,
      playerColor,
      diceValue,
      timestamp: new Date()
    };
  }

  // Mover pieza con captura y devolver información de capturas
  private movePieceLogicWithCapture(piece: Piece, diceValue: number, color: string, allPlayers: Player[]): { pieceId: number; playerColor: string }[] {
    const capturedPieces: { pieceId: number; playerColor: string }[] = [];
    
    if (piece.isInStartZone && diceValue === 6) {
      // Salir de start zone al tablero
      piece.isInStartZone = false;
      piece.isInBoard = true;
      piece.position = `p${START_BOARD_POSITIONS[color as keyof typeof START_BOARD_POSITIONS]}`;
      piece.boardPosition = START_BOARD_POSITIONS[color as keyof typeof START_BOARD_POSITIONS];
      
      // Verificar capturas en la posición de inicio
      const captured = this.checkCapture(piece, piece.boardPosition!, color, allPlayers);
      capturedPieces.push(...captured);
    } else if (piece.isInBoard) {
      // Mover en el tablero
      const currentPos = piece.boardPosition!;
      const newPos = currentPos + diceValue;
      const entryPos = COLOR_PATH_ENTRY_POSITIONS[color as keyof typeof COLOR_PATH_ENTRY_POSITIONS];
      
      if (newPos > entryPos) {
        // Entrar al color path
        const colorPathPos = newPos - entryPos;
        if (colorPathPos <= COLOR_PATH_SIZE) {
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
          const captured = this.checkCapture(piece, finalPos, color, allPlayers);
          capturedPieces.push(...captured);
        }
      } else if (newPos === entryPos) {
        // Llegar exactamente a la entry position, quedarse en el tablero
        piece.position = `p${newPos}`;
        piece.boardPosition = newPos;

        // Verificar captura en el tablero
        const captured = this.checkCapture(piece, newPos, color, allPlayers);
        capturedPieces.push(...captured);
      } else {
        // Continuar en el tablero
        piece.position = `p${newPos}`;
        piece.boardPosition = newPos;

        // Verificar captura en el tablero
        const captured = this.checkCapture(piece, newPos, color, allPlayers);
        capturedPieces.push(...captured);
      }
    } else if (piece.isInColorPath) {
      // Mover en color path
      const currentPos = piece.colorPathPosition || 0;
      const newPos = currentPos + diceValue;
      
      if (newPos > COLOR_PATH_SIZE) {
        // Ir al end path
        piece.isInColorPath = false;
        piece.isInEndPath = true;
        piece.position = 'ep';
        piece.endPathPosition = 1;
        piece.colorPathPosition = undefined;
      } else {
        piece.colorPathPosition = newPos;
        piece.position = `cp${newPos}`;
      }
    } else if (piece.isInEndPath) {
      // Mover en end path
      const currentPos = piece.endPathPosition || 1;
      const newPos = currentPos + diceValue;
      
      if (newPos > END_PATH_SIZE) {
        // No puede moverse más
        return capturedPieces;
      } else {
        piece.endPathPosition = newPos;
        piece.position = `ep`;
      }
    }

    return capturedPieces;
  }

  // Obtener tipo de movimiento
  private getMoveType(piece: Piece, fromPosition: string, diceValue: number): Move['moveType'] {
    if (piece.isInStartZone && fromPosition.startsWith('sp')) {
      return 'start_to_board';
    } else if (piece.isInBoard && fromPosition.startsWith('p')) {
      if (piece.isInColorPath) {
        return 'board_to_color';
      }
      return 'board_move';
    } else if (piece.isInColorPath && fromPosition.startsWith('cp')) {
      if (piece.isInEndPath) {
        return 'color_to_end';
      }
      return 'color_move';
    } else if (piece.isInEndPath && fromPosition.startsWith('ep')) {
      return 'end_move';
    }
    return 'board_move';
  }

  // Obtener posición de una pieza (para capturas)
  private getPiecePosition(pieceId: number, playerColor: string, allPlayers: Player[]): number {
    for (const player of allPlayers) {
      if (player.color === playerColor) {
        const piece = player.pieces.find(p => p.id === pieceId);
        if (piece && piece.isInBoard) {
          return piece.boardPosition!;
        }
      }
    }
    return 0; // Fallback
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

  // Actualizar tiempo restante para todos los jugadores
  updatePlayerActionTimes(gameState: LudoGameState): void {
    const timeLeft = this.getDecisionTimeLeft(gameState);
    
    gameState.players.forEach(player => {
      if (player.action) {
        player.actionTimeLeft = timeLeft;
      } else {
        player.actionTimeLeft = undefined;
      }
    });
  }

  // Eliminar juego
  deleteGame(gameId: string): boolean {
    const deleted = this.gameStates.delete(gameId);
    this.gameActions.delete(gameId);
    return deleted;
  }
}
