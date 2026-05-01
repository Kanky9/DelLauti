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
  private _permissionRequestPromise: Promise<NotificationPermission> | null = null;
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
      console.warn('Push web no soportado por este navegador/dispositivo.');
      return;
    }

    if (!environment.messagingVapidKey || environment.messagingVapidKey.includes('REEMPLAZAR_')) {
      console.warn('La clave VAPID no esta configurada. No se registrara el token push.');
      return;
    }

    const messaging = await this.getMessagingInstance();

    if (!messaging) {
      console.warn('Firebase Messaging no soportado en este entorno.');
      return;
    }

    console.info('Estado actual del permiso de notificaciones:', Notification.permission);

    if (Notification.permission === 'denied') {
      console.warn('Permiso de notificaciones bloqueado por el navegador.');
      return;
    }

    if (Notification.permission !== 'granted') {
      const permission = await this.requestPermission();

      if (permission !== 'granted') {
        console.warn('El permiso de notificaciones no fue otorgado. Estado:', permission);
        return;
      }
    }

    let token: string;
    try {
      token = await getToken(messaging, {
        vapidKey: environment.messagingVapidKey
      });
    } catch (error) {
      console.error('Error obteniendo token FCM:', error);
      return;
    }

    if (!token) {
      console.warn('No se obtuvo token FCM (token vacio).');
      return;
    }

    if (this._registeredAdminId === adminId && this._registeredToken === token) {
      console.info('Token FCM ya registrado para este admin.');
      return;
    }

    await setDoc(
      doc(this._firestore, `users/${adminId}`),
      { pushTokens: arrayUnion(token) },
      { merge: true }
    );

    console.info('Token FCM guardado en Firestore para admin:', adminId);

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

  private async requestPermission(): Promise<NotificationPermission> {
    if (!this._permissionRequestPromise) {
      this._permissionRequestPromise = Notification.requestPermission()
        .finally(() => {
          this._permissionRequestPromise = null;
        });
    }

    return this._permissionRequestPromise;
  }
}
