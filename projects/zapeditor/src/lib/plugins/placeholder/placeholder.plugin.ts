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

        // Check if we're inside a code block by looking at all parent nodes
        let isInCodeBlock = false;
        for (let i = 0; i <= $from.depth; i++) {
          const node = $from.node(i);
          if (node && node.type.name === 'code_block') {
            isInCodeBlock = true;
            break;
          }
        }

        // Also check if the current node itself is a code block
        if (currentNode.type.name === 'code_block') {
          isInCodeBlock = true;
        }

        // Additional check: if the focused element is inside a code block DOM element
        if (!isInCodeBlock && typeof document !== 'undefined') {
          const activeElement = document.activeElement;
          if (activeElement) {
            const codeBlockElement = activeElement.closest('.pm-codeblock');
            if (codeBlockElement) {
              isInCodeBlock = true;
            }
            
            // Also check if the active element is a CodeMirror editor
            if (activeElement.classList.contains('cm-editor') || 
                activeElement.closest('.cm-editor')) {
              isInCodeBlock = true;
            }
          }
        }

        // Only add placeholder if the current node is a text block, is empty, and not in a code block
        if (currentNode.isTextblock && currentNode.content.size === 0 && !isInCodeBlock) {
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
