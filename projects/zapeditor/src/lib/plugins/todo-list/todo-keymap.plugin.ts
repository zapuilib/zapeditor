import { keymap } from 'prosemirror-keymap';
import { splitListItem, liftListItem, sinkListItem, wrapInList } from 'prosemirror-schema-list';
import type { Schema } from 'prosemirror-model';

export function createTodoKeymapPlugin(schema: Schema, editorView: any) {
  return keymap({
    Enter: (state, dispatch, view) => {
      const { selection } = state;
      const { $from } = selection;
      
      let depth = $from.depth;
      let parentListType = null;
      
      while (depth > 0) {
        const node = $from.node(depth);
        if (node.type.name === 'todo_list_item') {
          let checkDepth = depth + 1;
          let isInNumberedList = false;
          
          while (checkDepth <= $from.depth) {
            const parentNode = $from.node(checkDepth);
            if (parentNode.type.name === 'ordered_list') {
              isInNumberedList = true;
              break;
            } else if (parentNode.type.name === 'bullet_list') {
              break;
            } else if (parentNode.type.name === 'todo_list') {
              checkDepth++;
              continue;
            }
            checkDepth++;
          }
          
          const isEffectivelyEmpty = node.content.size === 0 || 
            (node.content.size === 1 && node.firstChild?.isTextblock && node.firstChild.content.size === 0) ||
            (node.content.size <= 2 && node.firstChild?.isTextblock && node.firstChild.textContent?.trim() === '');
          
          if (isEffectivelyEmpty) {
            const liftCommand = liftListItem(schema.nodes['todo_list_item']);
            const lifted = liftCommand(state, dispatch, view);
            
            if (lifted && dispatch && isInNumberedList) {
              const { ordered_list } = schema.nodes;
              const wrapCommand = wrapInList(ordered_list);
              wrapCommand(editorView?.state!, dispatch, editorView!);
            }
            return true;
          } else {
            const splitCommand = splitListItem(schema.nodes['todo_list_item']);
            return splitCommand(state, dispatch, view);
          }
        } else if (node.type.name === 'list_item') {
          
          const isEffectivelyEmpty = node.content.size === 0 || 
            (node.content.size === 1 && node.firstChild?.isTextblock && node.firstChild.content.size === 0) ||
            (node.content.size <= 2 && node.firstChild?.isTextblock && node.firstChild.textContent?.trim() === '');
          
          if (isEffectivelyEmpty) {
            const liftCommand = liftListItem(schema.nodes['list_item']);
            return liftCommand(state, dispatch, view);
          } else {
            const splitCommand = splitListItem(schema.nodes['list_item']);
            return splitCommand(state, dispatch, view);
          }
        }
        depth--;
      }
      
      return false;
    },
    Tab: (state, dispatch, view) => {
      const { selection } = state;
      const { $from } = selection;
      
      let depth = $from.depth;
      while (depth > 0) {
        const node = $from.node(depth);
        if (node.type.name === 'todo_list_item') {
          const sinkCommand = sinkListItem(schema.nodes['todo_list_item']);
          return sinkCommand(state, dispatch, view);
        } else if (node.type.name === 'list_item') {
          const sinkCommand = sinkListItem(schema.nodes['list_item']);
          return sinkCommand(state, dispatch, view);
        }
        depth--;
      }
      
      return false;
    },
    'Shift-Tab': (state, dispatch, view) => {
      const { selection } = state;
      const { $from } = selection;
      
      let depth = $from.depth;
      while (depth > 0) {
        const node = $from.node(depth);
        if (node.type.name === 'todo_list_item') {
          const liftCommand = liftListItem(schema.nodes['todo_list_item']);
          return liftCommand(state, dispatch, view);
        } else if (node.type.name === 'list_item') {
          const liftCommand = liftListItem(schema.nodes['list_item']);
          return liftCommand(state, dispatch, view);
        }
        depth--;
      }
      
      return false;
    },
  });
}
