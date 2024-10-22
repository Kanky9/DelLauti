export interface Shift {
  id?: string;
  day: Date;
  scheduleStart: string;
  scheduleEnd: string;
  available: boolean;
  userId?: string | null;
  userName?: string;
  userEmail?: string;
}