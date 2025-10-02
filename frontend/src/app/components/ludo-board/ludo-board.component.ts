import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChipComponent } from '../chip/chip.component';
import { RoomInfo, Player, Piece, LudoService, LastMove, Move } from '../../services/ludo.service';

interface Chip {
  id: string;
  color: 'red' | 'blue' | 'green' | 'yellow';
  position: number | string; // puede ser número (tablero) o string (camino especial)
  selected: boolean;
  isInStartZone: boolean;
  isInBoard: boolean;
  isInColorPath: boolean;
  isInEndPath: boolean;
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
  private appliedMoves: Set<string> = new Set(); // Para evitar aplicar movimientos duplicados
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
      // Siempre actualizar el estado completo del tablero
      console.log('Actualizando estado del tablero');
      this.updateChipsFromGameState();

      // Si hay un lastMove, procesarlo con animación
      if (this.gameInfo.lastMove) {
        this.processLastMove();
      }
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

    // Solo activar si es mi turno y la pieza es mía
    if (currentPlayer.color !== chip.color) {
      return false;
    }

    // Activar piezas que están en la zona de inicio, en el tablero O en el camino de color
    // No activar piezas que ya están en la zona final
    return (chip.isInStartZone || chip.isInBoard || chip.isInColorPath) && !chip.isInEndPath;
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

  /**
   * Convierte una posición de color del backend (cp1, cp2, etc.) al formato del frontend
   * @param position - Posición del backend (ej: "cp1", "cp2")
   * @param playerColor - Color del jugador
   * @returns Posición en formato del frontend (ej: "red-cp1", "blue-cp2")
   */
  private convertColorPathPosition(position: string, playerColor: string): string {
    if (position.startsWith('cp')) {
      return `${playerColor}-${position}`;
    }
    return position;
  }

  /**
   * Procesa el último movimiento si es nuevo
   */
  private async processLastMove() {
    if (!this.gameInfo?.lastMove) {
      return;
    }

    const lastMove = this.gameInfo.lastMove;
    const moveId = lastMove.moveId;

    // Verificar si ya se aplicó este movimiento
    if (this.appliedMoves.has(moveId)) {
      return;
    }

    console.log(`Aplicando movimiento: ${moveId}`);

    // Aplicar cada movimiento individual con animación
    for (const move of lastMove.moves) {
      await this.applyMove(move);
    }

    // Marcar el movimiento como aplicado
    this.appliedMoves.add(moveId);
  }

  /**
   * Aplica un movimiento individual con animación casillero por casillero
   * @param move - El movimiento a aplicar
   */
  private async applyMove(move: Move) {
    // Buscar el chip correspondiente
    const chipId = `${move.playerColor}-${move.pieceId}`;
    const chip = this.findChipById(chipId);

    if (!chip) {
      console.error(`No se encontró el chip ${chipId}`);
      return;
    }

    // Crear el path para la animación
    const path = this.createPathForMove(move.fromPosition, move.toPosition, move.moveType);

    // Animar el movimiento casillero por casillero
    await this.moveChipAlongPath(chip, path);

    // Actualizar las propiedades del chip según el tipo de movimiento
    switch (move.moveType) {
      case 'board_move':
        chip.isInStartZone = false;
        chip.isInBoard = true;
        chip.isInColorPath = false;
        chip.isInEndPath = false;
        break;
      case 'color_path_move':
        chip.isInStartZone = false;
        chip.isInBoard = false;
        chip.isInColorPath = true;
        chip.isInEndPath = false;
        break;
      case 'end_zone_move':
        chip.isInStartZone = false;
        chip.isInBoard = false;
        chip.isInColorPath = false;
        chip.isInEndPath = true;
        break;
    }
  }

