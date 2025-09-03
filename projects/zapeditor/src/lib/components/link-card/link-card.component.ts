import {
  Component,
  effect,
  model,
  OnDestroy,
  OnInit,
  output,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Subscription } from 'rxjs';

@Component({
  selector: 'hub-editor-link-card',
  imports: [FormsModule, ReactiveFormsModule],
  templateUrl: './link-card.component.html',
  styleUrl: './link-card.component.scss',
})
export class HubLinkCardComponent implements OnInit, OnDestroy {
  add = output<{ href: string; text: string }>();
  href = model<string>();
  text = model<string>();
  private sub: Subscription = new Subscription();
  form!: FormGroup;

  constructor(private fb: FormBuilder) {
    effect(() => {
      this.form.patchValue({ href: this.href(), text: this.text() });
    });
  }

  ngOnInit(): void {
    this.createForm();
  }

  private createForm(): void {
    this.form = this.fb.group({
      href: ['', [Validators.required, Validators.pattern('^https?://.+')]],
      text: [''],
    });
  }

  onEnter(event: Event): void {
    if (this.form.valid) {
      event.preventDefault();
      this.add.emit(this.form.value);
    }
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }
}
