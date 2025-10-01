import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChipComponent } from '../chip/chip.component';
import { RoomInfo, Player, Piece, LudoService } from '../../services/ludo.service';

interface Chip {
  id: string;
  color: 'red' | 'blue' | 'green' | 'yellow';
  position: number | string; // puede ser número (tablero) o string (camino especial)
  selected: boolean;
  isInStartZone: boolean;
  isInEndZone: boolean;
  startSlot: number; // 0-3 para indicar qué slot ocupa en la zona de inicio
}

interface BoardPosition {
  position: number;
  chips: Chip[];
}

interface ColorPosition {
  position: string; // ej: 'red-cp1', 'blue-cp2', etc.
  chips: Chip[];
}

interface StartSlot {
  slotNumber: number; // 0-3
  chip: Chip | null;
}

@Component({
  selector: 'app-ludo-board',
  standalone: true,
  imports: [FormsModule, CommonModule, ChipComponent],
  templateUrl: './ludo-board.component.html',
  styleUrl: './ludo-board.component.scss'
})
export class LudoBoardComponent implements OnChanges {
  @Input() gameInfo: RoomInfo | null = null;
  @Input() playerId: string = '';
  @Input() canMovePiece: boolean = false;

  selectedChip: Chip | null = null;
  boardPositions: BoardPosition[] = [];
  colorPositions: ColorPosition[] = [];
  chips: Chip[] = [];
  startSlots: { [color: string]: StartSlot[] } = {
    red: [],
    blue: [],
    green: [],
    yellow: []
  };

  // Constantes de posiciones
  readonly COLOR_PATH_ENTRY_POSITIONS = {
    red: 51,
    blue: 12,
    yellow: 25,
    green: 38,
  };

  readonly START_BOARD_POSITIONS = {
    red: 1,
    blue: 14,
    yellow: 27,
    green: 40,
  };

  readonly COLOR_PATHS = {
    red: ['red-cp1', 'red-cp2', 'red-cp3', 'red-cp4', 'red-cp5'], // camino rojo
    blue: ['blue-cp1', 'blue-cp2', 'blue-cp3', 'blue-cp4', 'blue-cp5'], // camino azul
    yellow: ['yellow-cp1', 'yellow-cp2', 'yellow-cp3', 'yellow-cp4', 'yellow-cp5'], // camino amarillo
    green: ['green-cp1', 'green-cp2', 'green-cp3', 'green-cp4', 'green-cp5'], // camino verde
  };

  readonly END_ZONE_POSITIONS = {
    red: 'red-end',
    blue: 'blue-end',
    yellow: 'yellow-end',
    green: 'green-end',
  };

