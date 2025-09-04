import { Plugin, PluginKey, TextSelection } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';

import { SlashPluginState, SlashCommand } from '../../interfaces';

export const slashPluginKey = new PluginKey<SlashPluginState>('slash');

// Define all available slash commands - simplified to essential elements only
const slashCommands: SlashCommand[] = [
  // Headings
  {
    id: 'heading1',
    title: 'Heading 1',
    description: 'Large section heading',
    icon: '<i class="fa-regular fa-h1"></i>',
    category: 'headings',
    action: 'heading1',
    keywords: ['h1', 'heading', 'title', 'large'],
    shortcut: '⌘⌥1'
  },
  {
    id: 'heading2',
    title: 'Heading 2',
    description: 'Medium section heading',
    icon: '<i class="fa-regular fa-h2"></i>',
    category: 'headings',
    action: 'heading2',
    keywords: ['h2', 'heading', 'subtitle', 'medium'],
    shortcut: '⌘⌥2'
  },
  {
    id: 'heading3',
    title: 'Heading 3',
    description: 'Small section heading',
    icon: '<i class="fa-regular fa-h3"></i>',
    category: 'headings',
    action: 'heading3',
    keywords: ['h3', 'heading', 'small'],
    shortcut: '⌘⌥3'
  },

  // Lists
  {
    id: 'bullet-list',
    title: 'Bullet List',
    description: 'Create a simple bullet list',
    icon: '<i class="fa-regular fa-list-ul"></i>',
    category: 'lists',
    action: 'bullet-list',
    keywords: ['bullet', 'list', 'ul', 'unordered']
  },
  {
    id: 'numbered-list',
    title: 'Numbered List',
    description: 'Create a list with numbering',
    icon: '<i class="fa-regular fa-list-ol"></i>',
    category: 'lists',
    action: 'numbered-list',
    keywords: ['numbered', 'list', 'ol', 'ordered']
  },
  {
    id: 'todo-list',
    title: 'Todo List',
    description: 'Track tasks with a to-do list',
    icon: '<i class="fa-regular fa-list-check"></i>',
    category: 'lists',
    action: 'todo-list',
    keywords: ['todo', 'task', 'checkbox', 'checklist']
  },

  // Media
  {
    id: 'media',
    title: 'Media',
    description: 'Insert media content',
    icon: '<svg width="12" height="12" viewBox="0 0 46 46" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M37.2798 0.319824H8.71982C4.08982 0.319824 0.319824 4.07982 0.319824 8.71982V37.2798C0.319824 41.9098 4.08982 45.6798 8.71982 45.6798H37.2798C41.9098 45.6798 45.6798 41.9098 45.6798 37.2798V8.71982C45.6798 4.08982 41.9198 0.319824 37.2798 0.319824ZM43.1598 37.2798C43.1598 40.5198 40.5198 43.1598 37.2798 43.1598H8.71982C5.47982 43.1598 2.83982 40.5198 2.83982 37.2798V35.7498L14.2498 25.3498C14.4498 25.1698 14.7498 25.1698 14.9598 25.3498L22.2598 32.0498C22.8698 32.6098 23.6598 32.9098 24.4898 32.8498C25.3098 32.7998 26.0698 32.4298 26.6098 31.7998L34.7898 22.3298C34.9198 22.1898 35.0798 22.1498 35.1698 22.1498C35.2498 22.1498 35.4098 22.1498 35.5598 22.2898L43.1798 29.5298L43.1598 37.2798ZM43.1598 26.1898L37.3198 20.4998C36.7198 19.9098 35.8898 19.5998 35.0698 19.6398C34.2298 19.6698 33.4398 20.0598 32.8998 20.6898L24.7198 30.1598C24.5898 30.2998 24.4298 30.3398 24.3498 30.3398C24.2698 30.3398 24.1098 30.3398 23.9598 30.1998L16.6598 23.4998C15.4898 22.4298 13.7198 22.4298 12.5498 23.4998L2.83982 32.3498V8.71982C2.83982 5.47982 5.47982 2.83982 8.71982 2.83982H37.2798C40.5198 2.83982 43.1598 5.47982 43.1598 8.71982V26.1898Z"/></svg>',
    category: 'media',
    action: 'media',
    keywords: ['media', 'image', 'video', 'file', 'upload']
  },

  // Blocks
  {
    id: 'code-block',
    title: 'Code Block',
    description: 'Display code with syntax highlighting',
    icon: '<i class="fa-regular fa-code"></i>',
    category: 'blocks',
    action: 'code-block',
    keywords: ['code', 'syntax', 'programming', 'highlight']
  },
  {
    id: 'quote',
    title: 'Quote',
    description: 'Capture a quote',
    icon: '<i class="fa-regular fa-quote-left"></i>',
    category: 'blocks',
    action: 'quote',
    keywords: ['quote', 'citation', 'blockquote']
  },
  {
    id: 'divider',
    title: 'Divider',
    description: 'Visually divide blocks',
    icon: '<i class="fa-regular fa-minus"></i>',
    category: 'blocks',
    action: 'divider',
    keywords: ['divider', 'line', 'separator', 'hr']
  }
];

