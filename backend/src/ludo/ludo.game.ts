import { Game } from 'boardgame.io';

export interface Player {
  id: string;
  name: string;
  color: string;
  pieces: Piece[];
  isReady: boolean;
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

export interface LudoState {
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

export const LudoGame: Game<LudoState> = {
  name: 'ludo',

  setup: (): LudoState => ({
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
  }),

  moves: {
    // Unirse a la sala
    joinGame: (
      { G, playerID },
      playerData: { name: string; color: string },
    ) => {
      if (G.gamePhase !== 'waiting') return;
      if (G.players.length >= 4) return;
      if (!G.availableColors.includes(playerData.color)) return;

      const player: Player = {
        id: playerID,
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
        isReady: false,
      };

      G.players.push(player);
      G.availableColors = G.availableColors.filter(
        (c) => c !== playerData.color,
      );
    },

    // Marcar jugador como listo
    setReady: ({ G, playerID }, isReady: boolean) => {
      const player = G.players.find((p) => p.id === playerID);
      if (player) {
        player.isReady = isReady;
      }
    },

    // Iniciar el juego
    startGame: ({ G }) => {
      if (G.gamePhase !== 'waiting') return;
      if (G.players.length < 2) return;
      if (!G.players.every((p) => p.isReady)) return;

      G.gamePhase = 'playing';
      G.gameStarted = true;
      G.currentPlayer = 0;
      G.canRollDice = true;
      G.canMovePiece = false;
    },

    // Lanzar dado
    rollDice: ({ G, ctx, playerID }) => {
      if (G.gamePhase !== 'playing') return;
      if (ctx.currentPlayer !== playerID) return;
      if (!G.canRollDice) return;

      G.diceValue = Math.floor(Math.random() * 6) + 1;
      G.canRollDice = false;

      const player = G.players[G.currentPlayer];
      const availablePieces = getAvailablePieces(player, G.diceValue);

      if (availablePieces.length === 0) {
        // No hay piezas que se puedan mover, pasar turno
        G.currentPlayer = (G.currentPlayer + 1) % G.players.length;
        G.canRollDice = true;
        G.canMovePiece = false;
      } else if (availablePieces.length === 1) {
        // Solo una pieza puede moverse, moverla automáticamente
        G.selectedPieceId = availablePieces[0].id;
        G.canMovePiece = true;
      } else {
        // Múltiples piezas pueden moverse, esperar selección
        G.canMovePiece = true;
      }
    },

    // Seleccionar pieza para mover
    selectPiece: ({ G, playerID }, pieceId: number) => {
      if (G.gamePhase !== 'playing') return;
      if (G.currentPlayer !== G.players.findIndex((p) => p.id === playerID))
        return;
      if (!G.canMovePiece) return;

      const player = G.players[G.currentPlayer];
      const piece = player.pieces.find((p) => p.id === pieceId);
      if (!piece) return;

      const availablePieces = getAvailablePieces(player, G.diceValue);
      if (!availablePieces.find((p) => p.id === pieceId)) return;

      G.selectedPieceId = pieceId;
    },

    // Mover ficha
    movePiece: ({ G, playerID }) => {
      if (G.gamePhase !== 'playing') return;
      if (G.currentPlayer !== G.players.findIndex((p) => p.id === playerID))
        return;
      if (!G.canMovePiece || G.selectedPieceId === undefined) return;

      const player = G.players[G.currentPlayer];
      const piece = player.pieces.find((p) => p.id === G.selectedPieceId);
      if (!piece) return;

      // Mover la ficha y verificar capturas
      movePieceLogic(piece, G.diceValue, player.color, G.players);

      // Verificar si ganó
      if (isPlayerWinner(player)) {
        G.winner = player.id;
        G.gamePhase = 'finished';
        return;
      }

      // Si sacó 6, puede tirar de nuevo
      if (G.diceValue === 6) {
        G.canRollDice = true;
        G.canMovePiece = false;
        G.selectedPieceId = undefined;
      } else {
        // Pasar turno al siguiente jugador
        G.currentPlayer = (G.currentPlayer + 1) % G.players.length;
        G.canRollDice = true;
        G.canMovePiece = false;
        G.selectedPieceId = undefined;
      }
    },
  },

  turn: {
    moveLimit: 1,
  },

  endIf: ({ G }) => {
    return G.gamePhase === 'finished';
  },
};

// Función para obtener piezas que pueden moverse
function getAvailablePieces(player: Player, diceValue: number): Piece[] {
  return player.pieces.filter((piece) => canMovePiece(piece, diceValue));
}

// Función para verificar si una ficha puede moverse
function canMovePiece(piece: Piece, diceValue: number): boolean {
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

// Función para mover una ficha
function movePieceLogic(
  piece: Piece,
  diceValue: number,
  color: string,
  allPlayers: Player[],
): void {
  if (piece.isInStartZone && diceValue === 6) {
    // Salir de start zone al tablero
    piece.isInStartZone = false;
    piece.isInBoard = true;
    piece.position = `p${
      START_BOARD_POSITIONS[color as keyof typeof START_BOARD_POSITIONS]
    }`;
    piece.boardPosition =
      START_BOARD_POSITIONS[color as keyof typeof START_BOARD_POSITIONS];
  } else if (piece.isInBoard) {
    // Mover en el tablero
    const currentPos = piece.boardPosition || 0;
    const newPos = currentPos + diceValue;
    const entryPos =
      COLOR_PATH_ENTRY_POSITIONS[
        color as keyof typeof COLOR_PATH_ENTRY_POSITIONS
      ];

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
        checkCapture(piece, finalPos, color, allPlayers);
      }
    } else {
      // Continuar en el tablero
      piece.position = `p${newPos}`;
      piece.boardPosition = newPos;

      // Verificar captura en el tablero
      checkCapture(piece, newPos, color, allPlayers);
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

// Función para verificar capturas
function checkCapture(
  movingPiece: Piece,
  newPosition: number,
  movingPlayerColor: string,
  allPlayers: Player[],
): void {
  // No se puede capturar en posiciones seguras
  if (SAFE_POSITIONS.includes(newPosition)) {
    return;
  }

  // Buscar piezas enemigas en la misma posición
  allPlayers.forEach((player) => {
    if (player.color === movingPlayerColor) return; // No capturar piezas propias

    player.pieces.forEach((enemyPiece) => {
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

// Función para verificar si un jugador ganó
function isPlayerWinner(player: Player): boolean {
  return player.pieces.every(
    (piece) => piece.isInEndPath && piece.endPathPosition === END_PATH_SIZE,
  );
}
