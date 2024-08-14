import { NgClass } from '@angular/common';
import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [
    NgClass,
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