# Componente de Dado (DiceComponent)

Este componente Angular proporciona un dado 3D animado que puede ser reutilizado en cualquier parte de la aplicación.

## Características

- ✅ Animación 3D realista del dado
- ✅ Resultado predefinido (ideal para juegos con backend)
- ✅ Múltiples estilos de dado (default, red, blue, black, pink)
- ✅ Eventos para manejar el resultado y estado
- ✅ Componente standalone (Angular 17+)

## Uso Básico

```html
<app-dice 
  [diceType]="'red'"
  [isRolling]="false"
  (diceRolled)="onDiceRolled($event)"
  (rollingStateChanged)="onRollingStateChanged($event)">
</app-dice>
```

## Propiedades (@Input)

| Propiedad | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `diceType` | string | 'default' | Tipo de dado: 'default', 'red', 'blue', 'black', 'pink' |
| `isRolling` | boolean | false | Si el dado está en estado de rodado continuo |

## Eventos (@Output)

| Evento | Tipo | Descripción |
|--------|------|-------------|
| `diceRolled` | number | Emite el valor final del dado (1-6) cuando termina de rodar |
| `rollingStateChanged` | boolean | Emite el estado de rodado (true/false) |

## Métodos Públicos

### `roll(result: number)`
Lanza el dado con un resultado predefinido.

```typescript
// Ejemplo de uso
this.diceComponent.roll(4); // El dado mostrará el número 4
```

**Parámetros:**
- `result` (number): El resultado deseado del dado (1-6)

### `toggleRolling()`
Alterna entre el estado de rodado continuo y parado.

## Ejemplo Completo

```typescript
import { Component, ViewChild } from '@angular/core';
import { DiceComponent } from './dice/dice.component';

@Component({
  selector: 'app-game',
  template: `
    <app-dice 
      #dice
      [diceType]="selectedDiceType"
      (diceRolled)="onDiceResult($event)">
    </app-dice>
    
    <button (click)="rollDice()">Lanzar Dado</button>
  `
})
export class GameComponent {
  @ViewChild('dice') diceComponent!: DiceComponent;
  selectedDiceType = 'red';

  rollDice() {
    // Simular resultado del backend
    const backendResult = Math.floor(Math.random() * 6) + 1;
    
    // Lanzar el dado con el resultado predefinido
    this.diceComponent.roll(backendResult);
  }

  onDiceResult(value: number) {
    console.log('Resultado del dado:', value);
    // Aquí puedes manejar la lógica del juego
  }
}
```

## Integración con Backend

El componente está diseñado para trabajar con resultados predefinidos del backend:

```typescript
// En tu servicio de juego
rollDiceFromBackend() {
  this.gameService.rollDice().subscribe(result => {
    // El backend devuelve el resultado
    this.diceComponent.roll(result.value);
  });
}
```

## Estilos Personalizados

El componente incluye 5 estilos predefinidos:
- **default**: Dado clásico blanco con puntos rojos y negros
- **red**: Dado rojo con puntos blancos
- **blue**: Dado azul con puntos blancos  
- **black**: Dado negro con puntos azul y amarillo
- **pink**: Dado rosa con puntos amarillo y blanco

## Notas Técnicas

- El componente usa animaciones CSS3 para las rotaciones 3D
- Las animaciones están optimizadas para una experiencia fluida
- El componente es completamente standalone y no requiere módulos adicionales
- Compatible con Angular 17+ (standalone components)
