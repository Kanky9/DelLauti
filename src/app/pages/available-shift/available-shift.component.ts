import { CommonModule, registerLocaleData } from '@angular/common';
import { Component, Inject, inject, OnInit, signal, WritableSignal } from '@angular/core';
import { DateAdapter, MAT_DATE_LOCALE, MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule, MatCalendar } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';
import { Shift } from '../../models/shift.interface';
import { ShiftService } from '../../services/shift.service';
import { ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { MatCardModule } from '@angular/material/card';
import localeEs from '@angular/common/locales/es';
import { LOCALE_ID } from '@angular/core';
import { UtilsService } from '../../services/utils.service';

// Registrar la localización en español
registerLocaleData(localeEs, 'es');

@Component({
  selector: 'app-available-shift',
  standalone: true,
  imports: [
    CommonModule,
    MatDatepickerModule, 
    MatFormFieldModule,  
    MatInputModule,      
    MatNativeDateModule,
    RouterLink,
    ReactiveFormsModule,
    MatCalendar,
    MatCardModule
  ],
  templateUrl: './available-shift.component.html',
  styleUrl: './available-shift.component.scss',
  providers: [
    { provide: LOCALE_ID, useValue: 'es' },
    {provide: MAT_DATE_LOCALE, useValue: 'es-ES'}
    
  ]
})
export class AvailableShiftComponent implements OnInit {
  
  shiftsAvailable: WritableSignal<Shift[]> = signal<Shift[]>([]);
  selectedDay: Date | null = null;

  constructor(
    private _adapter: DateAdapter<any>,
    @Inject(MAT_DATE_LOCALE) private _locale: string,
  ) {}

  private _shiftService = inject(ShiftService);
  private _authService = inject(AuthService);
  readonly _utilSvc = inject(UtilsService);
  private router = inject(Router);

  ngOnInit(): void {
    const usuario = this._authService.getUser;
    if (!usuario) {
      alert('Por favor, inicie sesión para reservar un turno');
    }

    this._locale = 'es-ES';
    this._adapter.setLocale(this._locale);
  }

  getDateFormatString(): string {
    if (this._locale === 'es-ES') {
      return 'DD/MM/YYYY';
    }
    return '';
  }

  // Método para obtener los turnos disponibles
  searchShiftsAvailable(dia: Date | null) {
    if (dia) {
      this._shiftService.getAvailableShifts(dia).then(turnos => {
        const turnosOrdenados = turnos.sort((a, b) => {
          const horarioA = a.scheduleStart.split(':').map(Number);
          const horarioB = b.scheduleStart.split(':').map(Number);
          return horarioA[0] - horarioB[0] || horarioA[1] - horarioB[1];
        });

        this.shiftsAvailable.set(turnosOrdenados);
      });
    }
  }

  // Método para abrir el modal de confirmación antes de reservar el turno
  confirmBooking(shift: Shift) {
    const dialogRef = this._utilSvc.showMessageDialog(
      '¿Quieres reservar el siguiente turno?',
      `${shift.scheduleStart} - ${shift.scheduleEnd}, ${shift.day.toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}`,
      'Cancelar',
      'Reservar'
    );

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.bookShift(shift);
      }
    });
  }

  // Método para reservar el turno
  bookShift(turno: Shift) {
    const usuario = this._authService.getUser;
    
    if (usuario) {
      const clienteId = usuario.id;

      this._shiftService.bookShift(turno.id!, clienteId).then(() => {
        const dialogRef = this._utilSvc.showMessageDialog(
          'Turno reservado correctamente',
          `Turno: ${turno.scheduleStart} - ${turno.scheduleEnd} - ${turno.day.toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}`,
          'Cerrar',
          'Ir a Inicio'
        );

        dialogRef.afterClosed().subscribe(async(result) => {
          if (result) {  
            await this.router.navigate(['/home']);
          }
        });

        this.searchShiftsAvailable(this.selectedDay);  
      });
    }
  }
}
