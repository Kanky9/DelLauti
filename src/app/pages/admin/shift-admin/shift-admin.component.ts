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
import { AdminNotificationService } from '../../../services/admin-notification.service';

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
  currentView: WritableSignal<'reserved' | 'finalized' | 'notReserved'> = signal<'reserved' | 'finalized' | 'notReserved'>('reserved');
  filterQuery: WritableSignal<string> = signal<string>('');
  filterDate: WritableSignal<string> = signal<string>('');

  readonly currentShifts = computed(() => {
    switch (this.currentView()) {
      case 'reserved':
        return this.shiftsReserved();
      case 'finalized':
        return this.shiftsFinalized();
      default:
        return this.shiftsNotReserved();
    }
  });

  readonly filteredCurrentShifts = computed(() => {
    const shifts = this.currentShifts();
    const query = this.filterQuery().trim().toLowerCase();
    const dateFilter = this.filterDate();

    return shifts.filter((shift) => {
      const shiftDate = shift.day instanceof Date ? shift.day : new Date(shift.day);

      if (dateFilter && this.toInputDate(shiftDate) !== dateFilter) {
        return false;
      }

      if (!query) {
        return true;
      }

      const searchableParts = [
        shift.scheduleStart,
        shift.scheduleEnd,
        shift.userName ?? '',
        shift.userEmail ?? '',
        shiftDate.toLocaleDateString('es-ES', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      ];

      return searchableParts.some(part => part.toLowerCase().includes(query));
    });
  });

  readonly hasActiveFilters = computed(() =>
    this.filterQuery().trim().length > 0 || this.filterDate().length > 0
  );

  readonly currentViewLabel = computed(() => {
    switch (this.currentView()) {
      case 'reserved':
        return 'Turnos reservados';
      case 'finalized':
        return 'Turnos finalizados';
      default:
        return 'Turnos disponibles';
    }
  });

  readonly currentViewDescription = computed(() => {
    switch (this.currentView()) {
      case 'reserved':
        return 'Clientes con turno confirmado pendiente de atencion.';
      case 'finalized':
        return 'Historial de atenciones ya completadas.';
      default:
        return 'Bloques libres que aun pueden reservarse.';
    }
  });

  readonly emptyMessage = computed(() => {
    switch (this.currentView()) {
      case 'reserved':
        return 'No hay turnos reservados por el momento.';
      case 'finalized':
        return 'No hay turnos finalizados por el momento.';
      default:
        return 'No hay turnos no reservados por el momento.';
    }
  });

  private _shiftService = inject(ShiftService);
  private _authService = inject(AuthService);
  private _utilsService = inject(UtilsService);
  private _adminNotificationService = inject(AdminNotificationService);

  ngOnInit(): void {
    const user = this._authService.getUser;

    if (!user?.admin) {
      alert('Acceso denegado. Solo los administradores pueden ver los turnos reservados.');
      return;
    }

    void this._adminNotificationService.markAllAsSeen(user.id);
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
          day
        };
      })
    );

    const now = new Date();
    const reservedShifts = shiftsWithClients.filter(shift => shift.userId && this.isFutureShift(shift, now));
    const finalizedShifts = shiftsWithClients.filter(shift => shift.userId && !this.isFutureShift(shift, now));
    const notReservedShifts = shiftsWithClients.filter(shift => !shift.userId && this.isFutureShift(shift, now));

    this.shiftsReserved.set(this.sortShifts(reservedShifts));
    this.shiftsFinalized.set(this.sortShifts(finalizedShifts, true));
    this.shiftsNotReserved.set(this.sortShifts(notReservedShifts));
  }

  private isFutureShift(shift: Shift, now: Date): boolean {
    const shiftDateTime = new Date(shift.day);
    const [hours, minutes] = shift.scheduleEnd.split(':').map(Number);
    shiftDateTime.setHours(hours, minutes);

    return shiftDateTime.getTime() > now.getTime();
  }

  private sortShifts(shifts: Shift[], invertOrder = false): Shift[] {
    const sortedShifts = shifts.sort((a, b) => {
      const dayComparison = a.day.getTime() - b.day.getTime();
      if (dayComparison !== 0) {
        return dayComparison;
      }

      const schedulesA = a.scheduleStart.split(':').map(Number);
      const schedulesB = b.scheduleStart.split(':').map(Number);
      return schedulesA[0] - schedulesB[0] || schedulesA[1] - schedulesB[1];
    });

    return invertOrder ? sortedShifts.reverse() : sortedShifts;
  }

  private toInputDate(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  trackShift(index: number, shift: Shift): string {
    if (shift.id) {
      return shift.id;
    }

    const dayValue = shift.day instanceof Date ? shift.day.getTime() : new Date(shift.day).getTime();
    return `${dayValue}-${shift.scheduleStart}-${shift.scheduleEnd}-${index}`;
  }

  onFilterQueryInput(event: Event): void {
    const value = (event.target as HTMLInputElement | null)?.value ?? '';
    this.filterQuery.set(value);
  }

  onFilterDateInput(event: Event): void {
    const value = (event.target as HTMLInputElement | null)?.value ?? '';
    this.filterDate.set(value);
  }

  clearFilters(): void {
    this.filterQuery.set('');
    this.filterDate.set('');
  }

  async onDeleteShift(shift: Shift) {
    const dialogRef = this._utilsService.showMessageDialog(
      'Eliminar turno',
      'Estas seguro de eliminar este turno?',
      'Cerrar',
      'Eliminar'
    );

    dialogRef.afterClosed().subscribe(async (confirmed) => {
      if (confirmed) {
        await this._shiftService.deleteShift(shift.id!);
        this.loadShifts();
      }
    });
  }

  setView(view: 'reserved' | 'finalized' | 'notReserved') {
    this.currentView.set(view);
  }

  showReserved() {
    this.setView('reserved');
  }

  showFinalized() {
    this.setView('finalized');
  }

  showNotReserved() {
    this.setView('notReserved');
  }
}
