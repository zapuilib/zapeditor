import { Injectable } from '@angular/core';

export interface TooltipConfig {
  text: string;
  delay?: number;
  element: HTMLElement;
}

@Injectable({
  providedIn: 'root'
})
export class TooltipService {
  private activeTooltips = new Map<HTMLElement, HTMLElement>();

  createTooltip(config: TooltipConfig) {
    const { text, delay = 500, element } = config;
    let showTimeout: any;
    let hideTimeout: any;
    
    const show = () => {
      // Hide any existing tooltip for this element
      this.hideTooltipForElement(element);
      
      const tooltipElement = document.createElement('div');
      tooltipElement.className = 'ze__tooltip ze__tooltip--entering';
      tooltipElement.textContent = text;
      tooltipElement.style.position = 'absolute';
      tooltipElement.style.zIndex = '10001';
      tooltipElement.style.pointerEvents = 'none';
      tooltipElement.style.opacity = '0';
      tooltipElement.style.transform = 'translateY(10px)';

      document.body.appendChild(tooltipElement);
      
      // Store the tooltip for this element
      this.activeTooltips.set(element, tooltipElement);

      // Position the tooltip
      const elementRect = element.getBoundingClientRect();
      const tooltipRect = tooltipElement.getBoundingClientRect();
      
      let top = elementRect.top - tooltipRect.height - 8;
      let left = elementRect.left + (elementRect.width / 2) - (tooltipRect.width / 2);

      if (top < 8) {
        top = elementRect.bottom + 8;
      }

      if (left < 8) {
        left = 8;
      } else if (left + tooltipRect.width > window.innerWidth - 8) {
        left = window.innerWidth - tooltipRect.width - 8;
      }

      tooltipElement.style.top = `${top}px`;
      tooltipElement.style.left = `${left}px`;

      // Trigger animation
      requestAnimationFrame(() => {
        if (this.activeTooltips.has(element)) {
          tooltipElement.style.transition = 'opacity 0.2s ease-out, transform 0.2s ease-out';
          tooltipElement.style.opacity = '1';
          tooltipElement.style.transform = 'translateY(0)';
          tooltipElement.classList.remove('ze__tooltip--entering');
          tooltipElement.classList.add('ze__tooltip--visible');
        }
      });
    };

    const hide = () => {
      this.hideTooltipForElement(element);
    };

    const onMouseEnter = () => {
      clearTimeout(hideTimeout);
      showTimeout = setTimeout(show, delay);
    };

    const onMouseLeave = () => {
      clearTimeout(showTimeout);
      hideTimeout = setTimeout(hide, 100);
    };

    element.addEventListener('mouseenter', onMouseEnter);
    element.addEventListener('mouseleave', onMouseLeave);

    // Return cleanup function
    return () => {
      clearTimeout(showTimeout);
      clearTimeout(hideTimeout);
      this.hideTooltipForElement(element);
      element.removeEventListener('mouseenter', onMouseEnter);
      element.removeEventListener('mouseleave', onMouseLeave);
    };
  }

  private hideTooltipForElement(element: HTMLElement) {
    const tooltipElement = this.activeTooltips.get(element);
    if (tooltipElement) {
      tooltipElement.style.transition = 'opacity 0.15s ease-in, transform 0.15s ease-in';
      tooltipElement.style.opacity = '0';
      tooltipElement.style.transform = 'translateY(5px)';
      tooltipElement.classList.remove('ze__tooltip--visible');
      tooltipElement.classList.add('ze__tooltip--exiting');

      setTimeout(() => {
        if (tooltipElement && tooltipElement.parentNode) {
          document.body.removeChild(tooltipElement);
        }
        this.activeTooltips.delete(element);
      }, 150);
    }
  }

}
