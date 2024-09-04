import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class UtilsService {

  private _isLoading = signal(false);

  isLoading() {
    return this._isLoading();
  }

  show() {
    this._isLoading = signal(true);
  }

  hide() {
    this._isLoading = signal(false);
  }
}
