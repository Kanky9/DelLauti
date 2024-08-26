import { inject, Injectable, Signal, signal } from '@angular/core';
import { Auth, createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword, signOut } from '@angular/fire/auth';
import { doc, Firestore, getDoc, setDoc } from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { UserModel } from '../models/user.interface';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private _auth = inject(Auth);
  private _firestore = inject(Firestore);
  private _router = inject(Router);
  private _snackBar = inject(MatSnackBar);

  private user = signal<UserModel | null>(null);
  public user$: Signal<UserModel | null> = this.user;

  get getUser() {
    return this.user();
  }

  constructor() {
    onAuthStateChanged(this._auth, (user) => {
      if (user) {
        const userModel: UserModel = {
          id: user.uid,
          name: user.displayName || '', // Asigna el nombre de Firebase o un string vacío si no está disponible
          email: user.email || '',
          admin: false // Si tienes un campo admin en tu base de datos, debes obtenerlo de ahí
        };
        this.user.set(userModel);
      } else {
        this.user.set(null);
      }
    });
  }

  // * Método para registrar un usuario nuevo
  async register(name: string, email: string, password: string): Promise<void> {
    try {
      const userCredential = await createUserWithEmailAndPassword(this._auth, email, password);
      const user = userCredential.user;

      const newUser: UserModel = {
        id: user.uid,
        name: name,
        email: email,
        admin: false
      };

      await setDoc(doc(this._firestore, `users/${user.uid}`), newUser);

      this.user.set(newUser);
      
      this._snackBar.open('Usuario registrado con éxito, ve a iniciar sesión para acceder con tu cuenta.', 'Cerrar', {
        duration: 3000,
        panelClass: ['snackbar-success']
      });
      console.log(`Usuario creado y guardado en Firestore: ${email}`);
      this._router.navigate(['/auth']);
    } catch (error) {
      this._snackBar.open('Error al registrar el usuario', 'Cerrar', {
        duration: 3000,
        panelClass: ['snackbar-error']
      });
      console.error('Error al registrar el usuario', error);
    }
  }

  // * Método para iniciar sesión
  async login(email: string, password: string): Promise<UserModel | null> {
    try {
      const userCredential = await signInWithEmailAndPassword(this._auth, email, password);
      const user = userCredential.user;

      const userDoc = doc(this._firestore, `users/${user.uid}`);
      const userSnapshot = await getDoc(userDoc);
      const userData = userSnapshot.data() as UserModel;

      this.user.set(userData);

      this._snackBar.open(`Bienvenido ${this.user()!.name}`, 'Cerrar', {
        duration: 3000,
        panelClass: ['snackbar-success']
      });
      console.log(`Usuario autenticado con éxito: ${email}`);
      this._router.navigate(['/home']);
      return userData;
    } catch (error) {
      this._snackBar.open('Error al iniciar sesión', 'Cerrar', {
        duration: 3000,
        panelClass: ['snackbar-error']
      });
      console.error('Error al iniciar sesión', error);
      return null;
    }
  }

  // * Método para cerrar sesión
  async logout(): Promise<void> {
    try {
      this._snackBar.open(`Adiós ${this.user()!.name}`, 'Cerrar', {
        duration: 3000,
        panelClass: ['snackbar-success']
      });
      await signOut(this._auth);
      this.user.set(null);
      
      console.log('Sesión cerrada con éxito');
      this._router.navigate(['/auth']);
    } catch (error) {
      this._snackBar.open('Error al iniciar sesión', 'Cerrar', {
        duration: 3000,
        panelClass: ['snackbar-error']
      });
      console.error('Error al cerrar sesión', error);
    }
  }
}
