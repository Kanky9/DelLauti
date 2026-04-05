import { inject, Injectable, signal } from '@angular/core';
import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  Firestore,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc
} from '@angular/fire/firestore';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { AdminNotification } from '../models/admin-notification.interface';

interface ShiftBookedNotificationPayload {
  shiftId: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  shiftDay: Date;
  scheduleStart: string;
  scheduleEnd: string;
}

@Injectable({
  providedIn: 'root'
})
export class AdminNotificationService {
  private _firestore = inject(Firestore);
  private _snackBar = inject(MatSnackBar);
  private _router = inject(Router);

  private _notificationsCollection = collection(this._firestore, 'adminNotifications');
  private _unsubscribeSnapshot: (() => void) | null = null;
  private _activeAdminId: string | null = null;
  private _initialSnapshotLoaded = false;
  private _knownNotificationIds = new Set<string>();

  readonly notifications = signal<AdminNotification[]>([]);
  readonly unreadNotifications = signal<AdminNotification[]>([]);
  readonly unreadCount = signal<number>(0);

  startListening(adminId: string): void {
    if (this._unsubscribeSnapshot && this._activeAdminId === adminId) {
      return;
    }

    this.stopListening();
    this._activeAdminId = adminId;

    const notificationsQuery = query(
      this._notificationsCollection,
      orderBy('createdAt', 'desc'),
      limit(40)
    );

    this._unsubscribeSnapshot = onSnapshot(
      notificationsQuery,
      (snapshot) => {
        const normalizedNotifications = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as Partial<AdminNotification>;
          const shiftDay = this.toDate(data.shiftDay, new Date()) ?? new Date();
          const createdAt = this.toDate(data.createdAt, null);

          return {
            id: docSnap.id,
            type: data.type ?? 'shift_booked',
            message: data.message ?? 'Nueva reserva recibida.',
            shiftId: data.shiftId ?? '',
            customerId: data.customerId ?? '',
            customerName: data.customerName ?? 'Cliente',
            customerEmail: data.customerEmail ?? '',
            shiftDay,
            scheduleStart: data.scheduleStart ?? '',
            scheduleEnd: data.scheduleEnd ?? '',
            createdAt,
            seenBy: Array.isArray(data.seenBy) ? data.seenBy : []
          } as AdminNotification;
        });

        this.notifications.set(normalizedNotifications);

        const unread = normalizedNotifications.filter(
          (notification) => !notification.seenBy.includes(adminId)
        );

        this.unreadNotifications.set(unread);
        this.unreadCount.set(unread.length);
        this.handleIncomingToasts(unread);
      },
      (error) => {
        console.error('Error escuchando notificaciones de admin:', error);
      }
    );
  }

  stopListening(): void {
    if (this._unsubscribeSnapshot) {
      this._unsubscribeSnapshot();
      this._unsubscribeSnapshot = null;
    }

    this._activeAdminId = null;
    this._initialSnapshotLoaded = false;
    this._knownNotificationIds = new Set<string>();
    this.notifications.set([]);
    this.unreadNotifications.set([]);
    this.unreadCount.set(0);
  }

  async createShiftBookedNotification(payload: ShiftBookedNotificationPayload): Promise<void> {
    const shiftDayLabel = payload.shiftDay.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit'
    });

    const customerLabel = payload.customerName.trim() || 'Un cliente';
    const message = `${customerLabel} reservó ${payload.scheduleStart}-${payload.scheduleEnd} (${shiftDayLabel})`;

    await addDoc(this._notificationsCollection, {
      type: 'shift_booked',
      message,
      shiftId: payload.shiftId,
      customerId: payload.customerId,
      customerName: payload.customerName,
      customerEmail: payload.customerEmail,
      shiftDay: payload.shiftDay,
      scheduleStart: payload.scheduleStart,
      scheduleEnd: payload.scheduleEnd,
      createdAt: serverTimestamp(),
      seenBy: []
    });
  }

  async markAllAsSeen(adminId: string): Promise<void> {
    const unreadNow = this.unreadNotifications();

    if (unreadNow.length > 0) {
      await Promise.all(
        unreadNow
          .filter((notification) => !!notification.id)
          .map((notification) =>
            updateDoc(
              doc(this._firestore, `adminNotifications/${notification.id}`),
              { seenBy: arrayUnion(adminId) }
            )
          )
      );
      return;
    }

    const notificationsQuery = query(
      this._notificationsCollection,
      orderBy('createdAt', 'desc'),
      limit(40)
    );
    const snapshot = await getDocs(notificationsQuery);

    const unseenDocs = snapshot.docs.filter((docSnap) => {
      const data = docSnap.data() as Partial<AdminNotification>;
      const seenBy = Array.isArray(data.seenBy) ? data.seenBy : [];
      return !seenBy.includes(adminId);
    });

    if (unseenDocs.length === 0) {
      return;
    }

    await Promise.all(
      unseenDocs.map((docSnap) =>
        updateDoc(doc(this._firestore, `adminNotifications/${docSnap.id}`), {
          seenBy: arrayUnion(adminId)
        })
      )
    );
  }

  private handleIncomingToasts(unread: AdminNotification[]): void {
    const currentIds = new Set(
      unread
        .map((notification) => notification.id)
        .filter((id): id is string => !!id)
    );

    if (!this._initialSnapshotLoaded) {
      this._initialSnapshotLoaded = true;
      this._knownNotificationIds = currentIds;
      return;
    }

    const newUnread = unread.filter(
      (notification) => notification.id && !this._knownNotificationIds.has(notification.id)
    );

    newUnread
      .slice()
      .reverse()
      .forEach((notification) => {
        const snackBarRef = this._snackBar.open(notification.message, 'Ver turnos', {
          duration: 7000,
          panelClass: ['snackbar-success']
        });

        snackBarRef.onAction().subscribe(() => {
          this._router.navigate(['/shift-admin']);
        });
      });

    this._knownNotificationIds = currentIds;
  }

  private toDate(value: unknown, fallback: Date | null): Date | null {
    if (value instanceof Date) {
      return value;
    }

    if (value instanceof Timestamp) {
      return value.toDate();
    }

    const valueWithToDate = value as { toDate?: () => Date };
    if (value && typeof value === 'object' && typeof valueWithToDate.toDate === 'function') {
      return valueWithToDate.toDate();
    }

    if (typeof value === 'string' || typeof value === 'number') {
      const parsedDate = new Date(value);
      if (!Number.isNaN(parsedDate.getTime())) {
        return parsedDate;
      }
    }

    return fallback;
  }
}
