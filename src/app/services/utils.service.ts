import { inject, Injectable, signal } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MessageModalComponent } from '../shared/utils/message-modal/message-modal.component';

@Injectable({
  providedIn: 'root'
})
export class UtilsService {

  private _isLoading = signal(false);
  private _dialog = inject(MatDialog);

  isLoading() {
    return this._isLoading();
  }

  show() {
    this._isLoading.set(true);  
  }

  hide() {
    this._isLoading.set(false); 
  }

  showMessageDialog(
    title: string,
    message: string,
    cancel = 'Cancelar',
    accept = 'Aceptar'
  ): MatDialogRef<MessageModalComponent, boolean> {
    return this._dialog.open(MessageModalComponent, {
      data: { title, message, cancel, accept },
      panelClass: 'custom-dialog-container'
    });
  }
}
