import { CommonModule } from '@angular/common';
import { Component, ElementRef, inject, signal, Signal, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { UploadPhotoService } from '../../../services/upload-photo.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UtilsService } from '../../../services/utils.service';
import { LoadingComponent } from '../../../shared/utils/loading/loading.component';

@Component({
  selector: 'app-upload-photo',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    ReactiveFormsModule,
    LoadingComponent
  ],
  templateUrl: './upload-photo.component.html',
  styleUrl: './upload-photo.component.scss'
})
export class UploadPhotoComponent {
  @ViewChild('fileInput') fileInput!: ElementRef;

  photoForm: FormGroup;
  selectedFile: Signal<File | null> = signal(null);
  selectedFileUrl: Signal<string | null> = signal(null);
  categories = ['Diseño', 'Clásico', 'Cresta', 'Degradé', 'Degradé en punta'];

  private _fb = inject(FormBuilder);
  private _uploadPhotoService = inject(UploadPhotoService);
  private _snackBar = inject(MatSnackBar);
  readonly _utilSvc = inject(UtilsService);

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
      const file = input.files[0];
      this.selectedFile = signal(file);
      const reader = new FileReader();
      reader.onload = () => {
        this.selectedFileUrl = signal(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  async onSubmit() {
    if (this.photoForm.valid && this.selectedFile()) {
      this._utilSvc.show(); // Mostrar el loading
      try {
        const file = this.selectedFile();
        if (file) {
          await this._uploadPhotoService.uploadPhoto(file, this.photoForm.value.category);
          this._snackBar.open('La imagen se subió correctamente', 'Cerrar', {
            duration: 3000,
          });
          this.photoForm.reset();
          this.selectedFile = signal(null);
          this.selectedFileUrl = signal(null);
        }
      } catch (error) {
        console.error('Error al subir la imagen', error);
        this._snackBar.open('Hubo un error al subir la imagen', 'Cerrar', {
          duration: 3000,
        });
        this.photoForm.reset();
        this.selectedFile = signal(null);
        this.selectedFileUrl = signal(null);
      } finally {
        this._utilSvc.hide(); // Ocultar el loading
      }
    }
  }
}
