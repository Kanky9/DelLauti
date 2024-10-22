import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Firestore, collection, query, where, getDocs } from '@angular/fire/firestore';

@Component({
  selector: 'app-gallery',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink
  ],
  templateUrl: './gallery.component.html',
  styleUrls: ['./gallery.component.scss']
})
export class GalleryComponent  {

  // photos: any[] = [];
  // filteredPhotos: any[] = [];
  // currentCategory: string = '';

  // private _firestore = inject(Firestore);
  // private _route = inject(ActivatedRoute);

  // isClicked = false;
  // clickBlur = false;
  // private currentImageIndex: number = 0;
  // private selectedIndex: number | null = null;
  // showCarousel: boolean = false;

  // ngOnInit(): void {
  //   this._route.params.subscribe(params => {
  //     const category = params['category'];
  //     this.getPhotosByCategory(category);
  //   });
  // }

  // async getPhotosByCategory(category: string) {
  //   this.currentCategory = category; 
  //   const photosCollection = collection(this._firestore, 'photos');
  //   const q = query(photosCollection, where('category', '==', category));
  //   const querySnapshot = await getDocs(q);

  //   this.photos = querySnapshot.docs.map(doc => doc.data());
  //   this.filteredPhotos = this.photos.filter(photo => photo.category === category);
  // }

  // handleClick() {
  //   this.isClicked = !this.isClicked;
  // }

  // blurClick() {
  //   this.clickBlur = !this.clickBlur;
  // }

  // getCurrentImage(): any {
  //   return this.photos[this.selectedIndex !== null ? this.selectedIndex : this.currentImageIndex];
  // }

  // goToNextImage(): void {
  //   this.currentImageIndex = (this.currentImageIndex + 1) % this.photos.length;
  //   this.selectedIndex = null;
  // }

  // goToPreviousImage(): void {
  //   this.currentImageIndex = (this.currentImageIndex - 1 + this.photos.length) % this.photos.length;
  //   this.selectedIndex = null;
  // }

  // setSelectedIndex(index: number): void {
  //   this.selectedIndex = index;
  //   this.showCarousel = true;
  //   this.isClicked = true;
  // }
}
