import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

interface Color {
  id: string;
  name: string;
  hex: string;
}

@Component({
  selector: 'app-color-selector',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './color-selector.component.html',
  styleUrls: ['./color-selector.component.scss']
})
export class ColorSelectorComponent implements OnInit {
  roomCode: string = '';
  selectedColor: string = '';
  playerName: string = '';
  isHost: boolean = false;

  colors: Color[] = [
    { id: 'red', name: 'Rojo', hex: '#FF6B6B' },
    { id: 'blue', name: 'Azul', hex: '#4ECDC4' },
    { id: 'green', name: 'Verde', hex: '#45B7D1' },
    { id: 'yellow', name: 'Amarillo', hex: '#FFA07A' }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.roomCode = params['roomCode'] || '';
      this.isHost = params['isHost'] === 'true';
    });
  }

  selectColor(colorId: string) {
    this.selectedColor = colorId;
  }

  joinGame() {
    if (this.selectedColor && this.playerName && this.playerName.trim().length >= 2) {
      // Navegar al tablero de juego
      this.router.navigate(['/game'], {
        queryParams: {
          roomCode: this.roomCode,
          color: this.selectedColor,
          playerName: this.playerName,
          isHost: this.isHost
        }
      });
    }
  }
}
