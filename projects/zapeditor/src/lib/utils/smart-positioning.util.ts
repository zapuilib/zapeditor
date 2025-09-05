export function calculateSmartPosition(
  triggerRect: DOMRect,
  dropdownElement: HTMLElement,
  preferredDirection: 'top' | 'bottom' = 'bottom',
  offset: number = 5
): { x: number; y: number; direction: 'top' | 'bottom' | 'left' | 'right' } {
  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight
  };

  const dropdownRect = dropdownElement.getBoundingClientRect();
  const dropdownWidth = dropdownRect.width;
  const dropdownHeight = dropdownRect.height;

  const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
  const scrollY = window.pageYOffset || document.documentElement.scrollTop;


  let x = triggerRect.left + scrollX;
  let y = triggerRect.bottom + scrollY + offset;
  let direction: 'top' | 'bottom' | 'left' | 'right' = preferredDirection;


  if (preferredDirection === 'bottom' && (y - scrollY) + dropdownHeight > viewport.height) {
    y = triggerRect.top + scrollY - dropdownHeight - offset;
    direction = 'top';
  }

  if (preferredDirection === 'top' && (y - scrollY) - dropdownHeight < 0) {
    y = triggerRect.bottom + scrollY + offset;
    direction = 'bottom';
  }

  if ((direction === 'top' && (y - scrollY) < 0) || (direction === 'bottom' && (y - scrollY) + dropdownHeight > viewport.height)) {
    x = triggerRect.right + scrollX + offset;
    y = triggerRect.top + scrollY;
    direction = 'right';

    if ((x - scrollX) + dropdownWidth > viewport.width) {
      x = triggerRect.left + scrollX - dropdownWidth - offset;
      direction = 'left';
    }
  }

  const viewportX = x - scrollX;
  const viewportY = y - scrollY;
  
  if (viewportX < 0) x = scrollX + 5;
  if (viewportX + dropdownWidth > viewport.width) x = scrollX + viewport.width - dropdownWidth - 5;
  if (viewportY < 0) y = scrollY + 5;
  if (viewportY + dropdownHeight > viewport.height) y = scrollY + viewport.height - dropdownHeight - 5;


  return { x, y, direction };
}
