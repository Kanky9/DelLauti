import { Component, inject, OnInit, signal, WritableSignal, LOCALE_ID } from '@angular/core';
import { CommonModule, registerLocaleData } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { Shift } from '../../../models/shift.interface';
import { ShiftService } from '../../../services/shift.service';
import { AuthService } from '../../../services/auth.service';
import { RouterLink } from '@angular/router';
import { Timestamp } from 'firebase/firestore';
import localeEs from '@angular/common/locales/es';

// Registrar el locale 'es' para fechas en español
registerLocaleData(localeEs);

@Component({
  selector: 'app-shift-admin',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    RouterLink
  ],
  templateUrl: './shift-admin.component.html',
  styleUrls: ['./shift-admin.component.scss'],
  providers: [
    { provide: LOCALE_ID, useValue: 'es-ES' }
  ]
})
export class ShiftAdminComponent implements OnInit {

  shiftsReserved: WritableSignal<Shift[]> = signal<Shift[]>([]); // Señal para los turnos reservados
  shiftsFinalized: WritableSignal<Shift[]> = signal<Shift[]>([]); // Señal para los turnos finalizados
  private _shiftService = inject(ShiftService);
  private _authService = inject(AuthService);

  ngOnInit(): void {
    const user = this._authService.getUser;

    if (!user?.admin) {  // Verificamos si user es nulo y si no es admin
      alert('Acceso denegado. Solo los administradores pueden ver los turnos reservados.');
      return;
    }

    this.loadShifts();
    this._shiftService.deleteExpiredShifts();
  }

  async loadShifts() {
    const shifts = await this._shiftService.getReservedShifts();

    const shiftsWithClients = await Promise.all(
      shifts.map(async (shift) => {
        const userId = shift.userId;
        let userName = '';
        let userEmail = '';

        if (userId) {
          const userInfo = await this._authService.getUserInfo(userId);
          if (userInfo) {
            userName = userInfo.name;
            userEmail = userInfo.email;
          }
        }

        const day = shift.day instanceof Timestamp ? shift.day.toDate() : new Date(shift.day);

        return {
          ...shift,
          userName,
          userEmail,
          day // Ya es un objeto Date
        };
      })
    );

    const now = new Date();
    // Filtrar solo los turnos reservados (que tengan userId)
    const reservedShifts = shiftsWithClients.filter(shift => shift.userId && this.isFutureShift(shift, now));
    const finalizedShifts = shiftsWithClients.filter(shift => shift.userId && !this.isFutureShift(shift, now));

    this.shiftsReserved.set(this.sortShifts(reservedShifts));  // Mantener el orden normal
    this.shiftsFinalized.set(this.sortShifts(finalizedShifts, true));  // Invertir el orden para los finalizados
  }

  // Función para determinar si un turno es futuro
  private isFutureShift(shift: Shift, now: Date): boolean {
    const shiftDateTime = new Date(shift.day);
    const [hours, minutes] = shift.scheduleEnd.split(':').map(Number);
    shiftDateTime.setHours(hours, minutes);

    return shiftDateTime.getTime() > now.getTime();
  }

    // Función para ordenar turnos por día y horario
  private sortShifts(shifts: Shift[], invertOrder = false): Shift[] {
      const sortedShifts = shifts.sort((a, b) => {
        const dayComparison = a.day.getTime() - b.day.getTime();
        if (dayComparison !== 0) return dayComparison;
        
        const schedulesA = a.scheduleStart.split(':').map(Number); 
      const schedulesB = b.scheduleStart.split(':').map(Number);
      return schedulesA[0] - schedulesB[0] || schedulesA[1] - schedulesB[1];
    });

    // Invertir el orden si se desea
    return invertOrder ? sortedShifts.reverse() : sortedShifts;
  }
}
