import { Timestamp } from '@angular/fire/firestore';

export interface AdminNotification {
  id?: string;
  type: 'shift_booked';
  message: string;
  shiftId: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  shiftDay: Date;
  scheduleStart: string;
  scheduleEnd: string;
  createdAt: Date | Timestamp | null;
  seenBy: string[];
}
