import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Auth, fetchSignInMethodsForEmail, sendPasswordResetEmail } from '@angular/fire/auth';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';
import { LoadingComponent } from '../../../shared/utils/loading/loading.component';
import { UtilsService } from '../../../services/utils.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    LoadingComponent,
  ],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.scss'
})
export class ForgotPasswordComponent {

  forgotPasswordForm: FormGroup;

  private _auth = inject(Auth);
  private _router = inject(Router);
  private _fb = inject(FormBuilder);
  private _snackBar = inject(MatSnackBar);
  readonly _utilSvc = inject(UtilsService);

  constructor() {
    this.forgotPasswordForm = this._fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  async onSubmit() {
    const email = this.forgotPasswordForm.value.email;
    this._utilSvc.show();
    try {
      await sendPasswordResetEmail(this._auth, email);
      this._snackBar.open('Se ha enviado un enlace para restablecer la contraseña a su correo electrónico.', 'Cerrar', {
        duration: 3000,
        panelClass: 'snackbar-success'
      });
      
      // Limpiar el formulario
      this.forgotPasswordForm.reset();

      // Redirigir al componente auth
      this._router.navigate(['/auth']);
    } catch (error) {
      this._snackBar.open('Ups, hubo un error al enviar el enlace. Por favor, inténtelo de nuevo.', 'Cerrar', {
        duration: 3000,
        panelClass: 'snackbar-error'
      });
      console.error(error);
    } finally { 
      this._utilSvc.hide();
    }  
  }
}