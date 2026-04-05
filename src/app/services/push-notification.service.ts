import { inject, Injectable } from '@angular/core';
import { arrayRemove, arrayUnion, doc, Firestore, setDoc, updateDoc } from '@angular/fire/firestore';
import { Messaging, getMessaging, getToken, isSupported } from 'firebase/messaging';
import { UserModel } from '../models/user.interface';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PushNotificationService {
  private _firestore = inject(Firestore);

  private _messagingPromise: Promise<Messaging | null> | null = null;
  private _permissionRequested = false;
  private _registeredAdminId: string | null = null;
  private _registeredToken: string | null = null;
  private _isSyncInProgress = false;

  async syncForUser(user: UserModel | null): Promise<void> {
    if (this._isSyncInProgress) {
      return;
    }

    this._isSyncInProgress = true;

    try {
      if (user?.admin) {
        await this.registerAdminDevice(user.id);
        return;
      }

      await this.unregisterCurrentDevice();
    } finally {
      this._isSyncInProgress = false;
    }
  }

  private async registerAdminDevice(adminId: string): Promise<void> {
    if (!this.isWebPushAvailable()) {
      return;
    }

    if (!environment.messagingVapidKey || environment.messagingVapidKey.includes('REEMPLAZAR_')) {
      console.warn('La clave VAPID no esta configurada. No se registrara el token push.');
      return;
    }

    const messaging = await this.getMessagingInstance();

    if (!messaging) {
      return;
    }

    if (Notification.permission === 'denied') {
      console.warn('Permiso de notificaciones bloqueado por el navegador.');
      return;
    }

    if (Notification.permission !== 'granted') {
      if (this._permissionRequested) {
        return;
      }

      this._permissionRequested = true;
      const permission = await Notification.requestPermission();

      if (permission !== 'granted') {
        return;
      }
    }

    const token = await getToken(messaging, {
      vapidKey: environment.messagingVapidKey
    });

    if (!token) {
      return;
    }

    if (this._registeredAdminId === adminId && this._registeredToken === token) {
      return;
    }

    await setDoc(
      doc(this._firestore, `users/${adminId}`),
      { pushTokens: arrayUnion(token) },
      { merge: true }
    );

    if (this._registeredAdminId && this._registeredToken && this._registeredAdminId !== adminId) {
      await this.removeTokenFromAdmin(this._registeredAdminId, this._registeredToken);
    }

    this._registeredAdminId = adminId;
    this._registeredToken = token;
  }

  private async unregisterCurrentDevice(): Promise<void> {
    if (!this._registeredAdminId || !this._registeredToken) {
      return;
    }

    await this.removeTokenFromAdmin(this._registeredAdminId, this._registeredToken);
    this._registeredAdminId = null;
    this._registeredToken = null;
  }

  private async removeTokenFromAdmin(adminId: string, token: string): Promise<void> {
    try {
      await updateDoc(doc(this._firestore, `users/${adminId}`), {
        pushTokens: arrayRemove(token)
      });
    } catch (error) {
      console.error('No se pudo remover el token push del admin:', error);
    }
  }

  private async getMessagingInstance(): Promise<Messaging | null> {
    if (!this._messagingPromise) {
      this._messagingPromise = isSupported().then((supported) => {
        if (!supported) {
          return null;
        }

        return getMessaging();
      });
    }

    return this._messagingPromise;
  }

  private isWebPushAvailable(): boolean {
    return typeof window !== 'undefined' &&
      'Notification' in window &&
      'serviceWorker' in navigator;
  }
}
