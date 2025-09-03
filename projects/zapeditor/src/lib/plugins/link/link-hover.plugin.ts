import { Plugin } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';

/**
 * This plugin creates a hovercard that appears when the user cursor is over a link.
 * It allows the user to edit the link and open it in a new tab or remove the link.
 */
export function linkHoverPlugin() {
  let hovercard: HTMLElement | null = null;
  let currentLink: HTMLAnchorElement | null = null;
  let isEditMode = false;

  function createHoverCard() {
    if (hovercard) return hovercard;
    
    const el = document.createElement('div');
    el.className = 'prosemirror__link__card';
    
    const contentContainer = document.createElement('div');
    contentContainer.className = 'prosemirror__link__card__content';
    el.appendChild(contentContainer);
    
    (el as any).contentContainer = contentContainer;
    
    return el;
  }

  function showEditMode() {
    if (!hovercard) return;
    
    const contentContainer = (hovercard as any).contentContainer;
    if (contentContainer) {
      contentContainer.innerHTML = '';
      
      const editForm = createEditForm();
      contentContainer.appendChild(editForm);
      
      hovercard.classList.add('prosemirror__link__card__edit');
      isEditMode = true;
    }
  }

  function showNormalMode() {
    if (!hovercard) return;
    
    const contentContainer = (hovercard as any).contentContainer;
    if (contentContainer) {
      contentContainer.innerHTML = '';
      
      const normalContent = createNormalContent();
      contentContainer.appendChild(normalContent);
      
      hovercard.classList.remove('prosemirror__link__card__edit');
      isEditMode = false;
    }
  }

  function createNormalContent() {
    const editBtn = document.createElement('button');
    editBtn.innerHTML = 'Edit link';
    editBtn.title = 'Edit link';
    editBtn.className = 'prosemirror__link__card__edit__button';
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      showEditMode();
    });

    const separator = document.createElement('div');
    separator.className = 'prosemirror__link__card__separator';

    const actionsGroup = document.createElement('div');
    actionsGroup.className = 'prosemirror__link__card__actions';

    const unlinkBtn = document.createElement('button');
    unlinkBtn.innerHTML = '<i class="fa-regular fa-link-slash"></i>';
    unlinkBtn.title = 'Remove link';
    unlinkBtn.className = 'prosemirror__link__card__unlink';
    unlinkBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (currentLink) {
        const view = getCurrentView();
        if (view) {
          const pos = view.posAtDOM(currentLink, 0);
          if (pos !== null) {
            const linkMark = view.state.schema.marks['link'];
            if (linkMark) {
              let from = pos;
              let to = pos;
              let foundRange = false;
              
              view.state.doc.descendants((node, pos) => {
                if (foundRange) return false;
                
                node.marks.forEach(mark => {
                  if (mark.type === linkMark && !foundRange) {
                    const start = pos;
                    const end = pos + node.nodeSize;
                    
                    if (pos <= from && from < end) {
                      from = start;
                      to = end;
                      foundRange = true;
                    }
                  }
                });
                
                return true;
              });
              
              if (to > from) {
                const tr = view.state.tr.removeMark(from, to, linkMark);
                view.dispatch(tr);
              }
            }
          }
        }
      }
      hideHoverCard();
    });

    const iconSeparator = document.createElement('div');
    iconSeparator.className = 'prosemirror__link__card__icon__separator';

    const newTabBtn = document.createElement('button');
    newTabBtn.innerHTML = '<i class="fa-regular fa-external-link-alt"></i>';
    newTabBtn.title = 'Open in new tab';
    newTabBtn.className = 'prosemirror__link__card__newtab';
    newTabBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (currentLink) {
        const href = currentLink.getAttribute('href');
        if (href) {
          window.open(href, '_blank', 'noopener,noreferrer');
        }
      }
      hideHoverCard();
    });

    const fragment = document.createDocumentFragment();
    fragment.appendChild(editBtn);
    fragment.appendChild(separator);
    actionsGroup.appendChild(unlinkBtn);
    actionsGroup.appendChild(iconSeparator);
    actionsGroup.appendChild(newTabBtn);
    fragment.appendChild(actionsGroup);

    return fragment;
  }

  function createEditForm() {
    const el = document.createElement('div');
    el.className = 'prosemirror__link__card__edit__form';
    
    const urlGroup = document.createElement('div');
    urlGroup.className = 'prosemirror__link__card__input__group';
    
    const urlLabel = document.createElement('label');
    urlLabel.className = 'prosemirror__link__card__input__label';
    urlLabel.textContent = 'Type or paste a link';
    
    const hrefInput = document.createElement('input');
    hrefInput.type = 'text';
    hrefInput.placeholder = 'https://';
    hrefInput.className = 'prosemirror__link__card__input';
    hrefInput.value = currentLink?.getAttribute('href') || '';
    
    urlGroup.appendChild(urlLabel);
    urlGroup.appendChild(hrefInput);
    
    const textGroup = document.createElement('div');
    textGroup.className = 'prosemirror__link__card__input__group';
    
    const textLabel = document.createElement('label');
    textLabel.className = 'prosemirror__link__card__input__label';
    textLabel.textContent = 'Display text (optional)';
    
    const textInput = document.createElement('input');
    textInput.type = 'text';
    textInput.placeholder = 'Link text';
    textInput.className = 'prosemirror__link__card__input';
    textInput.value = currentLink?.textContent || '';
    
    textGroup.appendChild(textLabel);
    textGroup.appendChild(textInput);
    
    const buttonGroup = document.createElement('div');
    buttonGroup.className = 'prosemirror__link__card__button__group';
    
    const updateBtn = document.createElement('button');
    updateBtn.innerHTML = 'Update';
    updateBtn.className = 'prosemirror__link__card__update';
    updateBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      updateLink(hrefInput.value, textInput.value);
    });
    
    const cancelBtn = document.createElement('button');
    cancelBtn.innerHTML = 'Cancel';
    cancelBtn.className = 'prosemirror__link__card__cancel';
    cancelBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      showNormalMode();
    });
    
    buttonGroup.appendChild(updateBtn);
    buttonGroup.appendChild(cancelBtn);
    
    el.appendChild(urlGroup);
    el.appendChild(textGroup);
    el.appendChild(buttonGroup);
    
    return el;
  }

  function updateLink(href: string, text: string) {
    if (!currentLink || !href) return;
    
    const view = getCurrentView();
    if (view) {
      const pos = view.posAtDOM(currentLink, 0);
      if (pos !== null) {
        const linkMark = view.state.schema.marks['link'];
        if (linkMark) {
          let from = pos;
          let to = pos;
          let foundRange = false;
          
          view.state.doc.descendants((node, pos) => {
            if (foundRange) return false;
            
            node.marks.forEach(mark => {
              if (mark.type === linkMark && !foundRange) {
                const start = pos;
                const end = pos + node.nodeSize;
                
                if (pos <= from && from < end) {
                  from = start;
                  to = end;
                  foundRange = true;
                }
              }
            });
            
            return true;
          });
          
          if (to > from) {
            let tr = view.state.tr;
            
            tr = tr.removeMark(from, to, linkMark);
            tr = tr.addMark(from, to, linkMark.create({ href }));
            
            if (text && text !== currentLink.textContent) {
              tr = tr.replaceWith(from, to, view.state.schema.text(text, [linkMark.create({ href })]));
            }
            
            view.dispatch(tr);
          }
        }
      }
    }
    
    hideHoverCard();
  }

  function showHoverCard(view: EditorView, href: string, pos: number) {
    if (!hovercard) {
      hovercard = createHoverCard();
    }
    
    const contentContainer = (hovercard as any).contentContainer;
    if (contentContainer) {
      contentContainer.innerHTML = '';
      
      const normalContent = createNormalContent();
      contentContainer.appendChild(normalContent);
      
      hovercard.classList.remove('prosemirror__link__card__edit');
      isEditMode = false;
    }
    
    const linkElement = findLinkElement(view, pos);
    if (linkElement) {
      const rect = linkElement.getBoundingClientRect();
      
      hovercard.style.position = 'absolute';
      hovercard.style.left = `${rect.left}px`;
      hovercard.style.top = `${rect.bottom + 5}px`;
      hovercard.style.display = 'flex';
      hovercard.style.zIndex = '99';
    } else {
      const rect = view.coordsAtPos(pos);
      hovercard.style.position = 'absolute';
      hovercard.style.left = `${rect.left}px`;
      hovercard.style.top = `${rect.bottom + 5}px`;
      hovercard.style.display = 'flex';
      hovercard.style.zIndex = '99';
    }
    
    if (!hovercard.parentNode) {
      document.body.appendChild(hovercard);
    }
    
    setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 0);
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

  function findLinkEndPosition(view: EditorView, startPos: number): number {
    const { doc } = view.state;
    const linkMark = view.state.schema.marks['link'];
    if (!linkMark) return startPos;
    
    let endPos = startPos;
    
      doc.descendants((node, pos) => {
      if (pos < startPos) return true;
      
      node.marks.forEach(mark => {
        if (mark.type === linkMark) {
          let currentPos = pos;
          while (currentPos < doc.content.size) {
            const currentNode = doc.nodeAt(currentPos);
            if (!currentNode) break;
            
            const hasLinkMark = currentNode.marks.some(m => m.type === linkMark);
            if (!hasLinkMark) break;
            
            currentPos += currentNode.nodeSize;
          }
          
          if (currentPos > endPos) {
            endPos = currentPos;
          }
        }
      });
      
      return true;
    });
    
    return endPos;
  }

  function handleClickOutside(event: MouseEvent) {
    if (!hovercard) return;
    
    const target = event.target as HTMLElement;
    
    if (hovercard.contains(target)) {
      return;
    }
    
    let isOnLink = false;
    let currentElement: HTMLElement | null = target;
    
    while (currentElement && currentElement !== document.body) {
      if (currentElement.tagName === 'A') {
        isOnLink = true;
        break;
      }
      currentElement = currentElement.parentElement;
    }
    
    if (!isOnLink) {
      hideHoverCard();
    }
  }

  function hideHoverCard() {
    if (hovercard && hovercard.parentNode) {
      hovercard.parentNode.removeChild(hovercard);
    }
    
    document.removeEventListener('click', handleClickOutside);
    
    hovercard = null;
  }

  function checkCursorInLink(view: EditorView) {
    const { from } = view.state.selection;
    const marks = view.state.doc.nodeAt(from)?.marks || [];
    const linkMark = marks.find(mark => mark.type.name === 'link');
    
    if (linkMark) {
      const href = linkMark.attrs['href'];
      if (href) {
        const linkStart = view.state.doc.resolve(from).start();
        showHoverCard(view, href, linkStart);
        return true;
      }
    }
    
    hideHoverCard();
    return false;
  }

  function getCurrentView(): EditorView | null {
    return (window as any).currentEditorView || null;
  }

  return new Plugin({
    view: (editorView) => {
      (window as any).currentEditorView = editorView;
      
      return {
        update: (view: EditorView, prevState) => {
          checkCursorInLink(view);
        },
        destroy: () => {
          hideHoverCard();
          (window as any).currentEditorView = null;
        }
      };
    },
    props: {
      handleDOMEvents: {
        click(view: EditorView, event: MouseEvent) {
          const target = event.target as HTMLElement;
          
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
                showHoverCard(view, href, pos);
                currentLink = linkElement;
              }
            }
          }
          
          return false;
        },
      },
    },
    appendTransaction: (transactions, oldState, newState) => {
      if (transactions.some(tr => tr.docChanged || tr.selectionSet)) {
        return null;
      }
      
      return null;
    },
  });
}