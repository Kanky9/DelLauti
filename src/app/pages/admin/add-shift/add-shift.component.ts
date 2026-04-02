import { Component, Inject, inject, LOCALE_ID, OnInit, signal, WritableSignal } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ShiftService } from '../../../services/shift.service';
import { CommonModule, registerLocaleData } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import localeEs from '@angular/common/locales/es';

registerLocaleData(localeEs, 'es');  // <- Asegúrate de registrar el locale 'es'

import { Router, RouterLink } from '@angular/router';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE, MatNativeDateModule } from '@angular/material/core';
import { MatCardModule } from '@angular/material/card';
import { UtilsService } from '../../../services/utils.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LoadingComponent } from '../../../shared/utils/loading/loading.component';

@Component({
  selector: 'app-add-shift',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterLink,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatNativeDateModule,
    MatCardModule,
    LoadingComponent
  ],
  templateUrl: './add-shift.component.html',
  styleUrls: ['./add-shift.component.scss'],
  providers: [
    { provide: LOCALE_ID, useValue: 'es-ES' },
    { provide: MAT_DATE_LOCALE, useValue: 'es-ES' },
    {
      provide: MAT_DATE_FORMATS, useValue: {
        parse: {
          dateInput: 'DD/MM/YYYY',
        },
        display: {
          dateInput: 'DD/MM/YYYY',
          monthYearLabel: 'MMMM YYYY',
          dateA11yLabel: 'LL',
          monthYearA11yLabel: 'MMMM YYYY'
        }
      }
    },
    { provide: MAT_DATE_LOCALE, useValue: 'es-ES' }
  ]
})
export class AddShiftComponent implements OnInit {

  scheduleMode: 'manual' | 'range' = 'manual';
  shiftForm!: FormGroup;
  schedules: { inicio: string; fin: string }[] = [];
  daysSelected: WritableSignal<Date[]> = signal<Date[]>([]);
  newDay: Date | null = null;

  private _fb = inject(FormBuilder);
  private _shiftService = inject(ShiftService);
  readonly _utilSvc = inject(UtilsService);
  private _snackBar = inject(MatSnackBar);
  private _router = inject(Router);

  constructor(
    private _adapter: DateAdapter<any>,
    @Inject(MAT_DATE_LOCALE) private _locale: string,
  ) {
    this.shiftForm = this._fb.group({
      scheduleStart: [''],
      scheduleEnd: [''],
      rangeStart: [''],
      rangeEnd: [''],
      slotDuration: [30],
    });
  }

  ngOnInit(): void {
    this._shiftService.deleteExpiredShifts(); this._locale = 'es-ES';
    this._adapter.setLocale(this._locale);
  }

  getDateFormatString(): string {
    if (this._locale === 'es-ES') {
      return 'DD/MM/YYYY';
    }
    return '';
  }

  setScheduleMode(mode: 'manual' | 'range'): void {
    this.scheduleMode = mode;
  }

  //* Método para agregar un día a la lista desde el mat-calendar
  addDay(day: Date | null) {
    if (day) {
      const days = [...this.daysSelected()];
      const CloneDay = new Date(day);
      if (!days.some(d => d.toDateString() === CloneDay.toDateString())) {
        days.push(CloneDay);
        this.daysSelected.set(days);
      }
    }
  }

  //* Método para eliminar un día de la lista
  deleteDay(index: number) {
    const days = [...this.daysSelected()];
    days.splice(index, 1);
    this.daysSelected.set(days);
  }

  //* Método para agregar un horario a la lista
  addSchedules(): void {
    const { scheduleStart, scheduleEnd } = this.shiftForm.value;
    if (!scheduleStart || !scheduleEnd) {
      this.showScheduleWarning('Debes indicar horario de inicio y fin.');
      return;
    }

    if (scheduleStart >= scheduleEnd) {
      this.showScheduleWarning('La hora de inicio debe ser menor a la hora de fin.');
      return;
    }

    const addedCount = this.mergeSchedules([{ inicio: scheduleStart, fin: scheduleEnd }]);
    if (addedCount === 0) {
      this.showScheduleWarning('Ese bloque horario ya fue agregado.');
      return;
    }

    this.shiftForm.patchValue({
      scheduleStart: '',
      scheduleEnd: ''
    });
  }

