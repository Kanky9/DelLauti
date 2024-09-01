import { CommonModule, NgClass } from '@angular/common';
import { Component, computed, inject, OnInit, Signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [
    CommonModule,
    NgClass,
    RouterLink,
  ],
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.scss'
})
export class MenuComponent implements OnInit{
 
  isClicked: boolean = false; 
    isAuthenticated: Signal<boolean>;

  private _authService = inject(AuthService);

  constructor() {
    this.isAuthenticated = computed(() => !!this._authService.user$());
  }

  ngOnInit(): void {
    
  }

  logout() {
    this._authService.logout();
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