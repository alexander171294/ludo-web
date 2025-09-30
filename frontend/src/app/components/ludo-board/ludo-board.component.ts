import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChipComponent } from '../chip/chip.component';

interface Chip {
  id: string;
  color: 'red' | 'blue' | 'green' | 'yellow';
  position: number;
  selected: boolean;
  isInStartZone: boolean;
  isInEndZone: boolean;
  startSlot: number; // 0-3 para indicar qué slot ocupa en la zona de inicio
}

interface BoardPosition {
  position: number;
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
export class LudoBoardComponent {
  selectedChip: Chip | null = null;
  boardPositions: BoardPosition[] = [];
  chips: Chip[] = [];
  startSlots: { [color: string]: StartSlot[] } = {
    red: [],
    blue: [],
    green: [],
    yellow: []
  };

  // Constantes de posiciones
  readonly COLOR_PATH_ENTRY_POSITIONS = {
    red: 50,
    blue: 11,
    yellow: 24,
    green: 37,
  };

  readonly START_BOARD_POSITIONS = {
    red: 1,
    blue: 14,
    yellow: 27,
    green: 40,
  };

  readonly COLOR_PATHS = {
    red: [51, 52, 53, 54, 55], // posiciones del camino rojo (cp1-cp5)
    blue: [56, 57, 58, 59, 60], // posiciones del camino azul (cp1-cp5)
    yellow: [61, 62, 63, 64, 65], // posiciones del camino amarillo (cp1-cp5)
    green: [66, 67, 68, 69, 70], // posiciones del camino verde (cp1-cp5)
  };

  constructor() {
    this.initializeGame();
  }

  initializeGame() {
    // Inicializar posiciones del tablero (0-50)
    for (let i = 0; i <= 51; i++) {
      this.boardPositions.push({ position: i, chips: [] });
    }

    // Inicializar slots de inicio para cada color
    const colors: ('red' | 'blue' | 'green' | 'yellow')[] = ['red', 'blue', 'green', 'yellow'];

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
    // Deseleccionar ficha anterior si existe
    if (this.selectedChip && this.selectedChip.id !== chip.id) {
      this.selectedChip.selected = false;
    }

    // Toggle selección de la ficha actual
    chip.selected = !chip.selected;
    this.selectedChip = chip.selected ? chip : null;
  }

  onPositionClick(position: number) {
    if (!this.selectedChip) return;

    // Calcular ruta de movimiento
    const path = this.calculatePath(this.selectedChip.position, position);
    if (path.length === 0) return;

    // Mover ficha paso a paso
    this.moveChipAlongPath(this.selectedChip, path);
  }

  calculatePath(fromPosition: number, toPosition: number): number[] {
    if (fromPosition === toPosition) return [];

    const path: number[] = [];
    let currentPos = fromPosition;

    // Si está en zona de inicio, mover a posición de inicio del tablero
    if (fromPosition === -1) {
      currentPos = this.START_BOARD_POSITIONS[this.selectedChip!.color];
      path.push(currentPos);
    }

    // Calcular ruta hasta la posición objetivo
    while (currentPos !== toPosition) {
      currentPos = this.getNextPosition(currentPos, this.selectedChip!.color);
      if (currentPos === -1) break; // No se puede avanzar más
      path.push(currentPos);
    }

    return path;
  }

  getNextPosition(currentPosition: number, color: 'red' | 'blue' | 'green' | 'yellow'): number {
    // Si está en el camino especial del color
    if (this.isInColorPath(currentPosition, color)) {
      const colorPath = this.COLOR_PATHS[color];
      const currentIndex = colorPath.indexOf(currentPosition);
      if (currentIndex < colorPath.length - 1) {
        return colorPath[currentIndex + 1];
      }
      return -1; // Llegó al final del camino
    }

    // Si está en la posición de entrada al camino especial
    if (currentPosition === this.COLOR_PATH_ENTRY_POSITIONS[color]) {
      return this.COLOR_PATHS[color][0];
    }

    // Movimiento normal en el tablero
    if (currentPosition < 51) {
      return currentPosition + 1;
    } else if (currentPosition >= 51) {
      return 0; // Volver al inicio del tablero
    }

    return -1;
  }

  isInColorPath(position: number, color: 'red' | 'blue' | 'green' | 'yellow'): boolean {
    return this.COLOR_PATHS[color].includes(position);
  }

  async moveChipAlongPath(chip: Chip, path: number[]) {
    for (const position of path) {
      await this.moveChipToPosition(chip, position);
    }

    // Deseleccionar ficha después del movimiento
    chip.selected = false;
    this.selectedChip = null;
  }

  async moveChipToPosition(chip: Chip, newPosition: number): Promise<void> {
    return new Promise(resolve => {
      // Remover ficha de la posición actual
      this.removeChipFromPosition(chip);

      // Actualizar posición de la ficha
      chip.position = newPosition;
      chip.isInStartZone = newPosition === -1;
      chip.isInEndZone = this.isInColorPath(newPosition, chip.color);

      // Colocar ficha en nueva posición
      this.placeChipOnBoard(chip, newPosition);

      // Esperar 200ms antes del siguiente movimiento
      setTimeout(resolve, 200);
    });
  }

  placeChipOnBoard(chip: Chip, position: number) {
    if (position === -1) {
      // Colocar en slot de inicio
      this.startSlots[chip.color][chip.startSlot].chip = chip;
      return;
    }

    const boardPos = this.boardPositions.find(p => p.position === position);
    if (boardPos) {
      boardPos.chips.push(chip);
    }
  }

  removeChipFromPosition(chip: Chip) {
    if (chip.position === -1) {
      // Remover de slot de inicio
      this.startSlots[chip.color][chip.startSlot].chip = null;
      return;
    }

    const boardPos = this.boardPositions.find(p => p.position === chip.position);
    if (boardPos) {
      const index = boardPos.chips.findIndex(c => c.id === chip.id);
      if (index > -1) {
        boardPos.chips.splice(index, 1);
      }
    }
  }

  getChipsAtPosition(position: number): Chip[] {
    const boardPos = this.boardPositions.find(p => p.position === position);
    return boardPos ? boardPos.chips : [];
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
}
