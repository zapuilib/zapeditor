import { Component } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { ZapEditor } from 'zapeditor';

@Component({
  selector: 'app-root',
  imports: [HttpClientModule, ZapEditor],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'demo';
}
