import { Component, Inject, inject, LOCALE_ID, OnInit, signal, WritableSignal } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ShiftService } from '../../../services/shift.service';
import { CommonModule, registerLocaleData } from '@angular/common';
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
  addSchedules() {
    const { scheduleStart, scheduleEnd } = this.shiftForm.value;
    if (scheduleStart && scheduleEnd) {
      const inicio = new Date(`1970-01-01T${scheduleStart}:00`);
      const fin = new Date(`1970-01-01T${scheduleEnd}:00`);
      this.schedules.push({
        inicio: inicio.toTimeString().substring(0, 5),
        fin: fin.toTimeString().substring(0, 5),
      });
    }
  }

  //* Método para eliminar un horario de la lista
  deleteSchedules(index: number) {
    this.schedules.splice(index, 1);
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