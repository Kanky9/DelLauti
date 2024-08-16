import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { PresentationComponent } from '../../shared/components/presentation/presentation.component';
import { ProyectsComponent } from '../../shared/components/proyects/proyects.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    PresentationComponent,
    ProyectsComponent,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {

}
