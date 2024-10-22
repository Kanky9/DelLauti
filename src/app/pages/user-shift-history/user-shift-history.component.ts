import { Component, OnInit, signal, WritableSignal, inject, LOCALE_ID } from '@angular/core';
import { CommonModule, registerLocaleData } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { Timestamp } from 'firebase/firestore';
import { Shift } from '../../models/shift.interface';
import { ShiftService } from '../../services/shift.service';
import { AuthService } from '../../services/auth.service';
import { RouterLink } from '@angular/router';
import { UtilsService } from '../../services/utils.service';
import { MatDialog } from '@angular/material/dialog';
import localeEs from '@angular/common/locales/es';

// Registrar el locale 'es' para fechas en español
registerLocaleData(localeEs);

@Component({
  selector: 'app-user-shift-history',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    RouterLink
  ],
  templateUrl: './user-shift-history.component.html',
  styleUrls: ['./user-shift-history.component.scss'],
  providers: [
    { provide: LOCALE_ID, useValue: 'es-ES' }
  ]
})
export class UserShiftHistoryComponent implements OnInit {
  
  upcomingShifts: WritableSignal<Shift[]> = signal<Shift[]>([]);
  pastShifts: WritableSignal<Shift[]> = signal<Shift[]>([]);
  
  private _shiftService = inject(ShiftService);
  private _authService = inject(AuthService);
  private _utilsService = inject(UtilsService);
  private _dialog = inject(MatDialog);

  ngOnInit(): void {
    this.loadUserShifts();
    this._shiftService.deleteExpiredShifts();
  }

  async loadUserShifts() {
    const user = this._authService.getUser;

    if (!user) {
        alert('Debes estar autenticado para ver tus turnos.');
        return;
    }

    const allShifts = await this._shiftService.getUserShifts(user.id);
    const now = new Date(); 

    const [pastShifts, upcomingShifts] = allShifts.reduce(
        (acc: [Shift[], Shift[]], shift: Shift) => {
            // Convertir 'day' a Date si es necesario
            const shiftDate = shift.day instanceof Timestamp ? shift.day.toDate() : new Date(shift.day);
            
            const shiftTime = new Date(shiftDate);
            const [hours, minutes] = shift.scheduleStart.split(':').map(Number);
            shiftTime.setHours(hours, minutes);

            if (shiftTime < now) {
                acc[0].push({
                    ...shift,
                    day: shiftDate // Aseguramos que day es un objeto Date
                }); // Pasado
            } else {
                acc[1].push({
                    ...shift,
                    day: shiftDate // Aseguramos que day es un objeto Date
                }); // Futuro
            }
            return acc;
        },
        [[], []]
    );

    // Ordenar futuros turnos
    const orderedUpcomingShifts = upcomingShifts.sort((a, b) => {
        const dayComparison = a.day.getTime() - b.day.getTime();
        if (dayComparison !== 0) {
            return dayComparison; // Ordenar por día
        }
        const schedulesA = a.scheduleStart.split(':').map(Number);
        const schedulesB = b.scheduleStart.split(':').map(Number);
        return schedulesA[0] - schedulesB[0] || schedulesA[1] - schedulesB[1]; // Ordenar por horario
    });

    // Ordenar pasados turnos y luego invertir el orden
    const orderedPastShifts = pastShifts.sort((a, b) => {
        const dayComparison = a.day.getTime() - b.day.getTime();
        if (dayComparison !== 0) {
            return dayComparison; // Ordenar por día
        }
        const schedulesA = a.scheduleStart.split(':').map(Number);
        const schedulesB = b.scheduleStart.split(':').map(Number);
        return schedulesA[0] - schedulesB[0] || schedulesA[1] - schedulesB[1]; // Ordenar por horario
    }).reverse(); // Invertir el orden para mostrar del más reciente al más antiguo

    this.pastShifts.set(orderedPastShifts);
    this.upcomingShifts.set(orderedUpcomingShifts);
  }


  // * Función para manejar la cancelación de turnos
  async onCancelShift(shift: Shift) {
    // Abre el primer modal para confirmar la cancelación
    const dialogRef = this._utilsService.showMessageDialog(
      "Confirmación de Cancelación",
      "¿Estás seguro de cancelar tu turno?",
      "Cerrar",
      "Aceptar"
    );

    dialogRef.afterClosed().subscribe(async (confirmed) => {
      if (confirmed) {
        // Si el usuario confirma, abre el segundo modal
        const secondDialogRef = this._utilsService.showMessageDialog(
          "Instrucción",
          'Para cancelar tu turno, envíale un mensaje al peluquero (Si precionas "cerrar", tu turno no será cancelado).',
          "Cerrar",
          "Enviar"
        );

        secondDialogRef.afterClosed().subscribe(async (finalConfirm) => {
          if (finalConfirm) {
            // Verificar si el turno no ha pasado y actualizar la disponibilidad
            const now = new Date();
            const shiftTime = new Date(shift.day);
            const [hours, minutes] = shift.scheduleStart.split(':').map(Number);
            shiftTime.setHours(hours, minutes);

            if (shiftTime > now) {
              await this._shiftService.cancelShift(shift.id!);
            }

            // Redirigir a WhatsApp con el mensaje de cancelación
            this.redirectToWhatsApp(shift);
          }
        });
      }
    });
  }

  // * Función para redirigir a WhatsApp con los detalles del turno cancelado
  redirectToWhatsApp(shift: Shift) {
    const whatsappMessage = `Hola, he cancelado mi turno para el día: ${shift.day.toLocaleDateString('es-ES')} a las ${shift.scheduleStart}`;
    const whatsappNum = '543462334472';
    const whatsappUrl = `https://wa.me/${whatsappNum}?text=${encodeURIComponent(whatsappMessage)}`;
    window.open(whatsappUrl, '_blank');
  }
}