function getSlashRegex() {
  return /(^|\s)\/(\w*)$/;
}

function getSlashMatch($position: any) {
  try {
    // Check if position is valid and has a parent
    if (!$position || !$position.parent || $position.depth === 0) {
      return null;
    }
    
    const parastart = $position.before();
    const text = $position.doc.textBetween(parastart, $position.pos, '\n', '\0');
    const regex = getSlashRegex();
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
    // If there's any error getting the slash match, return null
    return null;
  }
}

function getSuggestions(query: string): SlashCommand[] {
  if (!query) return slashCommands;

  const lowercaseQuery = query.toLowerCase();
  
  return slashCommands
    .filter((command) => {
      const titleMatch = command.title.toLowerCase().includes(lowercaseQuery);
      const descriptionMatch = command.description.toLowerCase().includes(lowercaseQuery);
      const keywordMatch = command.keywords?.some(keyword => 
        keyword.toLowerCase().includes(lowercaseQuery)
      );
      
      return titleMatch || descriptionMatch || keywordMatch;
    })
    .slice(0, 10);
}

function triggerFileUpload(view: EditorView) {
  // Create a hidden file input element
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.rtf,.zip,.rar,.7z,.tar,.gz,.js,.ts,.css,.html,.json,.xml';
  input.style.display = 'none';
  
  // Add to DOM temporarily
  document.body.appendChild(input);
  
  // Trigger file selection
  input.click();
  
  // Handle file selection
  input.addEventListener('change', (event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      // Dispatch a custom event that the editor can listen to
      const customEvent = new CustomEvent('slashMediaUpload', {
        detail: { file, view }
      });
      document.dispatchEvent(customEvent);
    }
    
    // Clean up
    document.body.removeChild(input);
  });
  
  // Clean up if cancelled
  input.addEventListener('cancel', () => {
    document.body.removeChild(input);
  });
}

