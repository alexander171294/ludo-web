import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChipComponent } from '../chip/chip.component';

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
export class LudoBoardComponent {
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

  constructor() {
    this.initializeGame();
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
    // Deseleccionar ficha anterior si existe
    if (this.selectedChip && this.selectedChip.id !== chip.id) {
      this.selectedChip.selected = false;
    }

    // Toggle selección de la ficha actual
    chip.selected = !chip.selected;
    this.selectedChip = chip.selected ? chip : null;
  }

  onPositionClick(position: number | string) {
    if (!this.selectedChip) return;

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
      // Ir directamente a la zona de end
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
}
