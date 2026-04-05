import { inject, Injectable, signal } from '@angular/core';
import { addDoc, collection, deleteDoc, doc, Firestore, getDoc, getDocs, query, Timestamp, updateDoc, where } from '@angular/fire/firestore';
import { Shift } from '../models/shift.interface';
import { AuthService } from './auth.service';
import { AdminNotificationService } from './admin-notification.service';

@Injectable({
  providedIn: 'root'
})
export class ShiftService {

  private _firestore = inject(Firestore);
  private _authService = inject(AuthService);
  private _adminNotificationService = inject(AdminNotificationService);

  public shift = signal<Shift[]>([]);

  private normalizeDay(date: Date): Date {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
  }

  private isSameCalendarDay(dateA: Date, dateB: Date): boolean {
    return (
      dateA.getFullYear() === dateB.getFullYear() &&
      dateA.getMonth() === dateB.getMonth() &&
      dateA.getDate() === dateB.getDate()
    );
  }

  private coerceToDate(value: unknown): Date {
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

    const parsedDate = new Date(value as string | number | Date);
    return Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
  }

  // * Metodo para guardar turnos
  async saveShifts(days: Date[], schedules: { inicio: string; fin: string }[]) {
    const shiftsCollection = collection(this._firestore, 'shifts');

    for (const day of days) {
      const normalizedDay = this.normalizeDay(day);
      const shifts = schedules.map((schedule) => ({
        day: normalizedDay,
        scheduleStart: schedule.inicio,
        scheduleEnd: schedule.fin,
        available: true,
        userId: null
      } as Shift));

      for (const shift of shifts) {
        await addDoc(shiftsCollection, shift);
        this.shift.update((prev) => [...prev, shift]);
      }
    }
  }

  // * Metodo para obtener todos los turnos
  async getAllShifts(): Promise<Shift[]> {
    const shiftsCollection = collection(this._firestore, 'shifts');
    const shiftsSnapshot = await getDocs(shiftsCollection);

    const allShifts = shiftsSnapshot.docs.map(docSnap => {
      const data = docSnap.data() as Shift;

      if (data.day instanceof Timestamp) {
        data.day = data.day.toDate();
      }

      return {
        id: docSnap.id,
        ...data
      };
    });

    return allShifts;
  }

  // * Metodo para obtener turnos de un usuario especifico
  async getUserShifts(userId: string): Promise<Shift[]> {
    const allShifts = await this.getAllShifts();
    return allShifts.filter(shift => shift.userId === userId);
  }

  // * Metodo para obtener turnos disponibles
  async getAvailableShifts(day: Date): Promise<Shift[]> {
    const shiftsCollection = collection(this._firestore, 'shifts');
    const selectedDay = this.normalizeDay(day);
    const q = query(shiftsCollection, where('available', '==', true));

    const shiftsSnapshot = await getDocs(q);
    const shiftsAvailable = shiftsSnapshot.docs
      .map(docSnap => {
        const data = docSnap.data() as Shift;

        if (data.day instanceof Timestamp) {
          data.day = data.day.toDate();
        }

        return {
          id: docSnap.id,
          ...data
        };
      })
      .filter((shift) => {
        const shiftDay = shift.day instanceof Date ? shift.day : new Date(shift.day);
        return this.isSameCalendarDay(this.normalizeDay(shiftDay), selectedDay);
      });

    this.shift.set(shiftsAvailable);
    return shiftsAvailable;
  }

  // * Metodo para reservar un turno
  async bookShift(shiftId: string, userId: string, shiftSummary?: Pick<Shift, 'day' | 'scheduleStart' | 'scheduleEnd'>) {
    const shiftDoc = doc(this._firestore, `shifts/${shiftId}`);

    const shiftDocSnapshot = shiftSummary ? null : await getDoc(shiftDoc);
    const shiftDocData = shiftDocSnapshot?.exists() ? shiftDocSnapshot.data() as Shift : null;

    await updateDoc(shiftDoc, {
      available: false,
      userId: userId
    });

    this.shift.update((prev) =>
      prev.map((shift) => (shift.id === shiftId ? { ...shift, available: false, userId: userId } : shift))
    );

    const userInfo = await this._authService.getUserInfo(userId);

    const dayRaw = shiftSummary?.day ?? shiftDocData?.day ?? new Date();
    const shiftDay = this.coerceToDate(dayRaw);
    const scheduleStart = shiftSummary?.scheduleStart ?? shiftDocData?.scheduleStart ?? '';
    const scheduleEnd = shiftSummary?.scheduleEnd ?? shiftDocData?.scheduleEnd ?? '';

    try {
      await this._adminNotificationService.createShiftBookedNotification({
        shiftId,
        customerId: userId,
        customerName: userInfo?.name ?? 'Cliente',
        customerEmail: userInfo?.email ?? '',
        shiftDay,
        scheduleStart,
        scheduleEnd
      });
    } catch (error) {
      console.error('No se pudo crear la notificacion de reserva para admin:', error);
    }
  }

