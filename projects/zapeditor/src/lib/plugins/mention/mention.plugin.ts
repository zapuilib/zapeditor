import { Plugin, PluginKey, TextSelection } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';

import { MentionPluginState, MentionUser } from '../../interfaces';

export const mentionPluginKey = new PluginKey<MentionPluginState>('mention');

export interface MentionPluginOptions {
  users: MentionUser[];
  onMentionSearch?: (query: string) => void;
  onUsersUpdate?: (users: MentionUser[]) => void;
}

function getMentionRegex() {
  return /(^|\s)@(\w*)$/;
}

function getMentionMatch($position: any) {
  try {
    // Check if position is valid and has a parent
    if (!$position || !$position.parent || $position.depth === 0) {
      return null;
    }
    
    const parastart = $position.before();
    const text = $position.doc.textBetween(parastart, $position.pos, '\n', '\0');
    const regex = getMentionRegex();
    const match = text.match(regex);

    if (match) {
      const matchIndex = match[0].startsWith(' ') ? match.index! + 1 : match.index!;
      const matchText = match[0].startsWith(' ') ? match[0].substring(1) : match[0];
      const from = $position.start() + matchIndex;
      const to = from + matchText.length;
      const query = match[2];

      return {
        range: { from, to },
        query,
      };
    }

    return null;
  } catch (error) {
    // If there's any error getting the mention match, return null
    return null;
  }
}

function getSuggestions(query: string, users: MentionUser[]): MentionUser[] {
  if (!query) return users;

  return users
    .filter(
      (user) =>
        user.name.toLowerCase().includes(query.toLowerCase()) ||
        user.email?.toLowerCase().includes(query.toLowerCase()),
    )
    .slice(0, 10);
}

function insertMention(view: EditorView, user: MentionUser, range: { from: number; to: number }) {
  try {
    const { state, dispatch } = view;
    const { schema } = state;
    const mentionNode = schema.nodes['mention'];

    if (!mentionNode) {
      return;
    }

    const node = mentionNode.create({
      id: user.id,
      name: user.name,
      avatar: user.avatar,
      email: user.email,
    });

    let tr = state.tr.replaceWith(range.from, range.to, node);

    const afterMentionPos = range.from + node.nodeSize;
    tr = tr.insertText(' ', afterMentionPos);

    const finalCursorPos = afterMentionPos + 1;
    if (finalCursorPos <= tr.doc.content.size) {
      tr = tr.setSelection(TextSelection.create(tr.doc, finalCursorPos));
    }

    tr = tr.setMeta(mentionPluginKey, { active: false });
    dispatch(tr);
    view.focus();
  } catch (error) {
  }
}

