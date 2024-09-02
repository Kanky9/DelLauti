import { CommonModule } from '@angular/common';
import { Component, ElementRef, inject, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { UploadPhotoService } from '../../../services/upload-photo.service';

@Component({
  selector: 'app-upload-photo',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    ReactiveFormsModule
  ],
  templateUrl: './upload-photo.component.html',
  styleUrl: './upload-photo.component.scss'
})
export class UploadPhotoComponent {
  @ViewChild('fileInput') fileInput!: ElementRef;

  photoForm: FormGroup;
  selectedFile: File | null = null;
  selectedFileUrl: string | null = null;
  categories = ['Diseño', 'Clásico', 'Cresta', 'Degradé', 'Degradé en punta'];

  private _fb = inject(FormBuilder);
  private _uploadPhotoService = inject(UploadPhotoService);

  constructor() {
    this.photoForm = this._fb.group({
      photo: ['', Validators.required],
      category: ['', Validators.required]
    });
  }

  triggerFileInputClick() {
    this.fileInput.nativeElement.click();
  }


  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        this.selectedFileUrl = reader.result as string;
      };
      reader.readAsDataURL(this.selectedFile);
    }
  }

  async onSubmit() {
    if (this.photoForm.valid && this.selectedFile) {
      try {
        await this._uploadPhotoService.uploadPhoto(this.selectedFile, this.photoForm.value.category);
        // Aquí puedes mostrar un mensaje de éxito o redirigir al usuario
        console.log('Upload successful');
      } catch (error) {
        console.error('Upload failed', error);
      }
    }
  }
}
