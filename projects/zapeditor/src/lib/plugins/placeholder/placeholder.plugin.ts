import { Plugin } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';

/**
 * This plugin adds a placeholder text to the editor when the document is empty.
 * @param text - The text to display as the placeholder.
 * @returns A plugin that adds a placeholder text to the editor when the document is empty.
 */
export function placeholderPlugin(text: string) {
  return new Plugin({
    props: {
      decorations(state) {
        const { doc } = state;

        const isEmptyDoc =
          doc.childCount === 1 &&
          doc.firstChild?.isTextblock &&
          doc.firstChild.content.size === 0;

        if (!isEmptyDoc) return null;

        const decorations = [
          Decoration.node(0, doc.firstChild!.nodeSize, {
            'data-placeholder': text,
          }),
        ];
        return DecorationSet.create(doc, decorations);
      },
    },
  });
}