export function mentionPlugin(options: MentionPluginOptions) {
  let suggestionElement: HTMLElement | null = null;
  let showTimeoutId: number | null = null;
  let hoverEnabled = true;
  let clickOutsideHandler: ((event: MouseEvent) => void) | null = null;
  let currentUsers = options.users;
  let searchCallback = options.onMentionSearch;

  function createSuggestionElement(): HTMLElement {
    if (suggestionElement) {
      document.body.removeChild(suggestionElement);
    }

    const el = document.createElement('div');
    el.className = 'mention__suggestions';

    document.body.appendChild(el);
    return el;
  }

  function showSuggestions(view: EditorView, state: MentionPluginState) {
    if (!suggestionElement) {
      suggestionElement = createSuggestionElement();
    }

    const { suggestions, index } = state;

    if (suggestions.length === 0) {
      suggestionElement.style.display = 'none';
      return;
    }

    suggestionElement.innerHTML = suggestions
      .map(
        (user, i) => `
        <div class="mention__suggestion ${i === index ? 'mention__suggestion__active' : ''}" 
             data-index="${i}">
          <div class="mention__suggestion__avatar">
            <img src="${user.avatar || '/assets/avatars/default.png'}" alt="${user.name}" />
          </div>
          <div class="mention__suggestion__info">
            <div class="mention__suggestion__name">${user.name}</div>
          </div>
        </div>
      `,
      )
      .join('');

    const mentionStartPos = state.range.from;
    const mentionEndPos = state.range.to;

    const mentionCoords = view.coordsAtPos(mentionStartPos);

    suggestionElement.style.left = `${mentionCoords.left}px`;
    suggestionElement.style.top = `${mentionCoords.bottom + 5}px`;
    suggestionElement.style.display = 'block';

    // Add click outside handler
    if (clickOutsideHandler) {
      document.removeEventListener('click', clickOutsideHandler);
    }
    
    clickOutsideHandler = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const editorElement = view.dom;
      const suggestionsElement = suggestionElement;
      
      // Check if click is outside both editor and suggestions
      if (!editorElement.contains(target) && !suggestionsElement?.contains(target)) {
        view.dispatch(view.state.tr.setMeta(mentionPluginKey, { active: false }));
        hideSuggestions();
      }
    };
    
    document.addEventListener('click', clickOutsideHandler);

    const handleMouseMove = () => {
      hoverEnabled = true;
      document.removeEventListener('mousemove', handleMouseMove);
    };
    document.addEventListener('mousemove', handleMouseMove);

    suggestionElement.querySelectorAll('.mention__suggestion').forEach((item, i) => {
      item.addEventListener('click', () => {
        const user = suggestions[i];
        insertMention(view, user, state.range);
        hideSuggestions();
        view.dispatch(view.state.tr.setMeta(mentionPluginKey, { active: false }));
      });

      item.addEventListener('mouseenter', () => {
        if (!hoverEnabled) return;
        view.dispatch(view.state.tr.setMeta(mentionPluginKey, { ...state, index: i }));
      });
    });
  }

  function hideSuggestions() {
    if (suggestionElement && suggestionElement.parentNode) {
      suggestionElement.parentNode.removeChild(suggestionElement);
      suggestionElement = null;
    }
    
    // Clean up click outside handler
    if (clickOutsideHandler) {
      document.removeEventListener('click', clickOutsideHandler);
      clickOutsideHandler = null;
    }
    
    hoverEnabled = true;
  }

  // Store reference to update function
  const updateUsers = (newUsers: MentionUser[]) => {
    currentUsers = newUsers;
  };

  // Expose update function through options
  if (options.onUsersUpdate) {
    options.onUsersUpdate = updateUsers;
  }

  const plugin = new Plugin<MentionPluginState>({
    key: mentionPluginKey,
    state: {
      init(): MentionPluginState {
        return {
          active: false,
          range: { from: 0, to: 0 },
          query: '',
          suggestions: [],
          index: 0,
        };
      },
      apply(tr, value: MentionPluginState): MentionPluginState {
        const mention = tr.getMeta(mentionPluginKey);
        if (mention) {
          const newState = { ...value, ...mention };
          if (JSON.stringify(newState) !== JSON.stringify(value)) {
            return newState;
          }
          return value;
        }

        const { selection } = tr;
        if (!selection || !selection.$from) {
          if (value.active) {
            return { ...value, active: false };
          }
          return value;
        }

        const { $from } = selection;
        const match = getMentionMatch($from);

        if (match) {
          // Emit search event if callback is provided
          if (searchCallback) {
            searchCallback(match.query);
          }
          
          // Use current users (which may have been updated)
          const suggestions = getSuggestions(match.query, currentUsers);
          const newState = {
            active: true,
            range: match.range,
            query: match.query,
            suggestions,
            index: 0,
          };

          if (JSON.stringify(newState) !== JSON.stringify(value)) {
            return newState;
          }
          return value;
        } else if (value.active) {
          return { ...value, active: false };
        }

        return value;
      },
    },
    props: {
      handleKeyDown(view: EditorView, event: KeyboardEvent): boolean {
        const state = mentionPluginKey.getState(view.state);
        if (!state?.active) return false;
        switch (event.key) {
          case 'ArrowDown':
            event.preventDefault();
            hoverEnabled = false; // Disable hover completely
            const newIndex = (state.index + 1) % state.suggestions.length;
            view.dispatch(view.state.tr.setMeta(mentionPluginKey, { ...state, index: newIndex }));
            
            setTimeout(() => {
              const container = document.querySelector('.mention__suggestions') as HTMLElement;
              const activeItem = container?.querySelector('.mention__suggestion__active') as HTMLElement;
              if (container && activeItem) {
                const containerHeight = container.clientHeight;
                const containerScrollTop = container.scrollTop;
                const itemOffsetTop = activeItem.offsetTop;
                const itemHeight = activeItem.clientHeight;
                const itemBottom = itemOffsetTop + itemHeight + itemHeight;
                
                if (newIndex === 0) {
                  container.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                  });
                }
                else if (itemBottom > containerScrollTop + containerHeight) {
                  container.scrollTo({
                    top: itemBottom - containerHeight,
                    behavior: 'smooth'
                  });
                }
                else if (itemOffsetTop < containerScrollTop) {
                  container.scrollTo({
                    top: itemOffsetTop,
                    behavior: 'smooth'
                  });
                }
              }
            }, 0);
            return true;

          case 'ArrowUp':
            event.preventDefault();
            hoverEnabled = false; 
            const prevIndex = state.index === 0 ? state.suggestions.length - 1 : state.index - 1;
            view.dispatch(view.state.tr.setMeta(mentionPluginKey, { ...state, index: prevIndex }));
            
            setTimeout(() => {
              const container = document.querySelector('.mention__suggestions') as HTMLElement;
              const activeItem = container?.querySelector('.mention__suggestion__active') as HTMLElement;
              if (container && activeItem) {
                const itemOffsetTop = activeItem.offsetTop;
                const itemHeight = activeItem.clientHeight;
                
                if (prevIndex === state.suggestions.length - 1) {
                  container.scrollTo({
                    top: container.scrollHeight,
                    behavior: 'smooth'
                  });
                }
                else {
                  container.scrollTo({
                    top: itemOffsetTop - itemHeight,
                    behavior: 'smooth'
                  });
                }
              }
            }, 0);
            return true;

          case 'Enter':
          case 'Tab':
            event.preventDefault();
            if (state.suggestions.length > 0) {
              const selectedUser = state.suggestions[state.index];
              insertMention(view, selectedUser, state.range);
            }
            return true;

          case 'Escape':
            event.preventDefault();
            view.dispatch(view.state.tr.setMeta(mentionPluginKey, { active: false }));
            return true;
        }

        return false;
      },
    },
    view() {
      let lastState: MentionPluginState | null = null;

      return {
        update(view: EditorView) {
          const state = mentionPluginKey.getState(view.state);

          if (JSON.stringify(state) !== JSON.stringify(lastState)) {
            if (showTimeoutId) {
              clearTimeout(showTimeoutId);
            }

            if (state?.active) {
              showTimeoutId = window.setTimeout(() => {
                showSuggestions(view, state);
              }, 100);
            } else {
              hideSuggestions();
            }
            lastState = state || null;
          }
        },
        destroy() {
          if (showTimeoutId) {
            clearTimeout(showTimeoutId);
          }
          hideSuggestions();
          
          // Clean up click outside handler
          if (clickOutsideHandler) {
            document.removeEventListener('click', clickOutsideHandler);
            clickOutsideHandler = null;
          }
        },
      };
    },
  });

  // Add updateUsers method to the plugin
  (plugin as any).updateUsers = updateUsers;
  
  return plugin;
}

export function triggerMention(view: EditorView) {
  const { state } = view;
  const { selection } = state;
  const { $from } = selection;

  const tr = state.tr.insertText('@', $from.pos);
  view.dispatch(tr);
  view.focus();
}
