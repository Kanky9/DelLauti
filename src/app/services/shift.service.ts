import { inject, Injectable, signal } from '@angular/core';
import { addDoc, collection, doc, Firestore, getDocs, query, Timestamp, updateDoc, where, deleteDoc } from '@angular/fire/firestore';
import { Shift } from '../models/shift.interface';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class ShiftService {

  private _firestore = inject(Firestore);
  private _authService = inject(AuthService);

  public shift = signal<Shift[]>([]);

  // * Método para guardar turnos
  async saveShifts(days: Date[], schedules: { inicio: string; fin: string }[]) {
    const shiftsCollection = collection(this._firestore, 'shifts');

    days.forEach(async (day) => {
      const shifts = schedules.map((schedule) => ({
        day,
        scheduleStart: schedule.inicio,
        scheduleEnd: schedule.fin,
        available: true,
        userId: null  // Aquí luego puedes guardar el ID del cliente
      } as Shift));

      for (const shift of shifts) {
        await addDoc(shiftsCollection, shift);
        this.shift.update((prev) => [...prev, shift]);  // Actualiza el signal con los nuevos turnos
      }
    });
  }

  // * Método para obtener todos los turnos
  async getAllShifts(): Promise<Shift[]> {
    const shiftsCollection = collection(this._firestore, 'shifts');
    const shiftsSnapshot = await getDocs(shiftsCollection);
    
    const allShifts = shiftsSnapshot.docs.map(doc => {
      const data = doc.data() as Shift;

      // Convertir 'day' de Timestamp a Date
      if (data.day instanceof Timestamp) {
        data.day = data.day.toDate();
      }

      return {
        id: doc.id,
        ...data
      };
    });

    return allShifts;
  }

  // * Método para obtener turnos de un usuario específico
  async getUserShifts(userId: string): Promise<Shift[]> {
    const allShifts = await this.getAllShifts();
    return allShifts.filter(shift => shift.userId === userId);
  }

  // * Método para obtener turnos disponibles
  async getAvailableShifts(day: Date) {
    const shiftsCollection = collection(this._firestore, 'shifts');
    const q = query(shiftsCollection, where('day', '==', day), where('available', '==', true));

    const shiftsSnapshot = await getDocs(q);
    const shiftsAvailable = shiftsSnapshot.docs.map(doc => {
      const data = doc.data() as Shift;

      // Convertir 'day' de Timestamp a Date si es un Timestamp
      if (data.day instanceof Timestamp) {
        data.day = data.day.toDate();  // Conversión de Timestamp a Date
      }

      return {
        id: doc.id,  // Aquí se asigna el ID del documento
        ...data
      };  
    });

    this.shift.set(shiftsAvailable);  // Actualiza el signal con los turnos disponibles
    return shiftsAvailable;
  }

  // * Método para reservar un turno
  async bookShift(shiftId: string, userId: string) {
    const shiftDoc = doc(this._firestore, `shifts/${shiftId}`);
    await updateDoc(shiftDoc, {
      available: false,
      userId: userId  // Guardamos el ID del cliente autenticado
    });

    // Actualiza el signal de turnos
    this.shift.update((prev) =>
      prev.map((shift) => (shift.id === shiftId ? { ...shift, available: false, userId: userId } : shift))
    );
  }

  // * Método para obtener turnos reservados
  async getReservedShifts(): Promise<Shift[]> {
    const shiftsCollection = collection(this._firestore, 'shifts');
    const shiftsSnapshot = await getDocs(shiftsCollection);
    
    const shiftsReserved = await Promise.all(
      shiftsSnapshot.docs.map(async (doc) => {
        const shiftData = { id: doc.id, ...doc.data() } as Shift;

        // Convertir 'day' de Timestamp a Date si es un Timestamp
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

    this.shift.set(shiftsReserved);  // Actualiza el signal con los turnos reservados
    return shiftsReserved;
  }

  // * Método para cancelar un turno
  async cancelShift(shiftId: string) {
    const shiftDoc = doc(this._firestore, `shifts/${shiftId}`);
    await updateDoc(shiftDoc, {
      available: true,
      userId: null  // Eliminar el ID del cliente para hacer el turno disponible nuevamente
    });

    // Actualiza el signal de turnos
    this.shift.update((prev) =>
      prev.map((shift) => (shift.id === shiftId ? { ...shift, available: true, userId: null } : shift))
    );
  }

   // * Método para eliminar un turno
  async deleteShift(shiftId: string) {
    const shiftDoc = doc(this._firestore, `shifts/${shiftId}`);
    await deleteDoc(shiftDoc);

    // Actualiza el signal de turnos
    this.shift.update((prev) => prev.filter((shift) => shift.id !== shiftId));
  }

  // * Método para eliminar turnos pasados
  async deleteExpiredShifts() {
    const allShifts = await this.getAllShifts();
    const now = new Date();

    // Filtrar turnos que ya pasaron y que no han sido reservados
    const expiredShifts = allShifts.filter(shift => {
      const shiftEndTime = new Date(shift.day);
      const [hours, minutes] = shift.scheduleEnd.split(':');
      shiftEndTime.setHours(parseInt(hours, 10));
      shiftEndTime.setMinutes(parseInt(minutes, 10));

      // Verifica si el turno ya pasó y no ha sido reservado
      return shiftEndTime < now && shift.available;
    });

    // Eliminar los turnos que ya pasaron
    for (const expiredShift of expiredShifts) {
      const shiftDoc = doc(this._firestore, `shifts/${expiredShift.id}`);
      await updateDoc(shiftDoc, { available: false, userId: null }); // O puedes eliminarlo con deleteDoc
    }

    // Actualiza el signal para reflejar los cambios
    this.shift.update(prev => prev.filter(shift => !expiredShifts.includes(shift)));
  }

  // * Método corregido para obtener los días con turnos disponibles
  async getAvailableDays(): Promise<Date[]> {
    const shiftsCollection = collection(this._firestore, 'shifts');
    const snapshot = await getDocs(shiftsCollection);
    
    const dates = new Set<Date>();
    snapshot.forEach(doc => {
      const turno = doc.data() as Shift;

      if (turno.day instanceof Timestamp) {
        dates.add(turno.day.toDate());
      }
    });

    return Array.from(dates);
  }

  // * Método para verificar si existen turnos en conflicto
  async checkIfShiftExists(days: Date[], schedules: { inicio: string; fin: string }[]): Promise<Shift[]> {
    const shiftsCollection = collection(this._firestore, 'shifts');
    const duplicateShifts: Shift[] = [];

    for (const day of days) {
      for (const schedule of schedules) {
        const q = query(
          shiftsCollection,
          where('day', '==', day),
          where('scheduleStart', '==', schedule.inicio),
          where('scheduleEnd', '==', schedule.fin)
        );

        const snapshot = await getDocs(q);
        snapshot.forEach(doc => {
          const shiftData = doc.data() as Shift;
          if (shiftData.day instanceof Timestamp) {
            shiftData.day = shiftData.day.toDate();
          }
          duplicateShifts.push({
            id: doc.id,
            ...shiftData
          });
        });
      }
    }

    return duplicateShifts;
  }
}
