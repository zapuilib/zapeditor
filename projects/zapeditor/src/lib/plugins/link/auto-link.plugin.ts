import { Plugin } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';

export function autoLinkPlugin() {
  return new Plugin({
    props: {
      handlePaste(view: EditorView, event: ClipboardEvent, slice: any) {
        const clipboardData = event.clipboardData?.getData('text/plain');
        if (!clipboardData) return false;

        const isURL = clipboardData.includes('://') || clipboardData.startsWith('www.');
        
        if (!isURL) return false;

        event.preventDefault();

        const { state } = view;
        const { selection } = state;
        let { from, to } = selection;

        const url = clipboardData.startsWith('http') 
          ? clipboardData 
          : `http://${clipboardData}`;

        const linkMark = state.schema.marks['link']?.create({ href: url });
        if (!linkMark) return false;

        let tr = state.tr;

        if (selection.empty) {
          tr = tr.insertText(clipboardData, from).addMark(from, from + clipboardData.length, linkMark);
        } else {
          tr = tr.addMark(from, to, linkMark);
        }

        view.dispatch(tr);
        return true;
      },
    },
  });
}