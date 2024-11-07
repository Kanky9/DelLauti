import { Component, inject, OnInit, signal, WritableSignal, LOCALE_ID, computed } from '@angular/core';
import { CommonModule, registerLocaleData } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { Shift } from '../../../models/shift.interface';
import { ShiftService } from '../../../services/shift.service';
import { AuthService } from '../../../services/auth.service';
import { RouterLink } from '@angular/router';
import { Timestamp } from 'firebase/firestore';
import localeEs from '@angular/common/locales/es';
import { UtilsService } from '../../../services/utils.service';

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

  shiftsReserved: WritableSignal<Shift[]> = signal<Shift[]>([]); 
  shiftsFinalized: WritableSignal<Shift[]> = signal<Shift[]>([]);
  shiftsNotReserved: WritableSignal<Shift[]> = signal<Shift[]>([]); 
  currentView: WritableSignal<string> = signal<string>('reserved');
  private _shiftService = inject(ShiftService);
  private _authService = inject(AuthService);
  private _utilsService = inject(UtilsService);

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
    const shifts = await this._shiftService.getAllShifts();

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
    const notReservedShifts = shiftsWithClients.filter(shift => !shift.userId && this.isFutureShift(shift, now));

    this.shiftsReserved.set(this.sortShifts(reservedShifts));  // Mantener el orden normal
    this.shiftsFinalized.set(this.sortShifts(finalizedShifts, true));  // Invertir el orden para los finalizados
    this.shiftsNotReserved.set(this.sortShifts(notReservedShifts));  // Mantener el orden normal
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

  // Método para eliminar un turno no reservado
  async onDeleteShift(shift: Shift) {
    const dialogRef = this._utilsService.showMessageDialog(
      'Confirmación de Eliminación',
      '¿Estás seguro de eliminar este turno?',
      'Cerrar',
      'Eliminar'
    );

    dialogRef.afterClosed().subscribe(async (confirmed) => {
      if (confirmed) {
        await this._shiftService.deleteShift(shift.id!);
        this.loadShifts(); // Recargar turnos después de la eliminación
      }
    });
  }

  // * Métodos para cambiar la vista
  showReserved() {
    this.currentView.set('reserved');
  }

  showFinalized() {
    this.currentView.set('finalized');
  }

  showNotReserved() {
    this.currentView.set('notReserved');
  }
}
