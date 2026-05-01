import { Component, effect, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { MenuComponent } from "./shared/components/menu/menu.component";
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { CommonModule } from '@angular/common';
import { AuthService } from './services/auth.service';
import { AdminNotificationService } from './services/admin-notification.service';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    MenuComponent,
    MatSnackBarModule,
    
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'DelLauti';

  router = inject(Router);
  private _authService = inject(AuthService);
  private _adminNotificationService = inject(AdminNotificationService);

  private _adminNotificationsEffect = effect(() => {
    const user = this._authService.user$();

    // Evita NG0600: no hacemos set/update de signals dentro del contexto directo del effect.
    queueMicrotask(() => {
      if (user?.admin) {
        this._adminNotificationService.startListening(user.id);
      } else {
        this._adminNotificationService.stopListening();
      }
    });
  });
}
