import { Plugin } from 'prosemirror-state';

/**
 * This plugin ensures that there are paragraphs before and after block elements that need surrounding content.
 * This is useful for the user to be able to click above/below easily.
 */
export function addSurrounding() {
  return new Plugin({
    appendTransaction(_trs, _oldState, newState) {
      const { doc, tr, schema } = newState;
      const paragraph = schema.nodes['paragraph'];
      if (!paragraph) return null;

      const blockElements = ['code_block', 'horizontal_rule'];
      let changed = false;

      // Only add paragraph before if it's the very first element
      const first = doc.firstChild;
      if (first && blockElements.includes(first.type.name)) {
        tr.insert(0, paragraph.createAndFill()!);
        changed = true;
      }

      // Always add paragraph after block elements
      const last = (changed ? tr.doc : doc).lastChild;
      if (last && blockElements.includes(last.type.name)) {
        const endPos = (changed ? tr.doc : doc).content.size;
        tr.insert(endPos, paragraph.createAndFill()!);
        changed = true;
      }

      return changed ? tr : null;
    },
  });
}


