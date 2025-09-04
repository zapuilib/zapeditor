/**
 * Smart positioning utility for dropdowns and suggestions
 * Calculates optimal position to fit within viewport
 * Accounts for scroll position to position relative to document
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

  // Get scroll offsets
  const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
  const scrollY = window.pageYOffset || document.documentElement.scrollTop;

  console.log('🔧 Smart positioning inputs:', {
    triggerRect,
    dropdownWidth,
    dropdownHeight,
    scrollX,
    scrollY,
    viewport
  });

  // Convert viewport coordinates to document coordinates
  let x = triggerRect.left + scrollX;
  let y = triggerRect.bottom + scrollY + offset;
  let direction: 'top' | 'bottom' | 'left' | 'right' = preferredDirection;

  console.log('📍 Initial position:', { x, y, direction });

  // Check if dropdown fits below trigger (using viewport coordinates for comparison)
  if (preferredDirection === 'bottom' && (y - scrollY) + dropdownHeight > viewport.height) {
    // Try above trigger
    y = triggerRect.top + scrollY - dropdownHeight - offset;
    direction = 'top';
  }

  // Check if dropdown fits above trigger
  if (preferredDirection === 'top' && (y - scrollY) - dropdownHeight < 0) {
    // Try below trigger
    y = triggerRect.bottom + scrollY + offset;
    direction = 'bottom';
  }

  // If still doesn't fit vertically, try horizontal positioning
  if ((direction === 'top' && (y - scrollY) < 0) || (direction === 'bottom' && (y - scrollY) + dropdownHeight > viewport.height)) {
    // Try right side
    x = triggerRect.right + scrollX + offset;
    y = triggerRect.top + scrollY;
    direction = 'right';

    // If doesn't fit on right, try left side
    if ((x - scrollX) + dropdownWidth > viewport.width) {
      x = triggerRect.left + scrollX - dropdownWidth - offset;
      direction = 'left';
    }
  }

  // Ensure dropdown stays within viewport bounds (convert back to viewport coordinates for bounds checking)
  const viewportX = x - scrollX;
  const viewportY = y - scrollY;
  
  if (viewportX < 0) x = scrollX + 5;
  if (viewportX + dropdownWidth > viewport.width) x = scrollX + viewport.width - dropdownWidth - 5;
  if (viewportY < 0) y = scrollY + 5;
  if (viewportY + dropdownHeight > viewport.height) y = scrollY + viewport.height - dropdownHeight - 5;

  console.log('✅ Final smart position:', { x, y, direction, viewportX, viewportY });

  return { x, y, direction };
}
