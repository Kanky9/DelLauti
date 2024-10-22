import { inject, Injectable, Signal, signal } from '@angular/core';
import { Auth, createUserWithEmailAndPassword, GoogleAuthProvider, onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup, signOut, User } from '@angular/fire/auth';
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

  private _googleProvider = new GoogleAuthProvider();

  private user = signal<UserModel | null>(null);
  public user$: Signal<UserModel | null> = this.user;

  get getUser() {
    return this.user();
  }

  constructor() {
    onAuthStateChanged(this._auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userData = await this.getUserDataFromFirestore(firebaseUser);
        this.user.set(userData);
      } else {
        this.user.set(null);
      }
    });
  }

  private async getUserDataFromFirestore(firebaseUser: User): Promise<UserModel> {
    const userDocRef = doc(this._firestore, `users/${firebaseUser.uid}`);
    const userSnapshot = await getDoc(userDocRef);

    if (userSnapshot.exists()) {
        const userData = userSnapshot.data() as UserModel;
        console.log('User data retrieved:', userData); 
        return userData;
    } else {
        const userModel: UserModel = {
            id: firebaseUser.uid,
            name: firebaseUser.displayName || '',
            email: firebaseUser.email || '',
            admin: false
        };
        await setDoc(userDocRef, userModel);
        console.log('New user created:', userModel); 
        return userModel;
    }
  }
  
  // * Método para obtener la información del cliente a partir de su ID
  async getUserInfo(userId: string): Promise<UserModel | null> {
    try {
      const userDocRef = doc(this._firestore, `users/${userId}`);
      const userSnapshot = await getDoc(userDocRef);

      if (userSnapshot.exists()) {
        return userSnapshot.data() as UserModel; // Retorna la información del usuario en formato de UserModel
      } else {
        console.log('No such user document!');
        return null;
      }
    } catch (error) {
      console.error('Error obteniendo la información del usuario:', error);
      return null;
    }
  }

  // * Método para iniciar sesión con Google
  async loginWithGoogle(): Promise<void> {
    try {
      const result = await signInWithPopup(this._auth, this._googleProvider);
      const firebaseUser = result.user;

      const userData = await this.getUserDataFromFirestore(firebaseUser);
      this.user.set(userData);

      this._snackBar.open(`Bienvenido ${userData.name}`, 'Cerrar', {
        duration: 3000,
        panelClass: ['snackbar-success']
      });
      console.log(`Inicio de sesión con Google exitoso para: ${userData.name}`);
      this._router.navigate(['/home']);
    } catch (error) {
      this._snackBar.open('Error al iniciar sesión con Google', 'Cerrar', {
        duration: 3000,
        panelClass: ['snackbar-error']
      });
      console.error('Error al iniciar sesión con Google', error);
    }
  }

  // * Método para registrar con Google
  async registerWithGoogle(): Promise<void> {
    // Usualmente, el registro con Google se maneja igual que el inicio de sesión,
    // así que puedes usar loginWithGoogle para el registro también
    await this.loginWithGoogle();
  }

  // * Método para registrar un usuario nuevo
  async register(name: string, email: string, password: string): Promise<void> {
    try {
      const userCredential = await createUserWithEmailAndPassword(this._auth, email, password);
      const firebaseUser = userCredential.user;

      const newUser: UserModel = {
        id: firebaseUser.uid,
        name: name,
        email: email,
        admin: false
      };

      await setDoc(doc(this._firestore, `users/${firebaseUser.uid}`), newUser);

      this.user.set(newUser);

      this._snackBar.open('Usuario registrado con éxito. Ahora puedes iniciar sesión con tu cuenta.', 'Cerrar', {
        duration: 3000,
        panelClass: ['snackbar-success'],
        
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
  async login(email: string, password: string): Promise<void> {
    try {
      const userCredential = await signInWithEmailAndPassword(this._auth, email, password);
      const firebaseUser = userCredential.user;

      const userData = await this.getUserDataFromFirestore(firebaseUser);
      this.user.set(userData);

      this._snackBar.open(`Bienvenido ${userData.name}`, 'Cerrar', {
        duration: 3000,
        panelClass: ['snackbar-success']
      });
      console.log(`Usuario autenticado con éxito: ${email}`);
      this._router.navigate(['/home']);
    } catch (error) {
      this._snackBar.open('Error al iniciar sesión', 'Cerrar', {
        duration: 3000,
        panelClass: ['snackbar-error']
      });
      console.error('Error al iniciar sesión', error);
    }
  }

  // * Método para cerrar sesión
  async logout(): Promise<void> {
    try {
      const userName = this.user()?.name || 'Usuario';
      await signOut(this._auth);
      this.user.set(null);

      this._snackBar.open(`Adiós ${userName}`, 'Cerrar', {
        duration: 3000,
        panelClass: ['snackbar-success']
      });
      console.log('Sesión cerrada con éxito');
      this._router.navigate(['/auth']);
    } catch (error) {
      this._snackBar.open('Error al cerrar sesión', 'Cerrar', {
        duration: 3000,
        panelClass: ['snackbar-error']
      });
      console.error('Error al cerrar sesión', error);
    }
  }
}
