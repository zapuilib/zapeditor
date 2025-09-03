import { Plugin } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';

/**
 * This plugin adds a placeholder text to the editor only on the current line where the cursor is positioned.
 * @param text - The text to display as the placeholder.
 * @returns A plugin that adds a placeholder text only to the current empty line in the editor.
 */
export function placeholderPlugin(text: string) {
  return new Plugin({
    props: {
      decorations(state) {
        const { doc, selection } = state;
        const decorations: Decoration[] = [];

        // Get the current node where the cursor is positioned
        const $from = selection.$from;
        const currentNode = $from.parent;

        // Only add placeholder if the current node is a text block and is empty
        if (currentNode.isTextblock && currentNode.content.size === 0) {
          const pos = $from.before();
          decorations.push(
            Decoration.node(pos, pos + currentNode.nodeSize, {
              'data-placeholder': text,
            })
          );
        }

        return decorations.length > 0 ? DecorationSet.create(doc, decorations) : null;
      },
    },
  });
}
