import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

export interface UploadResponse {
  success: boolean;
  url: string;
  filename: string;
  size: number;
  type: string;
}

@Injectable({
  providedIn: 'root'
})
export class UploadService {
  
  constructor() { }

  uploadFile(file: File): Observable<UploadResponse> {
    const baseTime = 1000;
    const sizeBasedTime = (file.size / (50 * 1024 * 1024)) * 5000;
    const randomVariation = Math.random() * 2000;
    const uploadTime = baseTime + sizeBasedTime + randomVariation;
    
    return of(this.generateUploadResponse(file)).pipe(
      delay(uploadTime)
    );
  }

  private generateUploadResponse(file: File): UploadResponse {
    const width = Math.floor(Math.random() * 400) + 200;
    const height = Math.floor(Math.random() * 300) + 200;
    
    const imageUrl = `https://picsum.photos/${width}/${height}?random=${Date.now()}`;
    
    return {
      success: true,
      url: imageUrl,
      filename: file.name,
      size: file.size,
      type: file.type
    };
  }

  getUploadProgress(): Observable<number> {
    return new Observable(observer => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 20;
        if (progress >= 100) {
          progress = 100;
          observer.next(progress);
          observer.complete();
          clearInterval(interval);
        } else {
          observer.next(progress);
        }
      }, 100);
    });
  }
}
