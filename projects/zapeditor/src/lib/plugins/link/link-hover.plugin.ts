import { Plugin } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { calculateSmartPosition } from '../../utils/smart-positioning.util';

export function linkHoverPlugin() {
  let hovercard: HTMLElement | null = null;
  let currentLink: HTMLAnchorElement | null = null;
  let isEditMode = false;
  let isPositioning = false;

  function createHoverCard(): HTMLElement {
    const card = document.createElement('div');
    card.className = 'prosemirror__link__card';
    card.style.position = 'absolute';
    card.style.zIndex = '9999';
    card.style.display = 'none';
    card.style.opacity = '0';
    card.style.transform = 'translateY(-10px)';
    card.style.transition = 'opacity 0.2s ease-out, transform 0.2s ease-out';
    
    const content = document.createElement('div');
    content.className = 'prosemirror__link__card__content';
    card.appendChild(content);
    
    (card as any).content = content;
    return card;
  }

  function createNormalContent(): DocumentFragment {
    const fragment = document.createDocumentFragment();
    
    const editBtn = document.createElement('button');
    editBtn.textContent = 'Edit link';
    editBtn.className = 'prosemirror__link__card__edit__button';
    editBtn.onclick = (e) => {
      e.stopPropagation();
      showEditMode();
    };

    const separator = document.createElement('div');
    separator.className = 'prosemirror__link__card__separator';

    const actions = document.createElement('div');
    actions.className = 'prosemirror__link__card__actions';

    const copyBtn = document.createElement('button');
    copyBtn.textContent = 'Copy link';
    copyBtn.className = 'prosemirror__link__card__copy__button';
    copyBtn.onclick = (e) => {
      e.stopPropagation();
      copyLink();
    };

    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Remove link';
    removeBtn.className = 'prosemirror__link__card__remove__button';
    removeBtn.onclick = (e) => {
      e.stopPropagation();
      removeLink();
    };

    actions.appendChild(copyBtn);
    actions.appendChild(removeBtn);

    fragment.appendChild(editBtn);
    fragment.appendChild(separator);
    fragment.appendChild(actions);

    return fragment;
  }

  function createEditContent(): DocumentFragment {
    const fragment = document.createDocumentFragment();
    
    const input = document.createElement('input');
    input.type = 'url';
    input.placeholder = 'Enter URL';
    input.className = 'prosemirror__link__card__input';
    input.value = currentLink?.href || '';
    input.onkeydown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveLink();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        showNormalMode();
      }
    };

    const buttons = document.createElement('div');
    buttons.className = 'prosemirror__link__card__edit__buttons';

    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save';
    saveBtn.className = 'prosemirror__link__card__save__button';
    saveBtn.onclick = (e) => {
      e.stopPropagation();
      saveLink();
    };

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.className = 'prosemirror__link__card__cancel__button';
    cancelBtn.onclick = (e) => {
      e.stopPropagation();
      showNormalMode();
    };

    buttons.appendChild(saveBtn);
    buttons.appendChild(cancelBtn);

    fragment.appendChild(input);
    fragment.appendChild(buttons);

    return fragment;
  }

  function showNormalMode() {
    if (!hovercard || !currentLink) return;
    
    isEditMode = false;
    const content = (hovercard as any).content;
    content.innerHTML = '';
    content.appendChild(createNormalContent());
    
    hovercard.style.opacity = '1';
    hovercard.style.transform = 'translateY(0)';
  }

  function showEditMode() {
    if (!hovercard || !currentLink) return;
    
    isEditMode = true;
    const content = (hovercard as any).content;
    content.innerHTML = '';
    content.appendChild(createEditContent());
    
    const input = content.querySelector('input') as HTMLInputElement;
    if (input) {
      input.focus();
      input.select();
    }
  }

  function copyLink() {
    if (!currentLink) return;
    
    navigator.clipboard.writeText(currentLink.href).then(() => {
      hideHoverCard();
    }).catch(() => {
    });
  }

  function removeLink() {
    if (!currentLink) return;
    
    const view = (currentLink as any).__prosemirrorView as EditorView;
    if (!view) return;

    const { state, dispatch } = view;
    const { from, to } = state.selection;
    const { link } = state.schema.marks;

    const tr = state.tr.removeMark(from, to, link);
    dispatch(tr);
    hideHoverCard();
  }

  function saveLink() {
    if (!hovercard || !currentLink) return;
    
    const input = hovercard.querySelector('input') as HTMLInputElement;
    if (!input) return;

    const newUrl = input.value.trim();
    if (!newUrl) return;

    const view = (currentLink as any).__prosemirrorView as EditorView;
    if (!view) return;

    const { state, dispatch } = view;
    const { from, to } = state.selection;
    const { link } = state.schema.marks;

    const tr = state.tr.addMark(from, to, link.create({ href: newUrl }));
    dispatch(tr);
    hideHoverCard();
  }

  function showHoverCard(view: EditorView, pos: number): void {
    if (isPositioning) {
      return;
    }
    
    if (!hovercard) {
      hovercard = createHoverCard();
      document.body.appendChild(hovercard);
    }

    const content = (hovercard as any).content;
    content.innerHTML = '';
    content.appendChild(createNormalContent());

    hovercard.style.display = 'block';
    hovercard.style.opacity = '0';
    hovercard.style.transform = 'translateY(-10px)';

    isPositioning = true;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!hovercard) {
          isPositioning = false;
          return;
        }

        const coords = view.coordsAtPos(pos);
        if (!coords) {
          isPositioning = false;
          return;
        }
        
        if (coords.left < 100) {
          requestAnimationFrame(() => {
            if (!hovercard) {
              isPositioning = false;
              return;
            }
            
            const stableCoords = view.coordsAtPos(pos);
            
            if (stableCoords.left < 100) {
            }
            
            positionHoverCard(stableCoords);
          });
        } else {
          positionHoverCard(coords);
        }
      });
    });
    
    function positionHoverCard(coords: any) {
      if (!hovercard) {
        isPositioning = false;
        return;
      }

      const triggerRect = {
        left: coords.left,
        right: coords.right,
        top: coords.top,
        bottom: coords.bottom,
        width: coords.right - coords.left,
        height: coords.bottom - coords.top
      } as DOMRect;
      
      const position = calculateSmartPosition(triggerRect, hovercard, 'bottom', 8);
      
      hovercard.style.left = `${position.x}px`;
      hovercard.style.top = `${position.y}px`;
      
      requestAnimationFrame(() => {
        if (hovercard) {
          hovercard.style.opacity = '1';
          hovercard.style.transform = 'translateY(0)';
        }
        isPositioning = false;
      });
    }
  }

  function hideHoverCard(): void {
    isPositioning = false;
    
    if (hovercard) {
      hovercard.style.opacity = '0';
      hovercard.style.transform = 'translateY(-10px)';
      
      setTimeout(() => {
        if (hovercard) {
          hovercard.style.display = 'none';
        }
      }, 200);
    }
  }

  function handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    
    if (!hovercard?.contains(target) && !target.closest('a[href]')) {
      hideHoverCard();
      currentLink = null;
    }
  }

  return new Plugin({
    props: {
      handleDOMEvents: {
        mouseover: (view, event) => {
          const target = event.target as HTMLElement;
          const link = target.closest('a[href]') as HTMLAnchorElement;
          
          if (link && link.href && !link.href.startsWith('#')) {
            currentLink = link;
            (link as any).__prosemirrorView = view;
            showHoverCard(view, view.posAtDOM(link, 0));
          }
          return false;
        },
        mouseout: (view, event) => {
          const target = event.target as HTMLElement;
          const link = target.closest('a[href]') as HTMLAnchorElement;
          
          if (link && currentLink === link) {
            const relatedTarget = event.relatedTarget as HTMLElement;
            if (!relatedTarget || !hovercard?.contains(relatedTarget)) {
              hideHoverCard();
              currentLink = null;
            }
          }
          return false;
        },
        click: (view, event) => {
          const target = event.target as HTMLElement;
          const link = target.closest('a[href]') as HTMLAnchorElement;
          
          if (link && link.href && !link.href.startsWith('#')) {
            if (isEditMode) {
              event.preventDefault();
              return true;
            }
          }
          return false;
        }
      }
    }
  });
}