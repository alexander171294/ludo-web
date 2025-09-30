import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LudoService, RoomInfo } from '../../services/ludo.service';

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
  isLoading: boolean = false;
  errorMessage: string = '';
  availableColors: string[] = [];
  roomInfo: RoomInfo | null = null;

  colors: Color[] = [
    { id: 'red', name: 'Rojo', hex: '#EF422F' },
    { id: 'blue', name: 'Azul', hex: '#2E9DE6' },
    { id: 'green', name: 'Verde', hex: '#5DBE4D' },
    { id: 'yellow', name: 'Amarillo', hex: '#ECBA11' }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private ludoService: LudoService
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.roomCode = params['roomCode'] || '';
      this.isHost = params['isHost'] === 'true';

      if (this.roomCode) {
        this.loadRoomInfo();
      }
    });
  }

  loadRoomInfo() {
    this.isLoading = true;
    this.errorMessage = '';

    this.ludoService.getRoomInfo(this.roomCode).subscribe({
      next: (response) => {
        this.isLoading = false;
        if ('error' in response) {
          this.errorMessage = 'Sala no encontrada';
        } else {
          this.roomInfo = response;
          this.loadAvailableColors();
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = 'Error al cargar la información de la sala';
        console.error('Error:', error);
      }
    });
  }

  loadAvailableColors() {
    this.ludoService.getAvailableColors(this.roomCode).subscribe({
      next: (response) => {
        if ('error' in response) {
          this.errorMessage = response.error || 'Error desconocido';
        } else {
          this.availableColors = response.colors;
        }
      },
      error: (error) => {
        console.error('Error loading available colors:', error);
      }
    });
  }

  selectColor(colorId: string) {
    if (this.availableColors.includes(colorId)) {
      this.selectedColor = colorId;
    }
  }

  isColorAvailable(colorId: string): boolean {
    return this.availableColors.includes(colorId);
  }

  copyRoomCode() {
    const roomUrl = this.roomCode; // `${window.location.origin}?room=${this.roomCode}`;

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
      this.isLoading = true;
      this.errorMessage = '';

      const joinData = {
        name: this.playerName.trim(),
        color: this.selectedColor
      };

      this.ludoService.joinRoom(this.roomCode, joinData).subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response.success) {
            this.router.navigate(['/game'], {
              queryParams: {
                roomCode: this.roomCode,
                color: this.selectedColor,
                playerName: this.playerName,
                playerId: response.playerId,
                isHost: this.isHost
              }
            });
          } else {
            this.errorMessage = response.message || 'Error al unirse a la sala';
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = 'Error al unirse a la sala';
          console.error('Error:', error);
        }
      });
    }
  }

}
