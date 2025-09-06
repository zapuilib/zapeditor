import { Directive, ElementRef, OnDestroy, OnInit, input, inject } from '@angular/core';
import { TooltipService } from '../../services/tooltip.service';

@Directive({
  selector: '[zapEditorTooltip]',
  standalone: true,
})
export class zapEditorTooltipDirective implements OnInit, OnDestroy {
  zapEditorTooltip = input<string>('');
  tooltipDelay = input<number>(500);

  private tooltipService = inject(TooltipService);
  private cleanupFn: (() => void) | null = null;

  constructor(private elementRef: ElementRef) {}

  ngOnInit() {
    this.setupTooltip();
  }

  ngOnDestroy() {
    this.cleanup();
  }

  private setupTooltip() {
    this.cleanupFn = this.tooltipService.createTooltip({
      text: this.zapEditorTooltip(),
      delay: this.tooltipDelay(),
      element: this.elementRef.nativeElement
    });
  }

  private cleanup() {
    if (this.cleanupFn) {
      this.cleanupFn();
      this.cleanupFn = null;
    }
  }
}