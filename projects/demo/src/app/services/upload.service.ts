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

  /**
   * Simulates file upload to a server
   * Returns a real image URL from picsum.photos
   */
  uploadFile(file: File): Observable<UploadResponse> {
    // Simulate upload delay based on file size
    // Base time + additional time based on file size (up to 50MB)
    const baseTime = 1000; // 1 second base
    const sizeBasedTime = (file.size / (50 * 1024 * 1024)) * 5000; // Up to 5 seconds for 50MB
    const randomVariation = Math.random() * 2000; // 0-2 seconds random
    const uploadTime = baseTime + sizeBasedTime + randomVariation;
    
    return of(this.generateUploadResponse(file)).pipe(
      delay(uploadTime)
    );
  }

  private generateUploadResponse(file: File): UploadResponse {
    // Generate random dimensions for the image
    const width = Math.floor(Math.random() * 400) + 200; // 200-600px
    const height = Math.floor(Math.random() * 300) + 200; // 200-500px
    
    // Use picsum.photos for real images
    const imageUrl = `https://picsum.photos/${width}/${height}?random=${Date.now()}`;
    
    return {
      success: true,
      url: imageUrl,
      filename: file.name,
      size: file.size,
      type: file.type
    };
  }

  /**
   * Simulates upload progress (optional)
   */
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