  // * Metodo para obtener turnos reservados
  async getReservedShifts(): Promise<Shift[]> {
    const shiftsCollection = collection(this._firestore, 'shifts');
    const shiftsSnapshot = await getDocs(shiftsCollection);

    const shiftsReserved = await Promise.all(
      shiftsSnapshot.docs.map(async (docSnap) => {
        const shiftData = { id: docSnap.id, ...docSnap.data() } as Shift;

        if (shiftData.day instanceof Timestamp) {
          shiftData.day = shiftData.day.toDate();
        }

        let clienteName = '';
        let clienteEmail = '';
        if (shiftData.userId) {
          const userInfo = await this._authService.getUserInfo(shiftData.userId);
          if (userInfo) {
            clienteName = userInfo.name;
            clienteEmail = userInfo.email;
          }
        }

        return {
          ...shiftData,
          clienteName,
          clienteEmail,
        };
      })
    );

    this.shift.set(shiftsReserved);
    return shiftsReserved;
  }

  // * Metodo para cancelar un turno
  async cancelShift(shiftId: string) {
    const shiftDoc = doc(this._firestore, `shifts/${shiftId}`);
    await updateDoc(shiftDoc, {
      available: true,
      userId: null
    });

    this.shift.update((prev) =>
      prev.map((shift) => (shift.id === shiftId ? { ...shift, available: true, userId: null } : shift))
    );
  }

  // * Metodo para eliminar un turno
  async deleteShift(shiftId: string) {
    const shiftDoc = doc(this._firestore, `shifts/${shiftId}`);
    await deleteDoc(shiftDoc);

    this.shift.update((prev) => prev.filter((shift) => shift.id !== shiftId));
  }

  // * Metodo para eliminar turnos pasados
  async deleteExpiredShifts() {
    const allShifts = await this.getAllShifts();
    const now = new Date();

    const expiredShifts = allShifts.filter(shift => {
      const shiftEndTime = new Date(shift.day);
      const [hours, minutes] = shift.scheduleEnd.split(':');
      shiftEndTime.setHours(parseInt(hours, 10));
      shiftEndTime.setMinutes(parseInt(minutes, 10));

      return shiftEndTime < now && shift.available;
    });

    for (const expiredShift of expiredShifts) {
      const shiftDoc = doc(this._firestore, `shifts/${expiredShift.id}`);
      await updateDoc(shiftDoc, { available: false, userId: null });
    }

    this.shift.update(prev => prev.filter(shift => !expiredShifts.includes(shift)));
  }

  // * Metodo corregido para obtener los dias con turnos disponibles
  async getAvailableDays(): Promise<Date[]> {
    const shiftsCollection = collection(this._firestore, 'shifts');
    const snapshot = await getDocs(shiftsCollection);

    const dates = new Set<string>();
    snapshot.forEach(docSnap => {
      const turno = docSnap.data() as Shift;

      if (turno.day instanceof Timestamp) {
        const normalizedDay = this.normalizeDay(turno.day.toDate());
        dates.add(normalizedDay.toISOString());
      }
    });

    return Array.from(dates).map(value => new Date(value));
  }

  // * Metodo para verificar si existen turnos en conflicto
  async checkIfShiftExists(days: Date[], schedules: { inicio: string; fin: string }[]): Promise<Shift[]> {
    const shiftsCollection = collection(this._firestore, 'shifts');
    const shiftsSnapshot = await getDocs(shiftsCollection);

    const normalizedDays = days.map(day => this.normalizeDay(day));
    const scheduleKeys = new Set(schedules.map(schedule => `${schedule.inicio}-${schedule.fin}`));

    const duplicateShifts = shiftsSnapshot.docs
      .map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Shift))
      .map(shift => {
        if (shift.day instanceof Timestamp) {
          shift.day = shift.day.toDate();
        }
        return shift;
      })
      .filter((shift) => {
        const shiftDay = shift.day instanceof Date ? shift.day : new Date(shift.day);
        const existsDay = normalizedDays.some(day => this.isSameCalendarDay(day, this.normalizeDay(shiftDay)));
        const existsSchedule = scheduleKeys.has(`${shift.scheduleStart}-${shift.scheduleEnd}`);
        return existsDay && existsSchedule;
      });

    return duplicateShifts;
  }
}
