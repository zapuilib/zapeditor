/**
 * Smart positioning utility for dropdowns and suggestions
 * Calculates optimal position to fit within viewport
 */
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

  let x = triggerRect.left;
  let y = triggerRect.bottom + offset;
  let direction: 'top' | 'bottom' | 'left' | 'right' = preferredDirection;

  // Check if dropdown fits below trigger
  if (preferredDirection === 'bottom' && y + dropdownHeight > viewport.height) {
    // Try above trigger
    y = triggerRect.top - dropdownHeight - offset;
    direction = 'top';
  }

  // Check if dropdown fits above trigger
  if (preferredDirection === 'top' && y - dropdownHeight < 0) {
    // Try below trigger
    y = triggerRect.bottom + offset;
    direction = 'bottom';
  }

  // If still doesn't fit vertically, try horizontal positioning
  if ((direction === 'top' && y < 0) || (direction === 'bottom' && y + dropdownHeight > viewport.height)) {
    // Try right side
    x = triggerRect.right + offset;
    y = triggerRect.top;
    direction = 'right';

    // If doesn't fit on right, try left side
    if (x + dropdownWidth > viewport.width) {
      x = triggerRect.left - dropdownWidth - offset;
      direction = 'left';
    }
  }

  // Ensure dropdown stays within viewport bounds
  if (x < 0) x = 5;
  if (x + dropdownWidth > viewport.width) x = viewport.width - dropdownWidth - 5;
  if (y < 0) y = 5;
  if (y + dropdownHeight > viewport.height) y = viewport.height - dropdownHeight - 5;

  return { x, y, direction };
}
