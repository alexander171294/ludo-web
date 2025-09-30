import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LudoService } from '../../services/ludo.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  roomCode: string = '';
  isLoading: boolean = false;
  errorMessage: string = '';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private ludoService: LudoService
  ) {}

  ngOnInit() {
    // Verificar si hay un código de sala en la URL
    this.route.queryParams.subscribe(params => {
      if (params['room']) {
        this.roomCode = params['room'];
      }
    });
  }

  joinRoom() {
    if (this.roomCode && this.roomCode.length >= 4) {
      this.isLoading = true;
      this.errorMessage = '';

      // Verificar que la sala existe y está en fase de espera
      this.ludoService.getRoomInfo(this.roomCode).subscribe({
        next: (response) => {
          this.isLoading = false;
          if ('error' in response) {
            this.errorMessage = 'Sala no encontrada';
          } else {
            // Verificar si el juego está en fase de espera
            if (response.gamePhase === 'waiting') {
              this.router.navigate(['/color-selector'], {
                queryParams: { roomCode: this.roomCode }
              });
            } else {
              this.errorMessage = 'La partida ya ha comenzado. No puedes unirte ahora.';
            }
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = 'Error al conectar con la sala';
          console.error('Error:', error);
        }
      });
    }
  }

  createRoom() {
    this.isLoading = true;
    this.errorMessage = '';

    this.ludoService.createRoom().subscribe({
      next: (response) => {
        this.isLoading = false;
        this.router.navigate(['/color-selector'], {
          queryParams: { roomCode: response.gameId, isHost: true }
        });
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = 'Error al crear la sala';
        console.error('Error:', error);
      }
    });
  }
}
