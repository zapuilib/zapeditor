import { FILE_ICONS, MEDIA_CONSTANTS } from './media.constant';

export { FILE_ICONS, MEDIA_CONSTANTS };

export function getFileIcon(fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase();
  const iconClass = FILE_ICONS[extension as keyof typeof FILE_ICONS] || 'fa-file';
  return `<i class="fa-regular ${iconClass}"></i>`;
}

export function formatFileSize(fileSize: number): string {
  if (!fileSize || fileSize === 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = fileSize;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  if (unitIndex === 0) {
    return `${Math.round(size)} ${units[unitIndex]}`;
  } else if (size < 10) {
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  } else if (size < 100) {
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  } else {
    return `${Math.round(size)} ${units[unitIndex]}`;
  }
}

export function createToolbarButton(iconClass: string, title: string): HTMLElement {
  const button = document.createElement('button');
  button.setAttribute('zapEditorTooltip', title);
  
  const icon = document.createElement('i');
  icon.className = `fa-regular ${iconClass}`;
  button.appendChild(icon);
  
  return button;
}

export function cleanupTooltips(container: HTMLElement): void {
  const elementsWithTooltips = container.querySelectorAll('[zapEditorTooltip]');
  elementsWithTooltips.forEach((element) => {
    if ((element as any).__tooltipCleanup) {
      (element as any).__tooltipCleanup();
    }
  });
}

export function initializeTooltips(container: HTMLElement): void {
  import('../../services/tooltip.service').then(({ TooltipService }) => {
    const tooltipService = new TooltipService();
    
    const elementsWithTooltips = container.querySelectorAll('[zapEditorTooltip]');
    
    elementsWithTooltips.forEach((element) => {
      const tooltipText = element.getAttribute('zapEditorTooltip');
      if (tooltipText) {
        const cleanupFn = tooltipService.createTooltip({
          text: tooltipText,
          delay: MEDIA_CONSTANTS.TOOLTIP_DELAY,
          element: element as HTMLElement
        });
        
        (element as any).__tooltipCleanup = cleanupFn;
      }
    });
  });
}

export function downloadFile(url: string, fileName: string): void {
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName || 'media-download';
  link.target = '_blank';
  link.click();
}

export function calculateResizeConstraints(editorElement: HTMLElement) {
  const editorRect = editorElement.getBoundingClientRect();
  const editorWidth = editorRect.width;
  const maxWidth = Math.min(editorWidth - MEDIA_CONSTANTS.EDITOR_MARGIN, MEDIA_CONSTANTS.MAX_WIDTH);
  
  return {
    minWidth: MEDIA_CONSTANTS.MIN_WIDTH,
    maxWidth
  };
}

export function calculateNewDimensions(
  startWidth: number,
  startHeight: number,
  deltaX: number,
  direction: 'left' | 'right',
  constraints: { minWidth: number; maxWidth: number }
) {
  const aspectRatio = startWidth / startHeight;
  let newWidth = startWidth;

  if (direction === 'right') {
    newWidth = Math.max(constraints.minWidth, Math.min(constraints.maxWidth, startWidth + deltaX));
  } else {
    newWidth = Math.max(constraints.minWidth, Math.min(constraints.maxWidth, startWidth - deltaX));
  }

  const newHeight = newWidth / aspectRatio;
  
  return { newWidth, newHeight };
}
