import { Plugin } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { calculateSmartPosition } from '../../utils/smart-positioning.util';

/**
 * Link hover plugin - shows hovercard when hovering over links
 */
export function linkHoverPlugin() {
  let hovercard: HTMLElement | null = null;
  let currentLink: HTMLAnchorElement | null = null;
  let isEditMode = false;
  let isPositioning = false; // Prevent multiple positioning calculations

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
    
    // Edit button
    const editBtn = document.createElement('button');
    editBtn.textContent = 'Edit link';
    editBtn.className = 'prosemirror__link__card__edit__button';
    editBtn.onclick = (e) => {
      e.stopPropagation();
      showEditMode();
    };

    // Separator
    const separator = document.createElement('div');
    separator.className = 'prosemirror__link__card__separator';

    // Actions container
    const actions = document.createElement('div');
    actions.className = 'prosemirror__link__card__actions';

    // Unlink button
    const unlinkBtn = document.createElement('button');
    unlinkBtn.innerHTML = '<i class="fa-regular fa-link-slash"></i>';
    unlinkBtn.title = 'Remove link';
    unlinkBtn.className = 'prosemirror__link__card__unlink';
    unlinkBtn.onclick = (e) => {
      e.stopPropagation();
      removeLink();
    };
    
    // Icon separator
    const iconSep = document.createElement('div');
    iconSep.className = 'prosemirror__link__card__icon__separator';
    
    // New tab button
    const newTabBtn = document.createElement('button');
    newTabBtn.innerHTML = '<i class="fa-regular fa-external-link-alt"></i>';
    newTabBtn.title = 'Open in new tab';
    newTabBtn.className = 'prosemirror__link__card__newtab';
    newTabBtn.onclick = (e) => {
      e.stopPropagation();
      openInNewTab();
    };
    
    actions.appendChild(unlinkBtn);
    actions.appendChild(iconSep);
    actions.appendChild(newTabBtn);
    
    fragment.appendChild(editBtn);
    fragment.appendChild(separator);
    fragment.appendChild(actions);

    return fragment;
  }

  function createEditContent(): DocumentFragment {
    const fragment = document.createDocumentFragment();
    
    const form = document.createElement('div');
    form.className = 'prosemirror__link__card__edit__form';
    
    // URL input
    const urlGroup = document.createElement('div');
    urlGroup.className = 'prosemirror__link__card__input__group';
    
    const urlLabel = document.createElement('label');
    urlLabel.textContent = 'Type or paste a link';
    urlLabel.className = 'prosemirror__link__card__input__label';
    
    const urlInput = document.createElement('input');
    urlInput.type = 'text';
    urlInput.placeholder = 'https://';
    urlInput.className = 'prosemirror__link__card__input';
    urlInput.value = currentLink?.getAttribute('href') || '';
    
    urlGroup.appendChild(urlLabel);
    urlGroup.appendChild(urlInput);
    
    // Text input
    const textGroup = document.createElement('div');
    textGroup.className = 'prosemirror__link__card__input__group';
    
    const textLabel = document.createElement('label');
    textLabel.textContent = 'Display text (optional)';
    textLabel.className = 'prosemirror__link__card__input__label';
    
    const textInput = document.createElement('input');
    textInput.type = 'text';
    textInput.placeholder = 'Link text';
    textInput.className = 'prosemirror__link__card__input';
    textInput.value = currentLink?.textContent || '';
    
    textGroup.appendChild(textLabel);
    textGroup.appendChild(textInput);
    
    // Buttons
    const buttonGroup = document.createElement('div');
    buttonGroup.className = 'prosemirror__link__card__button__group';
    
    const updateBtn = document.createElement('button');
    updateBtn.textContent = 'Update';
    updateBtn.className = 'prosemirror__link__card__update';
    updateBtn.onclick = (e) => {
      e.stopPropagation();
      updateLink(urlInput.value, textInput.value);
    };
    
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.className = 'prosemirror__link__card__cancel';
    cancelBtn.onclick = (e) => {
      e.stopPropagation();
      showNormalMode();
    };
    
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
    
    hovercard.classList.remove('prosemirror__link__card__edit');
    isEditMode = false;
  }

  function showEditMode(): void {
    if (!hovercard) return;
    
    const content = (hovercard as any).content;
    content.innerHTML = '';
    content.appendChild(createEditContent());
    
    hovercard.classList.add('prosemirror__link__card__edit');
    isEditMode = true;
  }

  function removeLink(): void {
    if (!currentLink) return;
    
    const view = getCurrentView();
    if (!view) return;
    
    const pos = view.posAtDOM(currentLink, 0);
    if (pos === null) return;
    
    const linkMark = view.state.schema.marks['link'];
    if (!linkMark) return;
    
    // Find the range of the link
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
    
    if (to > from) {
      const tr = view.state.tr.removeMark(from, to, linkMark);
      view.dispatch(tr);
    }
    
    hideHoverCard();
  }

  function updateLink(href: string, text: string): void {
    if (!currentLink || !href) return;
    
    const view = getCurrentView();
    if (!view) return;
    
      const pos = view.posAtDOM(currentLink, 0);
    if (pos === null) return;
    
        const linkMark = view.state.schema.marks['link'];
    if (!linkMark) return;
    
    // Find the range of the link
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
          
          if (to > from) {
            let tr = view.state.tr;
            
      // Remove old link mark
            tr = tr.removeMark(from, to, linkMark);
      
      // Add new link mark
            tr = tr.addMark(from, to, linkMark.create({ href }));
            
      // Update text if provided
            if (text && text !== currentLink.textContent) {
              tr = tr.replaceWith(from, to, view.state.schema.text(text, [linkMark.create({ href })]));
            }
            
            view.dispatch(tr);
          }
    
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

  function findLinkElement(view: EditorView, pos: number): HTMLAnchorElement | null {
    const domNode = view.nodeDOM(pos);
    if (!domNode) return null;
    
    let currentElement: HTMLElement | null = domNode as HTMLElement;
    
    while (currentElement && currentElement !== view.dom) {
      if (currentElement.tagName === 'A') {
        return currentElement as HTMLAnchorElement;
      }
      currentElement = currentElement.parentElement;
    }
    
    return null;
  }

  function showHoverCard(view: EditorView, pos: number): void {
    console.log('🚀 showHoverCard called with pos:', pos, 'isPositioning:', isPositioning);
    
    if (isPositioning) {
      console.log('⏸️ Already positioning, skipping...');
      return;
    }
    
    if (!hovercard) {
      hovercard = createHoverCard();
      document.body.appendChild(hovercard);
    }
    
    isPositioning = true;
    
    // Show normal mode first to get proper dimensions
    showNormalMode();
    
    // Position the hovercard off-screen initially to get dimensions
    hovercard.style.left = '-9999px';
    hovercard.style.top = '-9999px';
    hovercard.style.display = 'flex';
    
    // Wait for the hovercard to be rendered and get its dimensions
    requestAnimationFrame(() => {
      if (!hovercard) {
        isPositioning = false;
        return;
      }
      
      // Use double requestAnimationFrame to ensure stable coordinates
      requestAnimationFrame(() => {
        if (!hovercard) {
          isPositioning = false;
          return;
        }
        
        // Use ProseMirror coordinates directly - this gives us the exact cursor position
        const coords = view.coordsAtPos(pos);
        console.log('🔍 ProseMirror coords:', coords);
        
        // Check if coordinates look stable (not at the left edge of line)
        // If left is too small (like 57), wait for stable coordinates
        if (coords.left < 100) {
          console.log('⏳ Coordinates not stable yet, waiting...');
          // Wait another frame for stable coordinates
          requestAnimationFrame(() => {
            if (!hovercard) {
              isPositioning = false;
              return;
            }
            
            const stableCoords = view.coordsAtPos(pos);
            console.log('🔍 Stable ProseMirror coords:', stableCoords);
            
            if (stableCoords.left < 100) {
              console.log('⚠️ Still not stable, using current coordinates');
            }
            
            positionHoverCard(stableCoords);
          });
        } else {
          console.log('✅ Coordinates look stable, positioning now');
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
        top: coords.top,
        right: coords.right,
        bottom: coords.bottom,
        width: coords.right - coords.left,
        height: coords.bottom - coords.top
      } as DOMRect;
      
      console.log('📐 Trigger rect:', triggerRect);
      
      // Use smart positioning utility
      const position = calculateSmartPosition(triggerRect, hovercard, 'bottom', 8);
      console.log('🎯 Calculated position:', position);
      
      // Position the hovercard
      hovercard.style.left = `${position.x}px`;
      hovercard.style.top = `${position.y}px`;
      
      console.log('📍 Final hovercard position:', {
        left: hovercard.style.left,
        top: hovercard.style.top
      });
      
      // Trigger slide-in animation
      requestAnimationFrame(() => {
        if (hovercard) {
          hovercard.style.opacity = '1';
          hovercard.style.transform = 'translateY(0)';
        }
        isPositioning = false;
      });
    }
    
    // Add click outside listener
    setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 0);
  }

  function hideHoverCard(): void {
    console.log('🛑 hideHoverCard called');
    isPositioning = false;
    
    if (hovercard) {
      // Trigger slide-out animation
      hovercard.style.opacity = '0';
      hovercard.style.transform = 'translateY(-10px)';
      
      // Hide after animation completes
      setTimeout(() => {
        if (hovercard) {
          hovercard.style.display = 'none';
        }
      }, 200); // Match the transition duration
    }
    document.removeEventListener('click', handleClickOutside);
    currentLink = null;
  }

  function handleClickOutside(event: MouseEvent): void {
    if (!hovercard) return;
    
    const target = event.target as HTMLElement;
    
    // Don't hide if clicking inside the hovercard
    if (hovercard.contains(target)) return;
    
    // Don't hide if clicking on a link
    let currentElement: HTMLElement | null = target;
    while (currentElement && currentElement !== document.body) {
      if (currentElement.tagName === 'A') {
        return;
      }
      currentElement = currentElement.parentElement;
    }
    
    hideHoverCard();
  }

  function getCurrentView(): EditorView | null {
    return (window as any).currentEditorView || null;
  }

  return new Plugin({
    view: (editorView) => {
      (window as any).currentEditorView = editorView;
      
      return {
        update: (view: EditorView) => {
          const { from } = view.state.selection;
          const marks = view.state.doc.nodeAt(from)?.marks || [];
          const linkMark = marks.find(mark => mark.type.name === 'link');
          
          if (linkMark) {
            const href = linkMark.attrs['href'];
            if (href) {
              const linkStart = view.state.doc.resolve(from).start();
              showHoverCard(view, linkStart);
              return;
            }
          }
          
          hideHoverCard();
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
          
          // Find the clicked link
          let linkElement: HTMLAnchorElement | null = null;
          let currentElement: HTMLElement | null = target;
          
          while (currentElement && currentElement !== view.dom) {
            if (currentElement.tagName === 'A') {
              linkElement = currentElement as HTMLAnchorElement;
              break;
            }
            currentElement = currentElement.parentElement;
          }
          
          if (linkElement) {
            const href = linkElement.getAttribute('href');
            if (href) {
              const pos = view.posAtDOM(linkElement, 0);
              if (pos !== null) {
                currentLink = linkElement;
                showHoverCard(view, pos);
              }
            }
          }
          
          return false;
        }
      }
    }
  });
}