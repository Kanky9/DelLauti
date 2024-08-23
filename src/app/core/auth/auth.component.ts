import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
  ],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.scss'
})
export class AuthComponent implements OnInit{

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
}
