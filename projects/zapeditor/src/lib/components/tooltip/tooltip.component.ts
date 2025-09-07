import {
  Component,
  TemplateRef,
  ViewChild,
  ViewContainerRef,
  ElementRef,
  OnDestroy,
  input,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Overlay, OverlayRef, OverlayConfig } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { ConnectedPosition } from '@angular/cdk/overlay';

@Component({
  selector: 'hub-tooltip',
  standalone: true,
  imports: [CommonModule],
  template: `
    <ng-template #tooltipTemplate>
      <div class="ze__tooltip" [class]="tooltipClass()">
        {{ text() }}
      </div>
    </ng-template>
  `,
})
export class zapEditorTooltipComponent implements OnDestroy {
  @ViewChild('tooltipTemplate', { static: true })
  tooltipTemplate!: TemplateRef<any>;
  text = input<string>('');
  tooltipClass = input<string>('');

  private overlayRef: OverlayRef | null = null;

  constructor(
    private overlay: Overlay,
    private viewContainerRef: ViewContainerRef
  ) {}

  show(origin: ElementRef, position: ConnectedPosition[] = []) {
    this.hide();

    const overlayConfig: OverlayConfig = {
      positionStrategy: this.overlay
        .position()
        .flexibleConnectedTo(origin)
        .withPositions(
          position.length > 0
            ? position
            : [
                {
                  originX: 'center',
                  originY: 'top',
                  overlayX: 'center',
                  overlayY: 'bottom',
                  offsetY: -8,
                },
                {
                  originX: 'center',
                  originY: 'bottom',
                  overlayX: 'center',
                  overlayY: 'top',
                  offsetY: 8,
                },
                {
                  originX: 'start',
                  originY: 'center',
                  overlayX: 'end',
                  overlayY: 'center',
                  offsetX: 8,
                },
                {
                  originX: 'end',
                  originY: 'center',
                  overlayX: 'start',
                  overlayY: 'center',
                  offsetX: -8,
                },
              ]
        )
        .withPush(false),
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
      hasBackdrop: false,
      panelClass: 'zapexitor__tooltip__overlay',
    };

    this.overlayRef = this.overlay.create(overlayConfig);
    const portal = new TemplatePortal(
      this.tooltipTemplate,
      this.viewContainerRef
    );
    this.overlayRef.attach(portal);
  }

  hide() {
    if (this.overlayRef) {
      this.overlayRef.dispose();
      this.overlayRef = null;
    }
  }

  ngOnDestroy() {
    this.hide();
  }
}
