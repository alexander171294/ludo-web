import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-game-board',
  standalone: true,
  templateUrl: './game-board.component.html',
  styleUrls: ['./game-board.component.scss']
})
export class GameBoardComponent implements OnInit {
  roomCode: string = '';
  playerName: string = '';
  selectedColor: string = '';
  isHost: boolean = false;

  colors: { [key: string]: { name: string; hex: string } } = {
    'red': { name: 'Rojo', hex: '#FF6B6B' },
    'blue': { name: 'Azul', hex: '#4ECDC4' },
    'green': { name: 'Verde', hex: '#45B7D1' },
    'yellow': { name: 'Amarillo', hex: '#FFA07A' }
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.roomCode = params['roomCode'] || '';
      this.playerName = params['playerName'] || '';
      this.selectedColor = params['color'] || '';
      this.isHost = params['isHost'] === 'true';
    });
  }

  getColorName(): string {
    return this.colors[this.selectedColor]?.name || this.selectedColor;
  }

  getColorHex(): string {
    return this.colors[this.selectedColor]?.hex || '#000000';
  }

  goBack() {
    this.router.navigate(['/color-selector'], {
      queryParams: {
        roomCode: this.roomCode,
        isHost: this.isHost
      }
    });
  }
}
