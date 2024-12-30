import { CommonModule, NgClass } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-help',
  standalone: true,
  imports: [
    CommonModule,
    NgClass,
    RouterLink,
  ],
  templateUrl: './help.component.html',
  styleUrl: './help.component.scss'
})
export class HelpComponent {
  videoUrl: string =  "../../../assets/videos/ayuda/";

  openVideoCancelar(videoUrl: string) {
    // Abre el video en una nueva ventana o pestaña
    this.videoUrl = videoUrl;
    window.open(videoUrl + 'cancelarTurno.mp4', '_blank');
  }

  openVideoReservar(videoUrl: string) {
    // Abre el video en una nueva ventana o pestaña
    this.videoUrl = videoUrl;
    window.open(videoUrl + 'reservarTurno.mp4', '_blank');
  }

  openVideoVer(videoUrl: string) {
    // Abre el video en una nueva ventana o pestaña
    this.videoUrl = videoUrl;
    window.open(videoUrl + 'verMisTurnos.mp4', '_blank');
  }

  openVideoUser(videoUrl: string) {
    // Abre el video en una nueva ventana o pestaña
    this.videoUrl = videoUrl;
    window.open(videoUrl + 'crearCuenta.mp4', '_blank');
  }

  openVideoGoogle(videoUrl: string) {
    // Abre el video en una nueva ventana o pestaña
    this.videoUrl = videoUrl;
    window.open(videoUrl + 'crearCuentaConGoogle.mp4', '_blank');
  }
}
