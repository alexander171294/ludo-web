import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DiceComponent } from '../dice/dice.component';

@Component({
  selector: 'app-ludo-board',
  standalone: true,
  imports: [DiceComponent, FormsModule, CommonModule],
  templateUrl: './ludo-board.component.html',
  styleUrl: './ludo-board.component.scss'
})
export class LudoBoardComponent implements OnInit, OnDestroy {
  private debugTimer: any;
  private currentPosition: number = 0;
  private isDebugActive: boolean = false;

  private specialDebugTimer: any;
  private currentSpecialNumber: number = 1;
  private isSpecialDebugActive: boolean = false;
  private colors: string[] = ['blue', 'red', 'yellow', 'green'];

  // Propiedades para el dado
  diceValue: number = 1;
  diceType: string = 'default';
  isDiceRolling: boolean = false;

  @ViewChild(DiceComponent) diceComponent!: DiceComponent;

  ngOnInit() {
    // Iniciar automáticamente el debug al cargar el componente
    this.startDebugPath();
    this.startSpecialDebugPath();
  }

  ngOnDestroy() {
    this.stopDebugPath();
    this.stopSpecialDebugPath();
  }

  startDebugPath() {
    if (this.isDebugActive) {
      return; // Ya está activo
    }

    this.isDebugActive = true;
    this.currentPosition = 0;

    this.debugTimer = setInterval(() => {
      // Remover la clase demo-path de la posición anterior
      this.removeStarPathFromPrevious();

      // Agregar la clase demo-path a la posición actual
      this.addStarPathToCurrent();

      // Avanzar a la siguiente posición (0-51 y vuelve a 0)
      this.currentPosition = (this.currentPosition + 1) % 52;
    }, 500);
  }

  stopDebugPath() {
    if (this.debugTimer) {
      clearInterval(this.debugTimer);
      this.debugTimer = null;
    }
    this.isDebugActive = false;
    this.removeAllStarPaths();
  }

  private addStarPathToCurrent() {
    const element = document.querySelector(`.p${this.currentPosition}`);
    if (element) {
      element.classList.add('demo-path');
    }
  }

  private removeStarPathFromPrevious() {
    const previousPosition = this.currentPosition === 0 ? 51 : this.currentPosition - 1;
    const element = document.querySelector(`.p${previousPosition}`);
    if (element) {
      element.classList.remove('demo-path');
    }
  }

  private removeAllStarPaths() {
    // Remover la clase demo-path de todos los elementos
    for (let i = 0; i < 52; i++) {
      const element = document.querySelector(`.p${i}`);
      if (element) {
        element.classList.remove('demo-path');
      }
    }
  }

  // Método público para controlar manualmente el debug
  toggleDebug() {
    if (this.isDebugActive) {
      this.stopDebugPath();
    } else {
      this.startDebugPath();
    }
  }

  // ========== MÉTODOS PARA DEBUG DE NÚMEROS ESPECIALES ==========

  startSpecialDebugPath() {
    if (this.isSpecialDebugActive) {
      return; // Ya está activo
    }

    this.isSpecialDebugActive = true;
    this.currentSpecialNumber = 1;

    this.specialDebugTimer = setInterval(() => {
      // Remover la clase demo-path de todos los números especiales anteriores
      this.removeStarPathFromAllSpecialNumbers();

      // Agregar la clase demo-path a todos los números especiales actuales
      this.addStarPathToCurrentSpecialNumbers();

      // Avanzar al siguiente número (1-5 y vuelve a 1)
      this.currentSpecialNumber = (this.currentSpecialNumber % 5) + 1;
    }, 500);
  }

  stopSpecialDebugPath() {
    if (this.specialDebugTimer) {
      clearInterval(this.specialDebugTimer);
      this.specialDebugTimer = null;
    }
    this.isSpecialDebugActive = false;
    this.removeStarPathFromAllSpecialNumbers();
  }

  private addStarPathToCurrentSpecialNumbers() {
    // Agregar demo-path a todos los colores con el número actual
    this.colors.forEach(color => {
      const element = document.querySelector(`.${color}-path.cp${this.currentSpecialNumber}`);
      if (element) {
        element.classList.add('demo-path');
      }
    });
  }

  private removeStarPathFromAllSpecialNumbers() {
    // Remover demo-path de todos los números especiales (1-5) de todos los colores
    this.colors.forEach(color => {
      for (let i = 1; i <= 5; i++) {
        const element = document.querySelector(`.${color}-path.cp${i}`);
        if (element) {
          element.classList.remove('demo-path');
        }
      }
    });
  }

  // Método público para controlar manualmente el debug especial
  toggleSpecialDebug() {
    if (this.isSpecialDebugActive) {
      this.stopSpecialDebugPath();
    } else {
      this.startSpecialDebugPath();
    }
  }

  // Método para controlar ambos debugs
  toggleAllDebug() {
    this.toggleDebug();
    this.toggleSpecialDebug();
  }

  // ========== MÉTODOS PARA EL DADO ==========

  /**
   * Simula el lanzamiento del dado con un resultado predefinido
   * En un juego real, este resultado vendría del backend
   */
  rollDice() {
    // Simular resultado del backend (1-6)
    const backendResult = Math.floor(Math.random() * 6) + 1;

    // Llamar al método roll del componente dado con el resultado predefinido
    if (this.diceComponent) {
      this.diceComponent.roll(backendResult);
    }

    console.log('Lanzando dado... Resultado del backend:', backendResult);
  }

  /**
   * Maneja el evento cuando el dado termina de rodar
   * @param value - El valor final del dado
   */
  onDiceRolled(value: number) {
    this.diceValue = value;
    console.log('Dado rodado! Valor:', value);
    // Aquí puedes agregar la lógica del juego basada en el resultado
  }

  /**
   * Maneja el cambio de estado del dado (rodando/parado)
   * @param isRolling - Si el dado está rodando
   */
  onDiceRollingStateChanged(isRolling: boolean) {
    this.isDiceRolling = isRolling;
    console.log('Estado del dado:', isRolling ? 'Rodando' : 'Parado');
  }

  /**
   * Cambia el tipo de dado
   * @param type - Tipo de dado (default, red, blue, black, pink)
   */
  changeDiceType(type: string) {
    this.diceType = type;
  }
}
