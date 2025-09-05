import { Plugin } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';

export function placeholderPlugin(text: string) {
  return new Plugin({
    props: {
      decorations(state) {
        const { doc, selection } = state;
        const decorations: Decoration[] = [];

        const $from = selection.$from;
        const currentNode = $from.parent;

        let isInCodeBlock = false;
        for (let i = 0; i <= $from.depth; i++) {
          const node = $from.node(i);
          if (node && node.type.name === 'code_block') {
            isInCodeBlock = true;
            break;
          }
        }

        if (currentNode.type.name === 'code_block') {
          isInCodeBlock = true;
        }

        if (!isInCodeBlock && typeof document !== 'undefined') {
          const activeElement = document.activeElement;
          if (activeElement) {
            const codeBlockElement = activeElement.closest('.pm-codeblock');
            if (codeBlockElement) {
              isInCodeBlock = true;
            }
            
            if (activeElement.classList.contains('cm-editor') || 
                activeElement.closest('.cm-editor')) {
              isInCodeBlock = true;
            }
          }
        }

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