  async addSchedulesFromRange(): Promise<void> {
    const { rangeStart, rangeEnd, slotDuration } = this.shiftForm.value;

    if (!rangeStart || !rangeEnd) {
      this.showScheduleWarning('Debes indicar hora de inicio y fin del rango.');
      return;
    }

    const duration = Number(slotDuration);
    if (!Number.isInteger(duration) || duration <= 0) {
      this.showScheduleWarning('La duracion del turno debe ser un numero entero mayor a 0.');
      return;
    }

    if (rangeStart >= rangeEnd) {
      this.showScheduleWarning('La hora de inicio del rango debe ser menor a la hora de fin.');
      return;
    }

    const startMinutes = this.getMinutesFromTime(rangeStart);
    const endMinutes = this.getMinutesFromTime(rangeEnd);
    let cursor = startMinutes;
    const generatedSchedules: { inicio: string; fin: string }[] = [];

    while (cursor + duration <= endMinutes) {
      generatedSchedules.push({
        inicio: this.formatTime(cursor),
        fin: this.formatTime(cursor + duration)
      });
      cursor += duration;
    }

    const remainder = endMinutes - cursor;
    let extendedEnd = false;

    if (remainder > 0) {
      const shouldExtend = await this.askToExtendRangeEnd(cursor, rangeEnd, duration, remainder);
      if (shouldExtend) {
        generatedSchedules.push({
          inicio: this.formatTime(cursor),
          fin: this.formatTime(cursor + duration)
        });
        extendedEnd = true;
      }
    }

    if (generatedSchedules.length === 0) {
      this.showScheduleWarning('Con ese rango no se puede generar ningun turno.');
      return;
    }

    const addedCount = this.mergeSchedules(generatedSchedules);
    if (addedCount === 0) {
      this.showScheduleWarning('Los horarios generados ya existian en la lista.');
      return;
    }

    if (extendedEnd) {
      this.showScheduleInfo(`Se agregaron ${addedCount} turno(s) y se extendio el horario final.`);
    } else {
      this.showScheduleInfo(`Se agregaron ${addedCount} turno(s) desde el rango seleccionado.`);
    }

    this.shiftForm.patchValue({
      rangeStart: '',
      rangeEnd: ''
    });
  }

  //* Método para eliminar un horario de la lista
  deleteSchedules(index: number) {
    this.schedules.splice(index, 1);
  }

  private mergeSchedules(newSchedules: { inicio: string; fin: string }[]): number {
    const initialLength = this.schedules.length;
    const schedulesMap = new Map(
      this.schedules.map(schedule => [`${schedule.inicio}-${schedule.fin}`, schedule])
    );

    newSchedules.forEach((schedule) => {
      const key = `${schedule.inicio}-${schedule.fin}`;
      if (!schedulesMap.has(key)) {
        schedulesMap.set(key, schedule);
      }
    });

    this.schedules = Array.from(schedulesMap.values()).sort(
      (a, b) => this.getMinutesFromTime(a.inicio) - this.getMinutesFromTime(b.inicio)
    );

    return this.schedules.length - initialLength;
  }

  private getMinutesFromTime(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private formatTime(totalMinutes: number): string {
    const hours = Math.floor(totalMinutes / 60).toString().padStart(2, '0');
    const minutes = (totalMinutes % 60).toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  private async askToExtendRangeEnd(
    nextStart: number,
    originalEnd: string,
    duration: number,
    remainder: number
  ): Promise<boolean> {
    const dialogRef = this._utilSvc.showMessageDialog(
      'Ultimo turno fuera del rango',
      `Quedan ${remainder} minuto(s) sin completar.<br><br>` +
      `Para incluir un ultimo turno de ${duration} min, el horario final pasaria de ${originalEnd} a ${this.formatTime(nextStart + duration)}.`,
      'No incluir ultimo',
      'Extender horario final'
    );

    const result = await firstValueFrom(dialogRef.afterClosed());
    return !!result;
  }

  private showScheduleWarning(message: string): void {
    this._snackBar.open(message, 'Cerrar', {
      duration: 3200,
      panelClass: 'snackbar-error'
    });
  }

  private showScheduleInfo(message: string): void {
    this._snackBar.open(message, 'Cerrar', {
      duration: 3200,
      panelClass: 'snackbar-success'
    });
  }

  //* Método para guardar los turnos
  async saveShifts(): Promise<void> {
    if (this.shiftForm.valid && this.schedules.length > 0 && this.daysSelected().length > 0) {
      this._utilSvc.show();
      try {
        const days = this.daysSelected();
        const schedules = this.schedules;

        // Verificar si hay duplicados antes de guardar y obtener los duplicados
        const duplicates = await this._shiftService.checkIfShiftExists(days, schedules);

        if (duplicates.length > 0) {
          // Formatear los turnos duplicados para mostrarlos
          const duplicateDetails = duplicates.map(dup =>
            `Día: ${dup.day.toLocaleDateString('es-ES')} ${dup.scheduleStart} - ${dup.scheduleEnd}<br>`
          ).join('');

          // Mostrar el modal con la información de los duplicados
          const dialogRef = this._utilSvc.showMessageDialog(
            'Ya existen los turnos:',
            `${duplicateDetails}<br>Elimínalos para poder guardar los nuevos turnos`
          );

          // Esperar a que se cierre el modal antes de continuar
          await dialogRef.afterClosed().toPromise();
        } else {
          await this._shiftService.saveShifts(days, schedules);
          const dialogRef = this._utilSvc.showMessageDialog(
            'Éxito',
            'Turnos guardados con éxito',
            'Cerrar',
            'Ir a Inicio'
          );

          dialogRef.afterClosed().subscribe(async (result) => {
            if (result) {
              await this._router.navigate(['/home']);
            }
          });
        }
      } catch (error) {
        console.error('Error al guardar un turno', error);
        const dialogRef = this._utilSvc.showMessageDialog(
          'Error',
          'Hubo un error al guardar un turno',
        );

        await dialogRef.afterClosed().toPromise();
      } finally {
        this._utilSvc.hide();  // Ocultar carga
      }
    }
  }
}
