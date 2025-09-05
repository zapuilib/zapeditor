import { inputRules, InputRule } from 'prosemirror-inputrules';
import { findWrapping } from 'prosemirror-transform';
import type { Schema } from 'prosemirror-model';

export function createTodoInputRulesPlugin(schema: Schema) {
  const { todo_list, todo_list_item } = schema.nodes;

  const uncheckedTodoRule = new InputRule(
    /^\s?\[\s\]\s$/,
    (state, match, start, end) => {
      const { tr } = state;
      tr.deleteRange(start, end);
      
      const $pos = tr.selection.$from;
      const range = $pos.blockRange();
      if (!range) return null;
      
      const wrapping = findWrapping(range, todo_list);
      if (!wrapping) return null;
      
      return tr.wrap(range, wrapping);
    }
  );

  const checkedTodoRule = new InputRule(
    /^\s?\[[xX]\]\s$/,
    (state, match, start, end) => {
      const { tr } = state;
      tr.deleteRange(start, end);
      
      const $pos = tr.selection.$from;
      const range = $pos.blockRange();
      if (!range) return null;
      
      const wrapping = findWrapping(range, todo_list);
      if (!wrapping) return null;
      
      const result = tr.wrap(range, wrapping);
      
      const $newPos = result.selection.$from;
      let depth = $newPos.depth;
      while (depth > 0) {
        const node = $newPos.node(depth);
        if (node.type === todo_list_item) {
          const pos = $newPos.before(depth);
          result.setNodeMarkup(pos, null, { ...node.attrs, checked: true });
          break;
        }
        depth--;
      }
      
      return result;
    }
  );

  return inputRules({ rules: [uncheckedTodoRule, checkedTodoRule] });
}