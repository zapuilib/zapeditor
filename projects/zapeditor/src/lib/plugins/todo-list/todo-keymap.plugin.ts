import { keymap } from 'prosemirror-keymap';
import { splitListItem, liftListItem, sinkListItem, wrapInList } from 'prosemirror-schema-list';
import type { Schema } from 'prosemirror-model';

export function createTodoKeymapPlugin(schema: Schema, editorView: any) {
  return keymap({
    Enter: (state, dispatch, view) => {
      const { selection } = state;
      const { $from } = selection;
      
      // Check what type of list item we're in
      let depth = $from.depth;
      let parentListType = null;
      
      while (depth > 0) {
        const node = $from.node(depth);
        if (node.type.name === 'todo_list_item') {
          // Check if this todo item is inside a numbered list
          let checkDepth = depth + 1;
          let isInNumberedList = false;
          
          while (checkDepth <= $from.depth) {
            const parentNode = $from.node(checkDepth);
            if (parentNode.type.name === 'ordered_list') {
              isInNumberedList = true;
              break;
            } else if (parentNode.type.name === 'bullet_list') {
              break; // Found bullet list, not numbered
            } else if (parentNode.type.name === 'todo_list') {
              // Skip todo_list and check its parent
              checkDepth++;
              continue;
            }
            checkDepth++;
          }
          
          // If the todo item is empty, lift it out of the list
          if (node.content.size === 0 || (node.content.size === 1 && node.firstChild?.isTextblock && node.firstChild.content.size === 0)) {
            // First lift the todo item out of the todo list
            const liftCommand = liftListItem(schema.nodes['todo_list_item']);
            const lifted = liftCommand(state, dispatch, view);
            
            if (lifted && dispatch && isInNumberedList) {
              // After lifting, try to wrap the content in an ordered list
              const { ordered_list } = schema.nodes;
              const wrapCommand = wrapInList(ordered_list);
              wrapCommand(editorView?.state!, dispatch, editorView!);
            }
            return true;
          } else {
            // Split the todo list item to create a new one
            const splitCommand = splitListItem(schema.nodes['todo_list_item']);
            return splitCommand(state, dispatch, view);
          }
        } else if (node.type.name === 'list_item') {
          // If the regular list item is empty, lift it out of the list
          if (node.content.size === 0 || (node.content.size === 1 && node.firstChild?.isTextblock && node.firstChild.content.size === 0)) {
            const liftCommand = liftListItem(schema.nodes['list_item']);
            return liftCommand(state, dispatch, view);
          } else {
            // Split the regular list item to create a new one
            const splitCommand = splitListItem(schema.nodes['list_item']);
            return splitCommand(state, dispatch, view);
          }
        }
        depth--;
      }
      
      // Default behavior - no list item found
      return false;
    },
    Tab: (state, dispatch, view) => {
      const { selection } = state;
      const { $from } = selection;
      
      // Check what type of list item we're in
      let depth = $from.depth;
      while (depth > 0) {
        const node = $from.node(depth);
        if (node.type.name === 'todo_list_item') {
          // Use sinkListItem for todo list items to create nesting
          const sinkCommand = sinkListItem(schema.nodes['todo_list_item']);
          return sinkCommand(state, dispatch, view);
        } else if (node.type.name === 'list_item') {
          // Use sinkListItem for regular list items to create nesting
          const sinkCommand = sinkListItem(schema.nodes['list_item']);
          return sinkCommand(state, dispatch, view);
        }
        depth--;
      }
      
      // Default behavior - no list item found
      return false;
    },
    'Shift-Tab': (state, dispatch, view) => {
      const { selection } = state;
      const { $from } = selection;
      
      // Check what type of list item we're in
      let depth = $from.depth;
      while (depth > 0) {
        const node = $from.node(depth);
        if (node.type.name === 'todo_list_item') {
          // Use liftListItem for todo list items to reduce nesting
          const liftCommand = liftListItem(schema.nodes['todo_list_item']);
          return liftCommand(state, dispatch, view);
        } else if (node.type.name === 'list_item') {
          // Use liftListItem for regular list items to reduce nesting
          const liftCommand = liftListItem(schema.nodes['list_item']);
          return liftCommand(state, dispatch, view);
        }
        depth--;
      }
      
      // Default behavior - no list item found
      return false;
    },
  });
}