  /**
   * Crea un path para la animación basado en el tipo de movimiento
   * @param fromPosition - Posición de origen
   * @param toPosition - Posición de destino
   * @param moveType - Tipo de movimiento
   * @returns Array de posiciones para la animación
   */
  private createPathForMove(fromPosition: string, toPosition: string, moveType: string): (number | string)[] {
    // Para movimientos simples, crear un path directo
    if (moveType === 'board_move') {
      const fromPos = fromPosition.startsWith('p') ? parseInt(fromPosition.replace('p', '')) : fromPosition;
      const toPos = toPosition.startsWith('p') ? parseInt(toPosition.replace('p', '')) : toPosition;

      // Crear path paso a paso
      const path: (number | string)[] = [];
      if (typeof fromPos === 'number' && typeof toPos === 'number') {
        // Calcular dirección y crear path
        const direction = toPos > fromPos ? 1 : -1;
        for (let i = fromPos; i !== toPos; i += direction) {
          path.push(i);
        }
        path.push(toPos);
      } else {
        // Para posiciones especiales, path directo
        path.push(fromPos, toPos);
      }
      return path;
    }

    // Para otros tipos de movimiento, path directo
    return [fromPosition, toPosition];
  }

  /**
   * Busca un chip por su ID
   * @param chipId - ID del chip a buscar
   * @returns El chip encontrado o null
   */
  private findChipById(chipId: string): Chip | null {
    // Buscar en slots de inicio
    for (const color of Object.keys(this.startSlots)) {
      for (const slot of this.startSlots[color]) {
        if (slot.chip && slot.chip.id === chipId) {
          return slot.chip;
        }
      }
    }

    // Buscar en posiciones del tablero
    for (const position of this.boardPositions) {
      for (const chip of position.chips) {
        if (chip.id === chipId) {
          return chip;
        }
      }
    }

    // Buscar en posiciones de color
    for (const position of this.colorPositions) {
      for (const chip of position.chips) {
        if (chip.id === chipId) {
          return chip;
        }
      }
    }

    return null;
  }

  /**
   * Reposiciona un chip de una posición a otra
   * @param chip - El chip a reposicionar
   * @param fromPosition - Posición de origen
   * @param toPosition - Posición de destino
   */
  private repositionChip(chip: Chip, fromPosition: string, toPosition: string) {
    // Remover de la posición actual
    this.removeChipFromPosition(chip, fromPosition);

    // Colocar en la nueva posición
    this.placeChipInPosition(chip, toPosition);
  }

  /**
   * Remueve un chip de su posición actual
   * @param chip - El chip a remover
   * @param position - La posición de donde remover
   */
  private removeChipFromPosition(chip: Chip, position: string) {
    // Remover de slots de inicio
    if (position.startsWith('sp')) {
      const slotNumber = parseInt(position.replace('sp', '')) - 1;
      const color = chip.color;
      if (this.startSlots[color] && this.startSlots[color][slotNumber]) {
        this.startSlots[color][slotNumber].chip = null;
      }
      return;
    }

    // Remover de posiciones del tablero
    if (position.startsWith('p')) {
      const boardPos = parseInt(position.replace('p', ''));
      const boardPosition = this.boardPositions.find(pos => pos.position === boardPos);
      if (boardPosition) {
        const chipIndex = boardPosition.chips.findIndex(c => c.id === chip.id);
        if (chipIndex !== -1) {
          boardPosition.chips.splice(chipIndex, 1);
        }
      }
      return;
    }

    // Remover de posiciones de color
    const colorPosition = this.colorPositions.find(pos => pos.position === position);
    if (colorPosition) {
      const chipIndex = colorPosition.chips.findIndex(c => c.id === chip.id);
      if (chipIndex !== -1) {
        colorPosition.chips.splice(chipIndex, 1);
      }
    }
  }

