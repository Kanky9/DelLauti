import { CommonModule, NgClass } from '@angular/common';
import { Component, computed, inject, OnInit, Signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
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
  private router = inject(Router);

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

  scrollToBottomAyuda() {
    window.scrollTo({ top: 700, behavior: 'smooth' });
  }

  async onShiftsClick() {
    if (this.isAuthenticated()) {
      await this.router.navigate(['/shifts']);
    } else {
      const dialogRef = this._utilSvc.showMessageDialog(
        'Necesitas iniciar sesión para pedir un turno.',
        'Ve a iniciar sesión o presiona aceptar para continuar.',
        'Cerrar',
        'Aceptar'
      );

      // Suscribirse al evento afterClosed para redirigir si presiona "Aceptar"
      dialogRef.afterClosed().subscribe(async (result) => {
        if (result) {  // Si el resultado es verdadero (presionó "Aceptar")
          await this.router.navigate(['/auth']); // Redirigir a la página de login
        }
      });
    }
  }
}