import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { ColorSelectorComponent } from './components/color-selector/color-selector.component';
import { GameBoardComponent } from './components/game-board/game-board.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'color-selector', component: ColorSelectorComponent },
  { path: 'game', component: GameBoardComponent },
  { path: '**', redirectTo: '' }
];
