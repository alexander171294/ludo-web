import { Game } from 'boardgame.io';

export interface Player {
  id: string;
  name: string;
  color: string;
  pieces: Piece[];
  isReady: boolean;
}

export interface Piece {
  id: number;
  position: number; // -1 = casa, 0-51 = tablero, 52+ = meta
  isInHome: boolean;
  isInGoal: boolean;
}

export interface LudoState {
  players: Player[];
  currentPlayer: number;
  diceValue: number;
  gamePhase: 'waiting' | 'playing' | 'finished';
  winner: string | null;
  gameStarted: boolean;
  availableColors: string[];
}

const COLORS = ['red', 'blue', 'yellow', 'green'];
const BOARD_SIZE = 52;
const GOAL_START = 52;

// Posiciones de inicio para cada color
const START_POSITIONS = {
  red: 0,
  blue: 13,
  yellow: 26,
  green: 39,
};

// Posiciones de meta para cada color
const GOAL_POSITIONS = {
  red: 52,
  blue: 53,
  yellow: 54,
  green: 55,
};

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
          position: -1,
          isInHome: true,
          isInGoal: false,
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
    },

    // Lanzar dado
    rollDice: ({ G, ctx, playerID }) => {
      if (G.gamePhase !== 'playing') return;
      if (ctx.currentPlayer !== playerID) return;

      G.diceValue = Math.floor(Math.random() * 6) + 1;
    },

    // Mover ficha
    movePiece: ({ G, ctx, playerID }, pieceId: number) => {
      if (G.gamePhase !== 'playing') return;
      if (ctx.currentPlayer !== playerID) return;

      const player = G.players.find((p) => p.id === playerID);
      if (!player) return;

      const piece = player.pieces.find((p) => p.id === pieceId);
      if (!piece) return;

      // Verificar si puede mover la ficha
      if (!canMovePiece(piece, G.diceValue, player.color)) return;

      // Mover la ficha
      movePieceLogic(piece, G.diceValue, player.color);

      // Verificar si ganó
      if (isPlayerWinner(player)) {
        G.winner = player.id;
        G.gamePhase = 'finished';
        return;
      }

      // Cambiar turno si no sacó 6
      if (G.diceValue !== 6) {
        G.currentPlayer = (G.currentPlayer + 1) % G.players.length;
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

// Función para verificar si una ficha puede moverse
function canMovePiece(piece: Piece, diceValue: number, color: string): boolean {
  // Si está en casa, solo puede salir con 6
  if (piece.isInHome) {
    return diceValue === 6;
  }

  // Si está en meta, no puede moverse
  if (piece.isInGoal) {
    return false;
  }

  // Si está en el tablero, puede moverse normalmente
  return true;
}

// Función para mover una ficha
function movePieceLogic(piece: Piece, diceValue: number, color: string): void {
  if (piece.isInHome && diceValue === 6) {
    // Salir de casa
    piece.isInHome = false;
    piece.position = START_POSITIONS[color as keyof typeof START_POSITIONS];
  } else if (!piece.isInHome && !piece.isInGoal) {
    // Mover en el tablero
    const newPosition = piece.position + diceValue;

    // Verificar si llegó a la meta
    if (newPosition >= GOAL_START) {
      piece.isInGoal = true;
      piece.position = GOAL_POSITIONS[color as keyof typeof GOAL_POSITIONS];
    } else {
      piece.position = newPosition % BOARD_SIZE;
    }
  }
}

// Función para verificar si un jugador ganó
function isPlayerWinner(player: Player): boolean {
  return player.pieces.every((piece) => piece.isInGoal);
}