function insertSlashCommand(view: EditorView, command: SlashCommand, range: { from: number; to: number }) {
  try {
    const { state, dispatch } = view;
    const { schema } = state;

    // Check if current line is empty (only contains the slash command)
    const $from = state.selection.$from;
    const currentLineStart = $from.start();
    const currentLineEnd = $from.end();
    const currentLineText = state.doc.textBetween(currentLineStart, currentLineEnd, '\n', '\0');
    const isCurrentLineEmpty = currentLineText.trim() === '/' || currentLineText.trim() === '';

    let tr = state.tr;

    if (isCurrentLineEmpty) {
      // Replace the entire current line with the new block
      tr = tr.delete(currentLineStart - 1, currentLineEnd + 1);
      const insertPos = currentLineStart - 1;
      
      // Insert the appropriate content based on the command
      switch (command.action) {
        case 'heading1':
          const h1Node = schema.nodes['heading'].create({ level: 1 });
          tr = tr.insert(insertPos, h1Node);
          tr = tr.setSelection(TextSelection.create(tr.doc, insertPos + h1Node.nodeSize - 1));
          break;
        case 'heading2':
          const h2Node = schema.nodes['heading'].create({ level: 2 });
          tr = tr.insert(insertPos, h2Node);
          tr = tr.setSelection(TextSelection.create(tr.doc, insertPos + h2Node.nodeSize - 1));
          break;
        case 'heading3':
          const h3Node = schema.nodes['heading'].create({ level: 3 });
          tr = tr.insert(insertPos, h3Node);
          tr = tr.setSelection(TextSelection.create(tr.doc, insertPos + h3Node.nodeSize - 1));
          break;
        case 'paragraph':
          const pNode = schema.nodes['paragraph'].create();
          tr = tr.insert(insertPos, pNode);
          tr = tr.setSelection(TextSelection.create(tr.doc, insertPos + pNode.nodeSize - 1));
          break;
        case 'bullet-list':
          const bulletList = schema.nodes['bullet_list'];
          const bulletItem = schema.nodes['list_item'];
          const bulletP = schema.nodes['paragraph'];
          const bulletListItem = bulletItem.create({}, bulletP.create());
          const bulletListContent = bulletList.create({}, bulletListItem);
          tr = tr.insert(insertPos, bulletListContent);
          tr = tr.setSelection(TextSelection.create(tr.doc, insertPos + 2));
          break;
        case 'numbered-list':
          const orderedList = schema.nodes['ordered_list'];
          const orderedItem = schema.nodes['list_item'];
          const orderedP = schema.nodes['paragraph'];
          const orderedListItem = orderedItem.create({}, orderedP.create());
          const orderedListContent = orderedList.create({}, orderedListItem);
          tr = tr.insert(insertPos, orderedListContent);
          tr = tr.setSelection(TextSelection.create(tr.doc, insertPos + 2));
          break;
        case 'todo-list':
          const todoList = schema.nodes['todo_list'];
          const todoItem = schema.nodes['todo_list_item'];
          const todoP = schema.nodes['paragraph'];
          const todoListItem = todoItem.create({ checked: false }, todoP.create());
          const todoListContent = todoList.create({}, todoListItem);
          tr = tr.insert(insertPos, todoListContent);
          tr = tr.setSelection(TextSelection.create(tr.doc, insertPos + 2));
          break;
        case 'code-block':
          const codeNode = schema.nodes['code_block'].create({ language: 'ts', wrapped: false });
          tr = tr.insert(insertPos, codeNode);
          tr = tr.setSelection(TextSelection.create(tr.doc, insertPos + codeNode.nodeSize - 1));
          break;
        case 'divider':
          const dividerNode = schema.nodes['horizontal_rule'].create();
          const newP = schema.nodes['paragraph'].create();
          tr = tr.insert(insertPos, [dividerNode, newP]);
          tr = tr.setSelection(TextSelection.create(tr.doc, insertPos + dividerNode.nodeSize + 1));
          break;
        case 'quote':
          const paragraph = schema.nodes['paragraph'];
          const paragraphNode = paragraph.create();
          const quoteNode = schema.nodes['blockquote'].create({}, paragraphNode);
          tr = tr.insert(insertPos, quoteNode);
          tr = tr.setSelection(TextSelection.create(tr.doc, insertPos + 1));
          break;
        case 'media':
          // First trigger file upload, then clean up text after a short delay
          triggerFileUpload(view);
          // Clean up the slash text after file picker opens
          setTimeout(() => {
            try {
              const { state } = view;
              const { $from } = state.selection;
              const currentLineStart = $from.start();
              const currentLineEnd = $from.end();
              const currentLineText = state.doc.textBetween(currentLineStart, currentLineEnd, '\n', '\0');
              
              if (currentLineText.includes('/')) {
                const tr = state.tr.delete(currentLineStart - 1, currentLineEnd + 1);
                tr.setMeta(slashPluginKey, { active: false });
                view.dispatch(tr);
                view.focus();
              }
            } catch (error) {
              console.log('Slash text cleanup skipped:', error);
            }
          }, 100);
          return;
        default:
          const defaultNode = schema.nodes['paragraph'].create();
          tr = tr.insert(insertPos, defaultNode);
          tr = tr.setSelection(TextSelection.create(tr.doc, insertPos + defaultNode.nodeSize - 1));
      }
    } else {
      // Current line has text, so add new line and insert block
      tr = tr.delete(range.from, range.to);
      tr = tr.insertText('\n', range.from);
      
      const insertPos = range.from + 1;
      
      // Insert the appropriate content based on the command
      switch (command.action) {
        case 'heading1':
          const h1Node = schema.nodes['heading'].create({ level: 1 });
          tr = tr.insert(insertPos, h1Node);
          tr = tr.setSelection(TextSelection.create(tr.doc, insertPos + h1Node.nodeSize - 1));
          break;
        case 'heading2':
          const h2Node = schema.nodes['heading'].create({ level: 2 });
          tr = tr.insert(insertPos, h2Node);
          tr = tr.setSelection(TextSelection.create(tr.doc, insertPos + h2Node.nodeSize - 1));
          break;
        case 'heading3':
          const h3Node = schema.nodes['heading'].create({ level: 3 });
          tr = tr.insert(insertPos, h3Node);
          tr = tr.setSelection(TextSelection.create(tr.doc, insertPos + h3Node.nodeSize - 1));
          break;
        case 'paragraph':
          const pNode = schema.nodes['paragraph'].create();
          tr = tr.insert(insertPos, pNode);
          tr = tr.setSelection(TextSelection.create(tr.doc, insertPos + pNode.nodeSize - 1));
          break;
        case 'bullet-list':
          const bulletList = schema.nodes['bullet_list'];
          const bulletItem = schema.nodes['list_item'];
          const bulletP = schema.nodes['paragraph'];
          const bulletListItem = bulletItem.create({}, bulletP.create());
          const bulletListContent = bulletList.create({}, bulletListItem);
          tr = tr.insert(insertPos, bulletListContent);
          tr = tr.setSelection(TextSelection.create(tr.doc, insertPos + 2));
          break;
        case 'numbered-list':
          const orderedList = schema.nodes['ordered_list'];
          const orderedItem = schema.nodes['list_item'];
          const orderedP = schema.nodes['paragraph'];
          const orderedListItem = orderedItem.create({}, orderedP.create());
          const orderedListContent = orderedList.create({}, orderedListItem);
          tr = tr.insert(insertPos, orderedListContent);
          tr = tr.setSelection(TextSelection.create(tr.doc, insertPos + 2));
          break;
        case 'todo-list':
          const todoList = schema.nodes['todo_list'];
          const todoItem = schema.nodes['todo_list_item'];
          const todoP = schema.nodes['paragraph'];
          const todoListItem = todoItem.create({ checked: false }, todoP.create());
          const todoListContent = todoList.create({}, todoListItem);
          tr = tr.insert(insertPos, todoListContent);
          tr = tr.setSelection(TextSelection.create(tr.doc, insertPos + 2));
          break;
        case 'code-block':
          const codeNode = schema.nodes['code_block'].create({ language: 'ts', wrapped: false });
          tr = tr.insert(insertPos, codeNode);
          tr = tr.setSelection(TextSelection.create(tr.doc, insertPos + codeNode.nodeSize - 1));
          break;
        case 'divider':
          const dividerNode = schema.nodes['horizontal_rule'].create();
          const newP = schema.nodes['paragraph'].create();
          tr = tr.insert(insertPos, [dividerNode, newP]);
          tr = tr.setSelection(TextSelection.create(tr.doc, insertPos + dividerNode.nodeSize + 1));
          break;
        case 'quote':
          const paragraph2 = schema.nodes['paragraph'];
          const paragraphNode2 = paragraph2.create();
          const quoteNode2 = schema.nodes['blockquote'].create({}, paragraphNode2);
          tr = tr.insert(insertPos, quoteNode2);
          tr = tr.setSelection(TextSelection.create(tr.doc, insertPos + 1));
          break;
        case 'media':
          // First trigger file upload, then clean up text after a short delay
          triggerFileUpload(view);
          // Clean up the slash text after file picker opens
          setTimeout(() => {
            try {
              const { state } = view;
              const { $from } = state.selection;
              const currentLineStart = $from.start();
              const currentLineEnd = $from.end();
              const currentLineText = state.doc.textBetween(currentLineStart, currentLineEnd, '\n', '\0');
              
              if (currentLineText.includes('/')) {
                const tr = state.tr.delete(currentLineStart - 1, currentLineEnd + 1);
                tr.setMeta(slashPluginKey, { active: false });
                view.dispatch(tr);
                view.focus();
              }
            } catch (error) {
              console.log('Slash text cleanup skipped:', error);
            }
          }, 100);
          return;
        default:
          const defaultNode = schema.nodes['paragraph'].create();
          tr = tr.insert(insertPos, defaultNode);
          tr = tr.setSelection(TextSelection.create(tr.doc, insertPos + defaultNode.nodeSize - 1));
      }
    }

    tr = tr.setMeta(slashPluginKey, { active: false });
    dispatch(tr);
    view.focus();
  } catch (error) {
    console.error('Error inserting slash command:', error);
  }
}

