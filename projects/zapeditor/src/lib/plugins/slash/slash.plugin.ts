import { Plugin, PluginKey, TextSelection } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';

import { SlashPluginState, SlashCommand } from '../../interfaces';

export const slashPluginKey = new PluginKey<SlashPluginState>('slash');

// Define all available slash commands
const slashCommands: SlashCommand[] = [
  // Text formatting
  {
    id: 'heading1',
    title: 'Heading 1',
    description: 'Large section heading',
    icon: 'H1',
    category: 'text',
    action: 'heading1',
    keywords: ['h1', 'heading', 'title', 'large']
  },
  {
    id: 'heading2',
    title: 'Heading 2',
    description: 'Medium section heading',
    icon: 'H2',
    category: 'text',
    action: 'heading2',
    keywords: ['h2', 'heading', 'subtitle', 'medium']
  },
  {
    id: 'heading3',
    title: 'Heading 3',
    description: 'Small section heading',
    icon: 'H3',
    category: 'text',
    action: 'heading3',
    keywords: ['h3', 'heading', 'small']
  },
  {
    id: 'paragraph',
    title: 'Paragraph',
    description: 'Just start writing with plain text',
    icon: 'P',
    category: 'text',
    action: 'paragraph',
    keywords: ['text', 'normal', 'paragraph']
  },
  {
    id: 'bullet-list',
    title: 'Bullet List',
    description: 'Create a simple bullet list',
    icon: '•',
    category: 'text',
    action: 'bullet-list',
    keywords: ['bullet', 'list', 'ul', 'unordered']
  },
  {
    id: 'numbered-list',
    title: 'Numbered List',
    description: 'Create a list with numbering',
    icon: '1.',
    category: 'text',
    action: 'numbered-list',
    keywords: ['numbered', 'list', 'ol', 'ordered']
  },
  {
    id: 'todo-list',
    title: 'Todo List',
    description: 'Track tasks with a to-do list',
    icon: '☐',
    category: 'text',
    action: 'todo-list',
    keywords: ['todo', 'task', 'checkbox', 'checklist']
  },
  {
    id: 'code-block',
    title: 'Code Block',
    description: 'Display code with syntax highlighting',
    icon: '</>',
    category: 'text',
    action: 'code-block',
    keywords: ['code', 'syntax', 'programming', 'highlight']
  },
  {
    id: 'quote',
    title: 'Quote',
    description: 'Capture a quote',
    icon: '"',
    category: 'text',
    action: 'quote',
    keywords: ['quote', 'citation', 'blockquote']
  },
  {
    id: 'divider',
    title: 'Divider',
    description: 'Visually divide blocks',
    icon: '—',
    category: 'layout',
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
      .map(([category, commands]) => {
        const categoryTitle = category.charAt(0).toUpperCase() + category.slice(1);
        return `
          <div class="slash__category">
            <div class="slash__category__title">${categoryTitle}</div>
            ${commands.map((command, i) => {
              const globalIndex = suggestions.indexOf(command);
              return `
                <div class="slash__suggestion ${globalIndex === index ? 'slash__suggestion__active' : ''}" 
                     data-index="${globalIndex}">
                  <div class="slash__suggestion__icon">${command.icon}</div>
                  <div class="slash__suggestion__content">
                    <div class="slash__suggestion__title">${command.title}</div>
                    <div class="slash__suggestion__description">${command.description}</div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `;
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
