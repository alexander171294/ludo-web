import { Component, Input, Output, EventEmitter, OnInit, ViewChild, ElementRef } from '@angular/core';

@Component({
  selector: 'app-dice',
  standalone: true,
  templateUrl: './dice.component.html',
  styleUrls: ['./dice.component.scss']
})
export class DiceComponent implements OnInit {
  @Input() diceType: string = 'default'; // red, blue, black, pink, default
  @Input() isRolling: boolean = false;
  @Output() diceRolled = new EventEmitter<number>();
  @Output() rollingStateChanged = new EventEmitter<boolean>();

  @ViewChild('diceElement', { static: true }) diceElementRef!: ElementRef;

  diceValue: number = 1;
  isThrowing: boolean = false;

  // Valores de rotación para cada cara del dado
  private perFace = [
    [-0.1, 0.3, -1],      // 1
    [-0.1, 0.6, -0.4],    // 2
    [-0.85, -0.42, 0.73], // 3
    [-0.8, 0.3, -0.75],   // 4
    [0.3, 0.45, 0.9],     // 5
    [-0.16, 0.6, 0.18]    // 6
  ];

  ngOnInit() {
    this.setDiceValue(1);
  }

  /**
   * Rueda el dado con un resultado predefinido
   * @param result - El resultado del dado (1-6) que viene del backend
   */
  roll(result: number) {
    if (result < 1 || result > 6) {
      console.error('El resultado del dado debe estar entre 1 y 6');
      return;
    }

    this.isThrowing = false;
    this.isRolling = false;
    this.rollingStateChanged.emit(this.isRolling);

    // Establecer el valor del dado
    this.setDiceValue(result);

    // Iniciar la animación de lanzamiento
    setTimeout(() => {
      this.isThrowing = true;
    }, 50);

    // Mostrar el resultado después de la animación (2 segundos)
    setTimeout(() => {
      this.diceValue = result;
      this.diceRolled.emit(result);
    }, 2000);
  }

  /**
   * Establece el valor visual del dado
   * @param value - Valor del dado (1-6)
   */
  private setDiceValue(value: number) {
    if (this.diceElementRef && this.diceElementRef.nativeElement) {
      const diceElement = this.diceElementRef.nativeElement as HTMLElement;
      const rotation = this.perFace[value - 1];
      diceElement.style.transform = `rotate3d(${rotation[0]}, ${rotation[1]}, ${rotation[2]}, 180deg)`;
    }
  }

  /**
   * Alterna el estado de rodado continuo
   */
  toggleRolling() {
    this.isThrowing = false;
    this.isRolling = !this.isRolling;
    this.rollingStateChanged.emit(this.isRolling);
  }

  /**
   * Obtiene las clases CSS del dado
   */
  getDiceClasses(): string {
    let classes = 'dice';

    if (this.isRolling) {
      classes += ' rolling';
    }

    if (this.isThrowing) {
      classes += ' throw';
    }

    if (this.diceType && this.diceType !== 'default') {
      classes += ` ${this.diceType}`;
    }

    return classes;
  }
}
