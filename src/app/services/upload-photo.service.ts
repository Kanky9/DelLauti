import { inject, Injectable } from '@angular/core';
import { Firestore, collection, addDoc } from '@angular/fire/firestore';
import { getDownloadURL, ref, Storage, uploadBytesResumable } from '@angular/fire/storage';
import { finalize } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UploadPhotoService {

  // private _firestore = inject(Firestore);
  // private _storage = inject(Storage);

  // constructor() { }

  // uploadPhoto(file: File, category: string): Promise<void> {
  //   const filePath = `photos/${category}/${file.name}`;
  //   const storageRef = ref(this._storage, filePath);
  //   const uploadTask = uploadBytesResumable(storageRef, file);

  //   return new Promise((resolve, reject) => {
  //     uploadTask.on(
  //       'state_changed',
  //       null,
  //       (error) => reject(error),
  //       async () => {
  //         try {
  //           const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
  //           await this.savePhotoInfo(file.name, category, downloadURL);
  //           resolve();
  //         } catch (error) {
  //           reject(error);
  //         }
  //       }
  //     );
  //   });
  // }

  // private savePhotoInfo(fileName: string, category: string, url: string) {
  //   const photosCollection = collection(this._firestore, 'photos');
  //   return addDoc(photosCollection, {
  //     name: fileName,
  //     category: category,
  //     url: url
  //   });
  // }
}