  /**
   * Coloca un chip en una nueva posición
   * @param chip - El chip a colocar
   * @param position - La nueva posición
   */
  private placeChipInPosition(chip: Chip, position: string) {
    // Colocar en slots de inicio
    if (position.startsWith('sp')) {
      const slotNumber = parseInt(position.replace('sp', '')) - 1;
      const color = chip.color;
      if (this.startSlots[color] && this.startSlots[color][slotNumber]) {
        this.startSlots[color][slotNumber].chip = chip;
      }
      return;
    }

    // Colocar en posiciones del tablero
    if (position.startsWith('p')) {
      const boardPos = parseInt(position.replace('p', ''));
      const boardPosition = this.boardPositions.find(pos => pos.position === boardPos);
      if (boardPosition) {
        boardPosition.chips.push(chip);
      }
      return;
    }

    // Colocar en posiciones de color
    const colorPosition = this.colorPositions.find(pos => pos.position === position);
    if (colorPosition) {
      colorPosition.chips.push(chip);
    }
  }

  updateChipsFromGameState() {
    if (!this.gameInfo) return;

    console.log('Actualizando estado del tablero desde gameInfo');

    // Limpiar todas las posiciones
    this.clearAllPositions();

    // Mapear las piezas de cada jugador
    this.gameInfo.players.forEach(player => {
      player.pieces.forEach(piece => {
        this.placePieceOnBoard(player.color, piece);
      });
    });

    console.log('Estado del tablero actualizado correctamente');
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
      isInBoard: piece.isInBoard,
      isInColorPath: piece.isInColorPath,
      isInEndPath: piece.isInEndPath,
      startSlot: piece.id
    };

    // Determinar dónde colocar la pieza
    if (piece.isInStartZone) {
      // Colocar en slot de inicio
      this.startSlots[playerColor][piece.id].chip = chip;
    } else if (piece.isInBoard) {
      // Colocar en el tablero principal
      const boardPosition = parseInt(piece.position.replace('p', ''));
      const boardPos = this.boardPositions.find(pos => pos.position === boardPosition);
      if (boardPos) {
        boardPos.chips.push(chip);
      }
    } else if (piece.isInColorPath) {
      // Colocar en el camino de color - convertir cp1, cp2, etc. al formato correcto
      const colorPosition = this.convertColorPathPosition(piece.position, playerColor);
      const colorPos = this.colorPositions.find(pos => pos.position === colorPosition);
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
          isInBoard: false,
          isInColorPath: false,
          isInEndPath: false,
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
    // Solo mover si hay un path válido
    if (path.length === 0) return;

    // Mover directamente a la posición final para evitar duplicaciones
    const finalPosition = path[path.length - 1];
    await this.moveChipToPosition(chip, finalPosition);

    // Deseleccionar ficha después del movimiento
    chip.selected = false;
    this.selectedChip = null;
  }

  async moveChipToPosition(chip: Chip, newPosition: number | string): Promise<void> {
    return new Promise(resolve => {
      // Remover ficha de la posición actual
      this.removeChipFromPosition(chip, chip.position.toString());

      // Actualizar posición de la ficha
      chip.position = newPosition;
      chip.isInStartZone = newPosition === -1;
      chip.isInEndPath = typeof newPosition === 'string' &&
                        newPosition === this.END_ZONE_POSITIONS[chip.color];

      // Colocar ficha en nueva posición
      this.placeChipOnBoard(chip, newPosition);

      // Esperar 100ms para la animación
      setTimeout(resolve, 100);
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
    return this.chips.filter(chip => chip.color === color && chip.isInEndPath);
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
    if (this.selectedChip.isInEndPath) {
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
    if (chip.isInEndPath) {
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
    this.removeChipFromPosition(chip, chip.position.toString());

    // Actualizar propiedades de la ficha
    chip.position = -1;
    chip.isInStartZone = true;
    chip.isInEndPath = false;
    chip.startSlot = slotNumber;

    // Colocar ficha en el nuevo slot de inicio
    this.startSlots[color][slotNumber].chip = chip;

    // Deseleccionar ficha después del movimiento
    chip.selected = false;
    this.selectedChip = null;

    console.log(`Ficha ${chip.id} regresó al slot de inicio ${slotNumber} del color ${color}`);
  }
}
