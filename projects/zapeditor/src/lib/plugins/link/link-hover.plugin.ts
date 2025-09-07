import { Plugin } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { calculateSmartPosition } from '../../utils/smart-positioning.util';

const ANIMATION_DURATION = 200;
const TOOLTIP_DELAY = 500;
const OFFSET_SCREEN_POSITION = -9999;

export function linkHoverPlugin() {
  let hovercard: HTMLElement | null = null;
  let currentLink: HTMLAnchorElement | null = null;
  let isEditMode = false;
  let isPositioning = false;
  let hideTimeout: number | null = null;
  let showTimeout: number | null = null;

  function createHoverCard(): HTMLElement {
    const card = document.createElement('div');
    card.className = 'ze__link__card';
    card.style.position = 'absolute';
    card.style.zIndex = '9999';
    card.style.display = 'none';
    card.style.opacity = '0';
    card.style.transform = 'translateY(-10px)';
    card.style.transition = 'opacity 0.2s ease-out, transform 0.2s ease-out';
    
    const content = document.createElement('div');
    content.className = 'ze__link__card__content';
    card.appendChild(content);
    
    (card as any).content = content;
    return card;
  }

  function createButton(text: string, className: string, onClick: (e: MouseEvent) => void): HTMLButtonElement {
    const button = document.createElement('button');
    button.textContent = text;
    button.className = className;
    button.onclick = (e) => {
      e.stopPropagation();
      onClick(e);
    };
    return button;
  }

  function createIconButton(icon: string, tooltip: string, className: string, onClick: (e: MouseEvent) => void): HTMLButtonElement {
    const button = document.createElement('button');
    button.innerHTML = `<i class="fa-regular ${icon}"></i>`;
    button.setAttribute('zapEditorTooltip', tooltip);
    button.className = className;
    button.onclick = (e) => {
      e.stopPropagation();
      onClick(e);
    };
    return button;
  }

  function createNormalContent(): DocumentFragment {
    const fragment = document.createDocumentFragment();
    
    const editBtn = createButton('Edit link', 'ze__link__card__edit__button', () => showEditMode());
    
    const separator = document.createElement('div');
    separator.className = 'ze__link__card__separator';

    const actions = document.createElement('div');
    actions.className = 'ze__link__card__actions';

    const unlinkBtn = createIconButton('fa-link-slash', 'Remove link', 'ze__link__card__unlink', () => removeLink());
    
    const iconSep = document.createElement('div');
    iconSep.className = 'ze__link__card__icon__separator';
    
    const newTabBtn = createIconButton('fa-external-link-alt', 'Open in new tab', 'ze__link__card__newtab', () => openInNewTab());
    
    actions.appendChild(unlinkBtn);
    actions.appendChild(iconSep);
    actions.appendChild(newTabBtn);
    
    fragment.appendChild(editBtn);
    fragment.appendChild(separator);
    fragment.appendChild(actions);

    return fragment;
  }

  function createInputGroup(labelText: string, placeholder: string, value: string, className: string): HTMLElement {
    const group = document.createElement('div');
    group.className = 'ze__link__card__input__group';
    
    const label = document.createElement('label');
    label.textContent = labelText;
    label.className = 'ze__link__card__input__label';
    
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = placeholder;
    input.className = 'ze__link__card__input';
    input.value = value;
    
    group.appendChild(label);
    group.appendChild(input);
    
    return group;
  }

  function createEditContent(): DocumentFragment {
    const fragment = document.createDocumentFragment();
    
    const form = document.createElement('div');
    form.className = 'ze__link__card__edit__form';
    
    const urlGroup = createInputGroup(
      'Type or paste a link',
      'https://',
      currentLink?.getAttribute('href') || '',
      'ze__link__card__input__group'
    );
    
    const textGroup = createInputGroup(
      'Display text (optional)',
      'Link text',
      currentLink?.textContent || '',
      'ze__link__card__input__group'
    );
    
    const buttonGroup = document.createElement('div');
    buttonGroup.className = 'ze__link__card__button__group';
    
    const urlInput = urlGroup.querySelector('input') as HTMLInputElement;
    const textInput = textGroup.querySelector('input') as HTMLInputElement;
    
    const updateBtn = createButton('Update', 'ze__link__card__update', () => updateLink(urlInput.value, textInput.value));
    const cancelBtn = createButton('Cancel', 'ze__link__card__cancel', () => showNormalMode());
    
    buttonGroup.appendChild(updateBtn);
    buttonGroup.appendChild(cancelBtn);
    
    form.appendChild(urlGroup);
    form.appendChild(textGroup);
    form.appendChild(buttonGroup);
    fragment.appendChild(form);
    
    return fragment;
  }

  function showNormalMode(): void {
    if (!hovercard) return;
    
    const content = (hovercard as any).content;
    content.innerHTML = '';
    content.appendChild(createNormalContent());
    
    hovercard.classList.remove('ze__link__card__edit');
    isEditMode = false;
    
    initializeTooltips(hovercard);
  }

  function showEditMode(): void {
    if (!hovercard) return;
    
    const content = (hovercard as any).content;
    content.innerHTML = '';
    content.appendChild(createEditContent());
    
    hovercard.classList.add('ze__link__card__edit');
    isEditMode = true;
  }

  function initializeTooltips(container: HTMLElement) {
    import('../../services/tooltip.service').then(({ TooltipService }) => {
      const tooltipService = new TooltipService();
      
      const elementsWithTooltips = container.querySelectorAll('[zapEditorTooltip]');
      
      elementsWithTooltips.forEach((element) => {
        const tooltipText = element.getAttribute('zapEditorTooltip');
        if (tooltipText) {
          const cleanupFn = tooltipService.createTooltip({
            text: tooltipText,
            delay: TOOLTIP_DELAY,
            element: element as HTMLElement
          });
          
          (element as any).__tooltipCleanup = cleanupFn;
        }
      });
    });
  }

  function findLinkRange(view: EditorView, pos: number): { from: number; to: number } | null {
    const linkMark = view.state.schema.marks['link'];
    if (!linkMark) return null;
    
    let from = pos;
    let to = pos;
    
    view.state.doc.descendants((node, nodePos) => {
      if (nodePos < pos) return true;
      
      node.marks.forEach(mark => {
        if (mark.type === linkMark) {
          const start = nodePos;
          const end = nodePos + node.nodeSize;
          
          if (pos >= start && pos < end) {
            from = start;
            to = end;
          }
        }
      });
      
      return true;
    });
    
    return to > from ? { from, to } : null;
  }

  function removeLink(): void {
    if (!currentLink) return;
    
    const view = getCurrentView();
    if (!view) return;
    
    const pos = view.posAtDOM(currentLink, 0);
    if (pos === null) return;
    
    const linkRange = findLinkRange(view, pos);
    if (!linkRange) return;
    
    const linkMark = view.state.schema.marks['link'];
    const tr = view.state.tr.removeMark(linkRange.from, linkRange.to, linkMark);
    view.dispatch(tr);
    
    hideHoverCard();
  }

  function updateLink(href: string, text: string): void {
    if (!currentLink || !href) return;
    
    const view = getCurrentView();
    if (!view) return;
    
    const pos = view.posAtDOM(currentLink, 0);
    if (pos === null) return;
    
    const linkRange = findLinkRange(view, pos);
    if (!linkRange) return;
    
    const linkMark = view.state.schema.marks['link'];
    let tr = view.state.tr;
    
    tr = tr.removeMark(linkRange.from, linkRange.to, linkMark);
    tr = tr.addMark(linkRange.from, linkRange.to, linkMark.create({ href }));
    
    if (text && text !== currentLink.textContent) {
      tr = tr.replaceWith(linkRange.from, linkRange.to, view.state.schema.text(text, [linkMark.create({ href })]));
    }
    
    view.dispatch(tr);
    hideHoverCard();
  }

  function openInNewTab(): void {
    if (currentLink) {
      const href = currentLink.getAttribute('href');
      if (href) {
        window.open(href, '_blank', 'noopener,noreferrer');
      }
    }
    hideHoverCard();
  }

  function clearTimeouts(): void {
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }
    if (showTimeout) {
      clearTimeout(showTimeout);
      showTimeout = null;
    }
  }

  function hideHoverCard(): void {
    isPositioning = false;
    clearTimeouts();
    
    if (hovercard) {
      const elementsWithTooltips = hovercard.querySelectorAll('[zapEditorTooltip]');
      elementsWithTooltips.forEach((element) => {
        if ((element as any).__tooltipCleanup) {
          (element as any).__tooltipCleanup();
        }
      });

      hovercard.style.opacity = '0';
      hovercard.style.transform = 'translateY(-10px)';
      
      setTimeout(() => {
        if (hovercard) {
          hovercard.style.display = 'none';
        }
      }, ANIMATION_DURATION);
    }
    
    document.removeEventListener('click', handleClickOutside);
    currentLink = null;
  }

  function handleClickOutside(event: MouseEvent): void {
    if (!hovercard) return;
    
    const target = event.target as HTMLElement;
    
    if (hovercard.contains(target)) return;
    
    let currentElement: HTMLElement | null = target;
    while (currentElement && currentElement !== document.body) {
      if (currentElement.tagName === 'A') {
        return;
      }
      currentElement = currentElement.parentElement;
    }
    
    hideHoverCard();
  }

  function showHoverCardOnCursor(view: EditorView, pos: number): void {
    clearTimeouts();
    
    if (isPositioning) return;
    
    const linkElement = findLinkElement(view, pos);
    if (!linkElement) {
      hideHoverCard();
      return;
    }
    
    if (!hovercard) {
      hovercard = createHoverCard();
      document.body.appendChild(hovercard);
      
      hovercard.addEventListener('mouseenter', () => {
        clearTimeouts();
      });
      
      hovercard.addEventListener('mouseleave', () => {
        hideTimeout = window.setTimeout(() => {
          hideHoverCard();
        }, ANIMATION_DURATION);
      });
    }
    
    isPositioning = true;
    currentLink = linkElement;
    
    showNormalMode();
    
    hovercard.style.left = `${OFFSET_SCREEN_POSITION}px`;
    hovercard.style.top = `${OFFSET_SCREEN_POSITION}px`;
    hovercard.style.display = 'flex';
    
    requestAnimationFrame(() => {
      if (!hovercard) {
        isPositioning = false;
        return;
      }
      
      const coords = view.coordsAtPos(pos);
      const rect = linkElement.getBoundingClientRect();
      
      const triggerRect = {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height
      } as DOMRect;
      
      const position = calculateSmartPosition(triggerRect, hovercard, 'bottom', 8);
      
      hovercard.style.left = `${position.x}px`;
      hovercard.style.top = `${position.y}px`;
      hovercard.style.display = 'flex';
      hovercard.style.opacity = '1';
      hovercard.style.transform = 'translateY(0)';
      
      isPositioning = false;
    });
  }


  function getCurrentView(): EditorView | null {
    return (window as any).currentEditorView || null;
  }

  function findLinkElement(view: EditorView, pos: number): HTMLAnchorElement | null {
    try {
      const coords = view.coordsAtPos(pos);
      const elementAtPoint = document.elementFromPoint(coords.left, coords.top);
      
      if (!elementAtPoint) return null;
      
      let currentElement: HTMLElement | null = elementAtPoint as HTMLElement;
      
      while (currentElement && currentElement !== view.dom) {
        if (currentElement.tagName === 'A') {
          return currentElement as HTMLAnchorElement;
        }
        currentElement = currentElement.parentElement;
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  function findLinkInElement(element: HTMLElement, editorElement: HTMLElement): HTMLAnchorElement | null {
    let currentElement: HTMLElement | null = element;
    
    while (currentElement && currentElement !== editorElement) {
      if (currentElement.tagName === 'A') {
        return currentElement as HTMLAnchorElement;
      }
      currentElement = currentElement.parentElement;
    }
    
    return null;
  }

  return new Plugin({
    view: (editorView) => {
      (window as any).currentEditorView = editorView;
      
      return {
        update: (view: EditorView) => {
          if (view.state.selection.from !== view.state.selection.to) {
            hideHoverCard();
            return;
          }
          
          const pos = view.state.selection.from;
          const linkElement = findLinkElement(view, pos);
          
          if (linkElement) {
            showHoverCardOnCursor(view, pos);
          } else {
            hideHoverCard();
          }
        },
        destroy: () => {
          hideHoverCard();
          (window as any).currentEditorView = null;
        }
      };
    },
    props: {
      handleDOMEvents: {
        click: (view: EditorView, event: MouseEvent) => {
          const target = event.target as HTMLElement;
          const linkElement = findLinkInElement(target, view.dom);
          
          if (linkElement) {
            const href = linkElement.getAttribute('href');
            if (href) {
              currentLink = linkElement;
              const pos = view.state.selection.from;
              showHoverCardOnCursor(view, pos);
            }
          }
          
          return false;
        }
      }
    }
  });
}