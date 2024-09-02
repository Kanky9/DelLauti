import { inject, Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {
  private _authService = inject(AuthService);
  private _router = inject(Router);

  async canActivate(): Promise<boolean> {
    const user = this._authService.getUser;

    if (user && user.admin) {
      return true;
    } else {
      await this._router.navigate(['/home']);
      return false;
    }
  }
}
