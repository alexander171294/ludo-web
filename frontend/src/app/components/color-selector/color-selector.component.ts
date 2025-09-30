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
  copied: boolean = false;

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

  copyRoomCode() {
    const roomUrl = `${window.location.origin}?room=${this.roomCode}`;

    if (navigator.clipboard && window.isSecureContext) {
      // Usar la API moderna de clipboard
      navigator.clipboard.writeText(roomUrl).then(() => {
        this.showCopiedFeedback();
      }).catch(() => {
        this.fallbackCopy(roomUrl);
      });
    } else {
      // Fallback para navegadores más antiguos
      this.fallbackCopy(roomUrl);
    }
  }

  private fallbackCopy(text: string) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      document.execCommand('copy');
      this.showCopiedFeedback();
    } catch (err) {
      console.error('Error al copiar:', err);
      // Mostrar el código de sala en un alert como último recurso
      alert(`Código de sala: ${this.roomCode}\n\nComparte este código con otros jugadores.`);
    }

    document.body.removeChild(textArea);
  }

  private showCopiedFeedback() {
    this.copied = true;
    setTimeout(() => {
      this.copied = false;
    }, 2000);
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
