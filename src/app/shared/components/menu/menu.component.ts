import { CommonModule, NgClass } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';

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
  
  ngOnInit(): void {

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