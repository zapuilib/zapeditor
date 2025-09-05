import { Plugin } from 'prosemirror-state';

export function addSurrounding() {
  return new Plugin({
    appendTransaction(_trs, _oldState, newState) {
      const { doc, tr, schema } = newState;
      const paragraph = schema.nodes['paragraph'];
      if (!paragraph) return null;

      const blockElements = ['code_block', 'horizontal_rule', 'media'];
      let changed = false;

      const first = doc.firstChild;
      if (first && blockElements.includes(first.type.name)) {
        tr.insert(0, paragraph.createAndFill()!);
        changed = true;
      }

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