  constructor(private ludoService: LudoService) {
    this.initializeGame();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['gameInfo'] && this.gameInfo) {
      this.updateChipsFromGameState();
    }
  }

  /**
   * Determina si una pieza debe estar activa (seleccionable)
   * @param chip - La pieza a evaluar
   * @returns true si la pieza debe estar activa
   */
  isChipActive(chip: Chip): boolean {
    if (!this.gameInfo || !this.playerId || !this.canMovePiece) {
      return false;
    }

    // Buscar el jugador actual
    const currentPlayer = this.gameInfo.players.find(player => player.id === this.playerId);
    if (!currentPlayer) {
      return false;
    }

    // Solo activar si es mi turno y la pieza está en la zona de inicio
    return chip.isInStartZone && currentPlayer.color === chip.color;
  }

  /**
   * Obtiene el color del jugador actual
   * @returns el color del jugador actual o null si no se encuentra
   */
  getCurrentPlayerColor(): string | null {
    if (!this.gameInfo || !this.playerId) {
      return null;
    }

    const currentPlayer = this.gameInfo.players.find(player => player.id === this.playerId);
    return currentPlayer ? currentPlayer.color : null;
  }

  /**
   * Determina si debe mostrar "Eres tú" en una zona específica
   * @param color - Color de la zona (red, blue, green, yellow)
   * @returns true si debe mostrar "Eres tú"
   */
  shouldShowYouLabel(color: string): boolean {
    const currentPlayerColor = this.getCurrentPlayerColor();
    return currentPlayerColor === color;
  }

  updateChipsFromGameState() {
    if (!this.gameInfo) return;

    // Limpiar todas las posiciones
    this.clearAllPositions();

    // Mapear las piezas de cada jugador
    this.gameInfo.players.forEach(player => {
      player.pieces.forEach(piece => {
        this.placePieceOnBoard(player.color, piece);
      });
    });
  }

  clearAllPositions() {
    // Limpiar posiciones del tablero
    this.boardPositions.forEach(pos => pos.chips = []);

    // Limpiar posiciones de colores
    this.colorPositions.forEach(pos => pos.chips = []);

    // Limpiar slots de inicio
    Object.keys(this.startSlots).forEach(color => {
      this.startSlots[color].forEach(slot => slot.chip = null);
    });
  }

  placePieceOnBoard(playerColor: string, piece: Piece) {
    const chip: Chip = {
      id: `${playerColor}-${piece.id}`,
      color: playerColor as 'red' | 'blue' | 'green' | 'yellow',
      position: piece.position,
      selected: false,
      isInStartZone: piece.isInStartZone,
      isInEndZone: piece.isInEndPath,
      startSlot: piece.id
    };

    // Determinar dónde colocar la pieza
    if (piece.isInStartZone) {
      // Colocar en slot de inicio
      this.startSlots[playerColor][piece.id].chip = chip;
    } else if (piece.isInBoard) {
      // Colocar en el tablero principal
      const boardPos = this.boardPositions.find(pos => pos.position === parseInt(piece.position));
      if (boardPos) {
        boardPos.chips.push(chip);
      }
    } else if (piece.isInColorPath) {
      // Colocar en el camino de color
      const colorPos = this.colorPositions.find(pos => pos.position === piece.position);
      if (colorPos) {
        colorPos.chips.push(chip);
      }
    } else if (piece.isInEndPath) {
      // Colocar en la zona final
      const endPos = this.colorPositions.find(pos => pos.position === `${playerColor}-end`);
      if (endPos) {
        endPos.chips.push(chip);
      }
    }
  }

  initializeGame() {
    // Inicializar posiciones del tablero (0-51)
    for (let i = 0; i <= 51; i++) {
      this.boardPositions.push({ position: i, chips: [] });
    }

    // Inicializar posiciones de colores (caminos especiales y zonas de end)
    const colors: ('red' | 'blue' | 'green' | 'yellow')[] = ['red', 'blue', 'green', 'yellow'];
    colors.forEach((color) => {
      // Agregar posiciones del camino especial (cp1-cp5)
      for (let i = 1; i <= 5; i++) {
        this.colorPositions.push({ position: `${color}-cp${i}`, chips: [] });
      }
      // Agregar posición de end zone
      this.colorPositions.push({ position: `${color}-end`, chips: [] });
    });

    // Inicializar slots de inicio para cada color
    colors.forEach((color) => {
      this.startSlots[color] = [];
      for (let i = 0; i < 4; i++) {
        this.startSlots[color].push({ slotNumber: i, chip: null });
      }
    });

    // Inicializar fichas y colocarlas en los slots de inicio
    colors.forEach((color) => {
      for (let i = 0; i < 4; i++) {
        const chip: Chip = {
          id: `${color}-${i}`,
          color: color,
          position: -1, // -1 significa que está en la zona de inicio
          selected: false,
          isInStartZone: true,
          isInEndZone: false,
          startSlot: i
        };
        this.chips.push(chip);
        this.startSlots[color][i].chip = chip;
      }
    });
  }

  onChipClick(chip: Chip) {
    // Solo permitir selección si la pieza está activa y es mi turno
    if (!this.isChipActive(chip)) {
      console.log('No se puede seleccionar esta pieza en este momento');
      return;
    }

    // Deseleccionar ficha anterior si existe
    if (this.selectedChip && this.selectedChip.id !== chip.id) {
      this.selectedChip.selected = false;
    }

    // Toggle selección de la ficha actual
    chip.selected = !chip.selected;
    this.selectedChip = chip.selected ? chip : null;

    // Si se seleccionó la pieza, llamar al endpoint
    if (chip.selected && this.gameInfo && this.playerId) {
      this.selectPiece(chip);
    }
  }

  /**
   * Llama al endpoint para seleccionar una pieza
   * @param chip - La pieza seleccionada
   */
  private selectPiece(chip: Chip) {
    if (!this.gameInfo || !this.playerId) {
      console.error('No hay información del juego o playerId');
      return;
    }

    // Extraer el ID de la pieza del ID del chip (formato: "color-id")
    const pieceId = parseInt(chip.id.split('-')[1]);

    console.log(`Seleccionando pieza ${pieceId} del jugador ${chip.color}`);

    this.ludoService.selectPiece(this.gameInfo.gameId, this.playerId, pieceId).subscribe({
      next: (response) => {
        console.log('Pieza seleccionada:', response);
        if (response.success) {
          console.log('Pieza seleccionada exitosamente');
        } else {
          console.error('Error al seleccionar la pieza:', response.message);
          // Deseleccionar la pieza si hay error
          chip.selected = false;
          this.selectedChip = null;
        }
      },
      error: (error) => {
        console.error('Error al seleccionar la pieza:', error);
        // Deseleccionar la pieza si hay error
        chip.selected = false;
        this.selectedChip = null;
      }
    });
  }

  onPositionClick(position: number | string) {
    if (!this.selectedChip) return;

    // Verificar si se está intentando mover a un espacio vacío de inicio
    if (this.isStartSlotEmpty(position)) {
      this.returnChipToStart(this.selectedChip, position);
      return;
    }

    // Validar que el movimiento sea válido (no más allá de la posición actual)
    if (!this.isValidMovement(this.selectedChip.position, position)) {
      console.log(`Movimiento inválido: no se puede mover desde ${this.selectedChip.position} hasta ${position}`);
      return;
    }

    // Calcular ruta de movimiento
    const path = this.calculatePath(this.selectedChip.position, position);
    if (path.length === 0) return;

    // Mover ficha paso a paso
    this.moveChipAlongPath(this.selectedChip, path);
  }

  calculatePath(fromPosition: number | string, toPosition: number | string): (number | string)[] {
    if (fromPosition === toPosition) return [];

    const path: (number | string)[] = [];
    let currentPos = fromPosition;

    // Si está en zona de inicio, mover a posición de inicio del tablero
    if (fromPosition === -1) {
      currentPos = this.START_BOARD_POSITIONS[this.selectedChip!.color];
      path.push(currentPos);
    }

    // Si el destino es una posición de color y estamos en la posición de entrada
    if (typeof toPosition === 'string' && typeof fromPosition === 'number' &&
        fromPosition === this.COLOR_PATH_ENTRY_POSITIONS[this.selectedChip!.color]) {
      // Si es la zona de end, ir directamente ahí
      if (toPosition === this.END_ZONE_POSITIONS[this.selectedChip!.color]) {
        path.push(toPosition);
        return path;
      }

      // Si es una posición del camino de color, ir directamente a la primera posición
      if (this.isInColorPath(toPosition, this.selectedChip!.color)) {
        path.push(this.COLOR_PATHS[this.selectedChip!.color][0]);
        currentPos = this.COLOR_PATHS[this.selectedChip!.color][0];

        // Continuar por el camino de color hasta la posición objetivo
        while (currentPos !== toPosition) {
          const nextPos = this.getNextPosition(currentPos, this.selectedChip!.color);
          if (nextPos === -1 || nextPos === currentPos) break; // Evitar bucle infinito
          currentPos = nextPos;
          path.push(currentPos);
        }
        return path;
      }
    }

    // Si el destino es la zona de end y estamos en el camino de color
    if (typeof toPosition === 'string' && toPosition === this.END_ZONE_POSITIONS[this.selectedChip!.color] &&
        typeof fromPosition === 'string' && this.isInColorPath(fromPosition, this.selectedChip!.color)) {
      // Si estamos en cp5, ir directamente a la zona de end
      if (fromPosition === this.COLOR_PATHS[this.selectedChip!.color][4]) { // cp5 es el índice 4
        path.push(toPosition);
        return path;
      }
      // Si no estamos en cp5, continuar por el camino de color hasta llegar a cp5 y luego a la zona de end
      while (currentPos !== this.COLOR_PATHS[this.selectedChip!.color][4]) {
        const nextPos = this.getNextPosition(currentPos, this.selectedChip!.color);
        if (nextPos === -1 || nextPos === currentPos) break;
        currentPos = nextPos;
        path.push(currentPos);
      }
      // Agregar la zona de end
      path.push(toPosition);
      return path;
    }

    // Si el destino es la posición de entrada del color, permitir llegar ahí
    if (typeof toPosition === 'number' && toPosition === this.COLOR_PATH_ENTRY_POSITIONS[this.selectedChip!.color]) {
      // Calcular ruta normal hasta la posición de entrada
      while (currentPos !== toPosition) {
        const nextPos = this.getNextPosition(currentPos, this.selectedChip!.color);
        if (nextPos === -1) break; // No se puede avanzar más
        currentPos = nextPos;
        path.push(currentPos);
      }
      return path;
    }

    // Calcular ruta normal hasta la posición objetivo
    while (currentPos !== toPosition) {
      currentPos = this.getNextPosition(currentPos, this.selectedChip!.color);
      if (currentPos === -1) break; // No se puede avanzar más
      path.push(currentPos);
    }

    return path;
  }

  getNextPosition(currentPosition: number | string, color: 'red' | 'blue' | 'green' | 'yellow'): number | string {
    // Si está en el camino especial del color
    if (typeof currentPosition === 'string' && this.isInColorPath(currentPosition, color)) {
      const colorPath = this.COLOR_PATHS[color];
      const currentIndex = colorPath.indexOf(currentPosition);
      if (currentIndex < colorPath.length - 1) {
        return colorPath[currentIndex + 1];
      }
      // Si está en la última posición del camino de color (cp5), puede ir a la zona de finalización
      if (currentIndex === colorPath.length - 1) {
        return this.END_ZONE_POSITIONS[color];
      }
      return -1; // Llegó al final del camino
    }

    // Movimiento normal en el tablero
    if (typeof currentPosition === 'number') {
      // Si está en la posición de entrada del color, ir al camino de color
      if (currentPosition === this.COLOR_PATH_ENTRY_POSITIONS[color]) {
        return this.COLOR_PATHS[color][0]; // Primera posición del camino de color
      }

      if (currentPosition < 51) {
        return currentPosition + 1;
      } else if (currentPosition >= 51) {
        return 0; // Volver al inicio del tablero
      }
    }

    return -1;
  }

  isInColorPath(position: string, color: 'red' | 'blue' | 'green' | 'yellow'): boolean {
    return this.COLOR_PATHS[color].includes(position);
  }

  async moveChipAlongPath(chip: Chip, path: (number | string)[]) {
    for (const position of path) {
      await this.moveChipToPosition(chip, position);
    }

    // Deseleccionar ficha después del movimiento
    chip.selected = false;
    this.selectedChip = null;
  }

  async moveChipToPosition(chip: Chip, newPosition: number | string): Promise<void> {
    return new Promise(resolve => {
      // Remover ficha de la posición actual
      this.removeChipFromPosition(chip);

      // Actualizar posición de la ficha
      chip.position = newPosition;
      chip.isInStartZone = newPosition === -1;
      // Solo marcar como end zone si está en la posición de end específica
      chip.isInEndZone = typeof newPosition === 'string' &&
                        newPosition === this.END_ZONE_POSITIONS[chip.color];

      // Colocar ficha en nueva posición
      this.placeChipOnBoard(chip, newPosition);

      // Esperar 200ms antes del siguiente movimiento
      setTimeout(resolve, 200);
    });
  }

  placeChipOnBoard(chip: Chip, position: number | string) {
    if (position === -1) {
      // Colocar en slot de inicio
      this.startSlots[chip.color][chip.startSlot].chip = chip;
      return;
    }

    if (typeof position === 'number') {
      // Colocar en posición del tablero
      const boardPos = this.boardPositions.find(p => p.position === position);
      if (boardPos) {
        boardPos.chips.push(chip);
      }
    } else {
      // Colocar en posición de color
      const colorPos = this.colorPositions.find(p => p.position === position);
      if (colorPos) {
        colorPos.chips.push(chip);
      }
    }
  }

  removeChipFromPosition(chip: Chip) {
    if (chip.position === -1) {
      // Remover de slot de inicio
      this.startSlots[chip.color][chip.startSlot].chip = null;
      return;
    }

    if (typeof chip.position === 'number') {
      // Remover de posición del tablero
      const boardPos = this.boardPositions.find(p => p.position === chip.position);
      if (boardPos) {
        const index = boardPos.chips.findIndex(c => c.id === chip.id);
        if (index > -1) {
          boardPos.chips.splice(index, 1);
        }
      }
    } else {
      // Remover de posición de color
      const colorPos = this.colorPositions.find(p => p.position === chip.position);
      if (colorPos) {
        const index = colorPos.chips.findIndex(c => c.id === chip.id);
        if (index > -1) {
          colorPos.chips.splice(index, 1);
        }
      }
    }
  }

  getChipsAtPosition(position: number): Chip[] {
    const boardPos = this.boardPositions.find(p => p.position === position);
    return boardPos ? boardPos.chips : [];
  }

  getChipsAtColorPosition(position: string): Chip[] {
    const colorPos = this.colorPositions.find(p => p.position === position);
    return colorPos ? colorPos.chips : [];
  }

  getChipsInStartZone(color: 'red' | 'blue' | 'green' | 'yellow'): Chip[] {
    return this.startSlots[color]
      .map(slot => slot.chip)
      .filter(chip => chip !== null) as Chip[];
  }

  getChipsInEndZone(color: 'red' | 'blue' | 'green' | 'yellow'): Chip[] {
    return this.chips.filter(chip => chip.color === color && chip.isInEndZone);
  }

  getStartSlots(color: 'red' | 'blue' | 'green' | 'yellow'): StartSlot[] {
    return this.startSlots[color];
  }

  getStackClass(chips: Chip[]): string {
    if (chips.length <= 1) return '';
    if (chips.length <= 2) return 'stack';
    if (chips.length <= 4) return 'stack over';
    return 'stack last';
  }

  /**
   * Verifica si un espacio de inicio está vacío
   * @param position - Posición a verificar (debe ser un slot de inicio)
   * @returns true si el espacio está vacío
   */
  isStartSlotEmpty(position: number | string): boolean {
    // Verificar si la posición es un slot de inicio vacío
    if (typeof position === 'string' && position.startsWith('start-slot-')) {
      const parts = position.split('-');
      const color = parts[2] as 'red' | 'blue' | 'green' | 'yellow';
      const slotNumber = parseInt(parts[3]);

      if (this.startSlots[color] && this.startSlots[color][slotNumber]) {
        return this.startSlots[color][slotNumber].chip === null;
      }
    }
    return false;
  }

  /**
   * Valida si un movimiento es válido (no más allá de la posición actual)
   * @param fromPosition - Posición actual de la ficha
   * @param toPosition - Posición de destino
   * @returns true si el movimiento es válido
   */
  isValidMovement(fromPosition: number | string, toPosition: number | string): boolean {
    if (!this.selectedChip) return false;

    // Si está en la zona de inicio, solo puede ir a la posición de inicio del tablero
    if (fromPosition === -1) {
      return toPosition === this.START_BOARD_POSITIONS[this.selectedChip.color];
    }

    // Si está en la zona final, no puede moverse
    if (this.selectedChip.isInEndZone) {
      return false;
    }

    // Si el destino es la zona final, es válido
    if (typeof toPosition === 'string' && toPosition === this.END_ZONE_POSITIONS[this.selectedChip.color]) {
      return true;
    }

    // Calcular la distancia del movimiento
    const distance = this.calculateMovementDistance(fromPosition, toPosition);

    // Solo permitir movimientos hacia adelante (distancia positiva)
    return distance > 0;
  }

  /**
   * Calcula la distancia de movimiento entre dos posiciones
   * @param fromPosition - Posición de origen
   * @param toPosition - Posición de destino
   * @returns Distancia del movimiento (positiva = hacia adelante, negativa = hacia atrás)
   */
  calculateMovementDistance(fromPosition: number | string, toPosition: number | string): number {
    if (!this.selectedChip) return 0;

    const color = this.selectedChip.color;

    // Si está en zona de inicio, la distancia es hasta la posición de inicio del tablero
    if (fromPosition === -1) {
      if (toPosition === this.START_BOARD_POSITIONS[color]) {
        return 1;
      }
      return 0;
    }

    // Si el destino es la zona final
    if (typeof toPosition === 'string' && toPosition === this.END_ZONE_POSITIONS[color]) {
      if (typeof fromPosition === 'string' && this.isInColorPath(fromPosition, color)) {
        // Si está en el camino de color, calcular distancia hasta el final
        const colorPath = this.COLOR_PATHS[color];
        const currentIndex = colorPath.indexOf(fromPosition);
        return colorPath.length - currentIndex; // Distancia hasta el final
      }
      return 0;
    }

    // Movimiento en el tablero principal
    if (typeof fromPosition === 'number' && typeof toPosition === 'number') {
      // Calcular distancia considerando el ciclo del tablero
      let distance = toPosition - fromPosition;
      if (distance < 0) {
        distance += 52; // Ajustar por el ciclo del tablero
      }
      return distance;
    }

    // Movimiento desde tablero a camino de color
    if (typeof fromPosition === 'number' && typeof toPosition === 'string' && this.isInColorPath(toPosition, color)) {
      const entryPosition = this.COLOR_PATH_ENTRY_POSITIONS[color];
      let distanceToEntry = entryPosition - fromPosition;
      if (distanceToEntry < 0) {
        distanceToEntry += 52;
      }

      const colorPath = this.COLOR_PATHS[color];
      const targetIndex = colorPath.indexOf(toPosition);

      return distanceToEntry + targetIndex + 1;
    }

    // Movimiento en el camino de color
    if (typeof fromPosition === 'string' && typeof toPosition === 'string' &&
        this.isInColorPath(fromPosition, color) && this.isInColorPath(toPosition, color)) {
      const colorPath = this.COLOR_PATHS[color];
      const fromIndex = colorPath.indexOf(fromPosition);
      const toIndex = colorPath.indexOf(toPosition);
      return toIndex - fromIndex;
    }

    return 0;
  }

  /**
   * Mueve una ficha de regreso a un espacio de inicio vacío
   * @param chip - Ficha a mover
   * @param targetPosition - Posición de destino (slot de inicio)
   */
  async returnChipToStart(chip: Chip, targetPosition: number | string) {
    if (typeof targetPosition !== 'string' || !targetPosition.startsWith('start-slot-')) {
      return;
    }

    // Prevenir que las fichas en la zona final regresen al inicio
    if (chip.isInEndZone) {
      console.log(`No se puede regresar la ficha ${chip.id} porque ya está en la zona final`);
      return;
    }

    const parts = targetPosition.split('-');
    const color = parts[2] as 'red' | 'blue' | 'green' | 'yellow';
    const slotNumber = parseInt(parts[3]);

    // Verificar que el slot esté vacío
    if (!this.startSlots[color] || this.startSlots[color][slotNumber].chip !== null) {
      return;
    }

    // Remover ficha de su posición actual
    this.removeChipFromPosition(chip);

    // Actualizar propiedades de la ficha
    chip.position = -1;
    chip.isInStartZone = true;
    chip.isInEndZone = false;
    chip.startSlot = slotNumber;

    // Colocar ficha en el nuevo slot de inicio
    this.startSlots[color][slotNumber].chip = chip;

    // Deseleccionar ficha después del movimiento
    chip.selected = false;
    this.selectedChip = null;

    console.log(`Ficha ${chip.id} regresó al slot de inicio ${slotNumber} del color ${color}`);
  }
}