export function slashPlugin() {
  let suggestionElement: HTMLElement | null = null;
  let showTimeoutId: number | null = null;
  let hoverEnabled = true;
  let clickOutsideHandler: ((event: MouseEvent) => void) | null = null;

  function createSuggestionElement(): HTMLElement {
    if (suggestionElement) {
      document.body.removeChild(suggestionElement);
    }

    const el = document.createElement('div');
    el.className = 'slash__suggestions';

    document.body.appendChild(el);
    return el;
  }

  function showSuggestions(view: EditorView, state: SlashPluginState) {
    if (!suggestionElement) {
      suggestionElement = createSuggestionElement();
    }

    const { suggestions, index } = state;

    if (suggestions.length === 0) {
      suggestionElement.style.display = 'none';
      return;
    }

    // Group suggestions by category
    const groupedSuggestions = suggestions.reduce((acc, command) => {
      if (!acc[command.category]) {
        acc[command.category] = [];
      }
      acc[command.category].push(command);
      return acc;
    }, {} as Record<string, SlashCommand[]>);

    suggestionElement.innerHTML = Object.entries(groupedSuggestions)
      .map(([category, commands], categoryIndex) => {
        return commands.map((command, i) => {
          const globalIndex = suggestions.indexOf(command);
          const isFirstInCategory = i === 0;
          const isFirstCategory = categoryIndex === 0;
          const showSeparator = isFirstInCategory && !isFirstCategory;
          
          return `
            ${showSeparator ? '<div class="slash__separator"></div>' : ''}
            <div class="slash__suggestion ${globalIndex === index ? 'slash__suggestion__active' : ''}" 
                 data-index="${globalIndex}">
              <div class="slash__suggestion__icon">${command.icon}</div>
              <div class="slash__suggestion__content">
                <div class="slash__suggestion__title">${command.title}</div>
              </div>
              ${command.shortcut ? `<div class="slash__suggestion__shortcut">${command.shortcut}</div>` : ''}
            </div>
          `;
        }).join('');
      }).join('');

    const slashStartPos = state.range.from;
    const slashCoords = view.coordsAtPos(slashStartPos);

    suggestionElement.style.left = `${slashCoords.left}px`;
    suggestionElement.style.top = `${slashCoords.bottom + 5}px`;
    suggestionElement.style.display = 'block';

    // Add click outside handler
    if (clickOutsideHandler) {
      document.removeEventListener('click', clickOutsideHandler);
    }
    
    clickOutsideHandler = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const editorElement = view.dom;
      const suggestionsElement = suggestionElement;
      
      if (!editorElement.contains(target) && !suggestionsElement?.contains(target)) {
        view.dispatch(view.state.tr.setMeta(slashPluginKey, { active: false }));
        hideSuggestions();
      }
    };
    
    document.addEventListener('click', clickOutsideHandler);

    const handleMouseMove = () => {
      hoverEnabled = true;
      document.removeEventListener('mousemove', handleMouseMove);
    };
    document.addEventListener('mousemove', handleMouseMove);

    suggestionElement.querySelectorAll('.slash__suggestion').forEach((item, i) => {
      item.addEventListener('click', () => {
        const command = suggestions[i];
        insertSlashCommand(view, command, state.range);
        hideSuggestions();
        view.dispatch(view.state.tr.setMeta(slashPluginKey, { active: false }));
      });

      item.addEventListener('mouseenter', () => {
        if (!hoverEnabled) return;
        view.dispatch(view.state.tr.setMeta(slashPluginKey, { ...state, index: i }));
      });
    });
  }

  function hideSuggestions() {
    if (suggestionElement && suggestionElement.parentNode) {
      suggestionElement.parentNode.removeChild(suggestionElement);
      suggestionElement = null;
    }
    
    if (clickOutsideHandler) {
      document.removeEventListener('click', clickOutsideHandler);
      clickOutsideHandler = null;
    }
    
    hoverEnabled = true;
  }

  return new Plugin<SlashPluginState>({
    key: slashPluginKey,
    state: {
      init(): SlashPluginState {
        return {
          active: false,
          range: { from: 0, to: 0 },
          query: '',
          suggestions: [],
          index: 0,
        };
      },
      apply(tr, value: SlashPluginState): SlashPluginState {
        const slash = tr.getMeta(slashPluginKey);
        if (slash) {
          const newState = { ...value, ...slash };
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
        const match = getSlashMatch($from);

        if (match) {
          const suggestions = getSuggestions(match.query);
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
        const state = slashPluginKey.getState(view.state);
        if (!state?.active) return false;
        
        switch (event.key) {
          case 'ArrowDown':
            event.preventDefault();
            hoverEnabled = false;
            const newIndex = (state.index + 1) % state.suggestions.length;
            view.dispatch(view.state.tr.setMeta(slashPluginKey, { ...state, index: newIndex }));
            
            setTimeout(() => {
              const container = document.querySelector('.slash__suggestions') as HTMLElement;
              const activeItem = container?.querySelector('.slash__suggestion__active') as HTMLElement;
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
            view.dispatch(view.state.tr.setMeta(slashPluginKey, { ...state, index: prevIndex }));
            
            setTimeout(() => {
              const container = document.querySelector('.slash__suggestions') as HTMLElement;
              const activeItem = container?.querySelector('.slash__suggestion__active') as HTMLElement;
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
              const selectedCommand = state.suggestions[state.index];
              insertSlashCommand(view, selectedCommand, state.range);
            }
            return true;

          case 'Escape':
            event.preventDefault();
            view.dispatch(view.state.tr.setMeta(slashPluginKey, { active: false }));
            return true;
        }

        return false;
      },
    },
    view() {
      let lastState: SlashPluginState | null = null;

      return {
        update(view: EditorView) {
          const state = slashPluginKey.getState(view.state);

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
          
          if (clickOutsideHandler) {
            document.removeEventListener('click', clickOutsideHandler);
            clickOutsideHandler = null;
          }
        },
      };
    },
  });
}
