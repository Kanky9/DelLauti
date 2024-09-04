import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { UtilsService } from '../../services/utils.service';
import { LoadingComponent } from '../../shared/utils/loading/loading.component';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    ReactiveFormsModule,
    MatSnackBarModule,
    LoadingComponent
  ],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.scss'
})
export class AuthComponent implements OnInit {

  registerForm!: FormGroup;
  loginForm!: FormGroup;

  private _authService = inject(AuthService);
  private _fb = inject(FormBuilder);
  private _snackBar = inject(MatSnackBar);
  readonly _utilSvc = inject(UtilsService);

  constructor() {
    this.registerForm = this._fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });

    this.loginForm = this._fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  ngOnInit() {
    const container = document.getElementById('cont');
    const registerBtn = document.getElementById('register');
    const loginBtn = document.getElementById('login');
    const toggleRegisterPassword = document.getElementById('toggleRegisterPassword');
    const registerPasswordInput = document.getElementById('register-password') as HTMLInputElement;
    const toggleLoginPassword = document.getElementById('toggleLoginPassword');
    const loginPasswordInput = document.getElementById('login-password') as HTMLInputElement;

    registerBtn?.addEventListener('click', () => {
      container?.classList.add("active");
    });

    loginBtn?.addEventListener('click', () => {
      container?.classList.remove("active");
    });

    toggleRegisterPassword?.addEventListener('click', () => {
      if (registerPasswordInput.type === 'password') {
        registerPasswordInput.type = 'text';
        toggleRegisterPassword.innerHTML = '<i class="fa fa-eye-slash"></i>';
      } else {
        registerPasswordInput.type = 'password';
        toggleRegisterPassword.innerHTML = '<i class="fa fa-eye"></i>';
      }
    });

    toggleLoginPassword?.addEventListener('click', () => {
      if (loginPasswordInput.type === 'password') {
        loginPasswordInput.type = 'text';
        toggleLoginPassword.innerHTML = '<i class="fa fa-eye-slash"></i>';
      } else {
        loginPasswordInput.type = 'password';
        toggleLoginPassword.innerHTML = '<i class="fa fa-eye"></i>';
      }
    });
  }

  // * Método para manejar el registro con Google
  async onRegisterWithGoogle(): Promise<void> {
    await this._authService.registerWithGoogle();
  }

  // * Método para manejar el inicio de sesión con Google
  async onLoginWithGoogle(): Promise<void> {
    await this._authService.loginWithGoogle();
  }

  // * Método para manejar el registro
  async onRegister(): Promise<void> {
    if (this.registerForm.valid) {
      this._utilSvc.show();
      try {
        const { name, email, password } = this.registerForm.value;
        console.log(`Intentando registrar usuario con email: ${email}`);
        await this._authService.register(name, email, password);
        this._snackBar.open('Usuario registrado con éxito', 'Cerrar', {
          duration: 3000,
        });
        this.registerForm.reset();
      } catch (error) {
        console.error('Error al registrar usuario', error);
        this._snackBar.open('Hubo un error al registrar el usuario', 'Cerrar', {
          duration: 3000,
        });
        this.registerForm.reset();
      } finally {
        this._utilSvc.hide();
      }
    }
  }

  // * Método para manejar el inicio de sesión
  async onLogin(): Promise<void> {
    if (this.loginForm.valid) {
      this._utilSvc.show();
      try {
        const { email, password } = this.loginForm.value;
        console.log(`Intentando iniciar sesión con email: ${email}`);
        await this._authService.login(email, password);
        this._snackBar.open('Inicio de sesión exitoso', 'Cerrar', {
          duration: 3000,
        });
        this.loginForm.reset();
      } catch (error) {
        console.error('Error al iniciar sesión', error);
        this._snackBar.open('Hubo un error al iniciar sesión', 'Cerrar', {
          duration: 3000,
        });
        this.loginForm.reset();
      } finally {
        this._utilSvc.hide();
      }
    }
  }
}