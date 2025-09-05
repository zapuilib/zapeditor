import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';
import { Node as ProsemirrorNode } from 'prosemirror-model';
import { splitListItem, liftListItem } from 'prosemirror-schema-list';

export interface TodoListPluginState {
  decorations: DecorationSet;
}

export const todoListPluginKey = new PluginKey<TodoListPluginState>('todoList');

export function createTodoListPlugin(): Plugin<TodoListPluginState> {
  return new Plugin<TodoListPluginState>({
    key: todoListPluginKey,
    
    state: {
      init(): TodoListPluginState {
        return { decorations: DecorationSet.empty };
      },
      
      apply(tr, pluginState): TodoListPluginState {
        return {
          decorations: pluginState.decorations.map(tr.mapping, tr.doc)
        };
      }
    },
    
    props: {
      decorations(state) {
        return this.getState(state)?.decorations || DecorationSet.empty;
      },
      
      handleDOMEvents: {
        click(view, event) {
          const target = event.target as HTMLElement;
          
          if (target.classList.contains('todo__checkbox') && target.closest('.todo__list__item')) {
            event.preventDefault();
            event.stopPropagation();
            
            const pos = view.posAtDOM(target, 0);
            if (pos === null) return false;
            
            const $pos = view.state.doc.resolve(pos);
            
            let depth = $pos.depth;
            while (depth > 0) {
              const node = $pos.node(depth);
              if (node.type.name === 'todo_list_item') {
                const tr = view.state.tr;
                const listItemPos = $pos.before(depth);
                const currentChecked = node.attrs['checked'];
                
                tr.setNodeMarkup(listItemPos, null, {
                  ...node.attrs,
                  checked: !currentChecked
                });
                
                view.dispatch(tr);
                return true;
              }
              depth--;
            }
          }
          
          return false;
        }
      }
    }
  });
}
