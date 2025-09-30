import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent {
  roomCode: string = '';

  constructor(private router: Router) {}

  joinRoom() {
    if (this.roomCode && this.roomCode.length >= 4) {
      // Navegar al selector de colores
      this.router.navigate(['/color-selector'], {
        queryParams: { roomCode: this.roomCode }
      });
    }
  }

  createRoom() {
    // Generar un código de sala aleatorio
    const newRoomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.router.navigate(['/color-selector'], {
      queryParams: { roomCode: newRoomCode, isHost: true }
    });
  }
}
