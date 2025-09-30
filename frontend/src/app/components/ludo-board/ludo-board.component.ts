import { Component, OnInit, OnDestroy } from '@angular/core';

@Component({
  selector: 'app-ludo-board',
  standalone: true,
  imports: [],
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
      // Remover la clase star-path de la posición anterior
      this.removeStarPathFromPrevious();

      // Agregar la clase star-path a la posición actual
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
      element.classList.add('star-path');
    }
  }

  private removeStarPathFromPrevious() {
    const previousPosition = this.currentPosition === 0 ? 51 : this.currentPosition - 1;
    const element = document.querySelector(`.p${previousPosition}`);
    if (element) {
      element.classList.remove('star-path');
    }
  }

  private removeAllStarPaths() {
    // Remover la clase star-path de todos los elementos
    for (let i = 0; i < 52; i++) {
      const element = document.querySelector(`.p${i}`);
      if (element) {
        element.classList.remove('star-path');
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
      // Remover la clase star-path de todos los números especiales anteriores
      this.removeStarPathFromAllSpecialNumbers();

      // Agregar la clase star-path a todos los números especiales actuales
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
    // Agregar star-path a todos los colores con el número actual
    this.colors.forEach(color => {
      const element = document.querySelector(`.${color}${this.currentSpecialNumber}`);
      if (element) {
        element.classList.add('star-path');
      }
    });
  }

  private removeStarPathFromAllSpecialNumbers() {
    // Remover star-path de todos los números especiales (1-5) de todos los colores
    this.colors.forEach(color => {
      for (let i = 1; i <= 5; i++) {
        const element = document.querySelector(`.${color}${i}`);
        if (element) {
          element.classList.remove('star-path');
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
}
