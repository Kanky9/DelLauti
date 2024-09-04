import { CommonModule, NgClass } from '@angular/common';
import { Component, computed, inject, OnInit, Signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { UtilsService } from '../../../services/utils.service';
import { LoadingComponent } from '../../utils/loading/loading.component';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [
    CommonModule,
    NgClass,
    RouterLink,
    LoadingComponent
  ],
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.scss'
})
export class MenuComponent implements OnInit{
 
  isClicked: boolean = false;
  isAuthenticated: Signal<boolean>;
  isAdmin: Signal<boolean>;
  
  readonly _utilSvc = inject(UtilsService);
  private _authService = inject(AuthService);

  constructor() {
    this.isAuthenticated = computed(() => !!this._authService.user$());
    this.isAdmin = computed(() => this._authService.user$()?.admin === true);
  }

  ngOnInit(): void {}

  async logout() {
    this._utilSvc.show(); // Mostrar el loading
    try {
      await this._authService.logout();
      // Additional logic after logout
    } catch (error) {
      console.error('Error during logout', error);
    } finally {
      this._utilSvc.hide(); // Ocultar el loading
    }
  }
  onElementClick() {
    this.isClicked = !this.isClicked;
  }

  scrollToBottomTurnos() {
    window.scrollTo({ top: 700, behavior: 'smooth' });
  }

  scrollToBottomAyuda() {
    window.scrollTo({ top: 700, behavior: 'smooth' });
  }
}