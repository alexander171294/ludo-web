import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChipComponent } from '../chip/chip.component';

@Component({
  selector: 'app-ludo-board',
  standalone: true,
  imports: [FormsModule, CommonModule, ChipComponent],
  templateUrl: './ludo-board.component.html',
  styleUrl: './ludo-board.component.scss'
})
export class LudoBoardComponent {

}
