import { isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  inject,
  PLATFORM_ID,
  signal,
  ViewChild,
} from '@angular/core';
import { setBlockType, toggleMark } from 'prosemirror-commands';
import { redo, undo } from 'prosemirror-history';
import { EditorView } from 'prosemirror-view';
import { wrapInList, liftListItem } from 'prosemirror-schema-list';
import { TextSelection } from 'prosemirror-state';

import { HubEditorToolbar } from '../components';
import { BaseEditor } from './hub-editor.directives';

@Component({
  selector: 'zap-editor',
  imports: [HubEditorToolbar],
  template: ` <div class="wysiwyg__editor__wrapper">
    <hub-editor-toolbar
      [href]="href()"
      [text]="text()"
      [isOnLink]="isOnLink()"
      [currentColor]="getCurrentColor()"
      (styleChange)="onStyleChange($event)"
      (undo)="onUndo()"
      (redo)="onRedo()"
      (bold)="onBold()"
      (italic)="onItalic()"
      (underline)="onUnderline()"
      (textFormat)="onTextFormat($event)"
      (align)="setTextAlign($event)"
      (list)="onList($event)"
      (link)="onLink($event)"
      (linkButtonClick)="onLinkButtonClick()"
      (codeBlock)="onCodeBlock()"
      (color)="onColor($event)"
      (at)="onAt()"
      (block)="onBlock($event)"></hub-editor-toolbar>
    <div #editor class="wysiwyg__editor"></div>
  </div>`,
  styleUrl: './hub-editor.component.scss',
})
export class ZapEditor extends BaseEditor implements AfterViewInit {
  @ViewChild('editor') editor!: ElementRef<HTMLDivElement>;
  protected readonly platformId = inject(PLATFORM_ID);
  protected readonly cdr = inject(ChangeDetectorRef);
  href = signal<string>('');
  text = signal<string>('');
  isOnLink = signal<boolean>(false);

  ngAfterViewInit() {
    if (!isPlatformBrowser(this.platformId)) return;
    this.initializeEditor();
  }

  private initializeEditor() {
    this.editorView = new EditorView(this.editor.nativeElement, {
      state: this.getState(),
      dispatchTransaction: (transaction) => {
        const newState = this.editorView!.state.apply(transaction);
        this.editorView!.updateState(newState);
        this.updateLinkState();
        this.cdr.detectChanges();
      }
    });
  }

  private updateLinkState() {
    this.isOnLink.set(this.isCursorOnLink());
  }

  private applyBlock(nodeType: any, attrs?: any) {
    const state = this.editorView!.state;
    try {
      const result = setBlockType(nodeType, attrs)(
        state,
        this.editorView!.dispatch,
        this.editorView!,
      );
      if (!result) {
        const { from, to } = state.selection;
        const tr = state.tr.setBlockType(from, to, nodeType, attrs);
        this.editorView!.dispatch(tr);
      }
    } catch (error) {
      const { from, to } = state.selection;
      const tr = state.tr.setBlockType(from, to, nodeType, attrs);
      this.editorView!.dispatch(tr);
    }
  }

  private focusEditor() {
    if (this.editorView) {
      setTimeout(() => {
        this.editorView!.focus();
      }, 50);
    }
  }

  onUndo() {
    if (!this.editorView) return;
    undo(this.editorView.state, this.editorView.dispatch);
    this.editorView.focus();
  }

  onRedo() {
    if (!this.editorView) return;
    redo(this.editorView.state, this.editorView.dispatch);
    this.editorView.focus();
  }

  onBold() {
    if (!this.editorView) return;
    const { bold } = this.editorView.state.schema.marks;
    toggleMark(bold)(this.editorView.state, this.editorView.dispatch);
    this.editorView.focus();
  }

  onItalic() {
    if (!this.editorView) return;
    const { italic } = this.editorView.state.schema.marks;
    toggleMark(italic)(this.editorView.state, this.editorView.dispatch);
    this.editorView.focus();
  }

  onUnderline() {
    if (!this.editorView) return;
    const { underline } = this.editorView.state.schema.marks;
    toggleMark(underline)(this.editorView.state, this.editorView.dispatch);
    this.editorView.focus();
  }

  onStyleChange(value: string) {
    if (!this.editorView) return;

    const { paragraph, heading } = this.editorView.state.schema.nodes;
    const { state } = this.editorView;
    const { $from } = state.selection;

    if (!$from || !$from.parent) {
      return;
    }
    const parent = $from.parent;

    if (state.doc.content.size === 0) {
      if (value === 'p') {
        const tr = this.editorView.state.tr.insert(0, paragraph.create());
        this.editorView.dispatch(tr);
      } else if (value.startsWith('h')) {
        const level = parseInt(value.slice(1), 10);
        const tr = this.editorView.state.tr.insert(0, heading.create({ level }));
        this.editorView.dispatch(tr);
      }
    }

    let parentPos: number;
    try {
      parentPos = $from.before();
    } catch (error) {
      parentPos = $from.pos;
    }

    if (value === 'p') {
      this.applyBlock(paragraph);
    } else if (value.startsWith('h')) {
      const level = parseInt(value.slice(1), 10);
      this.applyBlock(heading, { level });
    }

    this.focusEditor();
  }

  onTextFormat(value: string) {
    if (!this.editorView) return;

    const { strike, code, sup, sub } = this.editorView.state.schema.marks;

    switch (value) {
      case 'strikethrough':
        toggleMark(strike)(this.editorView.state, this.editorView.dispatch);
        break;
      case 'code':
        toggleMark(code)(this.editorView.state, this.editorView.dispatch);
        break;
      case 'superscript':
        toggleMark(sup)(this.editorView.state, this.editorView.dispatch);
        break;
      case 'subscript':
        toggleMark(sub)(this.editorView.state, this.editorView.dispatch);
        break;
    }

    this.focusEditor();
  }

  setTextAlign(align: 'left' | 'center' | 'right' | 'justify') {
    if (!this.editorView) return;
    const { state } = this.editorView;
    const { from, to } = state.selection;
    
    // Check if we're inside a list item (bullet, ordered, or todo)
    const $from = state.selection.$from;
    let isInListItem = false;
    let depth = $from.depth;
    
    while (depth > 0) {
      const node = $from.node(depth);
      if (node.type.name === 'list_item' || node.type.name === 'todo_list_item') {
        isInListItem = true;
        break;
      }
      depth--;
    }
    
    // Don't apply alignment if we're inside a list item
    if (isInListItem) {
      return;
    }
    
    let tr = state.tr;
    const paragraph = state.schema.nodes['paragraph'];
    const heading = state.schema.nodes['heading'];
    const listItem = state.schema.nodes['list_item'];
    if (from === to) {
      const parent = $from.parent;
      if (parent && (parent.type === paragraph || parent.type === heading)) {
        const pos = $from.before();
        const nextAttrs = { ...parent.attrs, align } as any;
        tr = tr.setNodeMarkup(pos, parent.type, nextAttrs, parent.marks);
      } else if (parent.type === listItem) {
        const start = $from.start();
        const first = state.doc.nodeAt(start);
        if (first && (first.type === paragraph || first.type === heading)) {
          const nextAttrs = { ...first.attrs, align } as any;
          tr = tr.setNodeMarkup(start, first.type, nextAttrs, first.marks);
        }
      }
    } else {
      state.doc.nodesBetween(from, to, (node, pos) => {
        if (!node.isTextblock) return;
        if (node.type === paragraph || node.type === heading) {
          const nextAttrs = { ...node.attrs, align } as any;
          tr = tr.setNodeMarkup(pos, node.type, nextAttrs, node.marks);
        }
      });
    }
    if (tr.docChanged) {
      this.editorView.dispatch(tr.scrollIntoView());
      this.editorView.focus();
    }
  }

  onList(event: any) {
    if (!this.editorView) return;

    const { state } = this.editorView;
    const { bullet_list, ordered_list, todo_list, todo_list_item } = state.schema.nodes;

    let listType;
    if (event === 'bullet') listType = bullet_list;
    else if (event === 'numbered') listType = ordered_list;
    else if (event === 'todo') listType = todo_list;
    else return;

    const $from = state.selection.$from;
    let inList = false;
    let currentListType = null;
    let inTodoItem = false;

    let depth = $from.depth;
    while (depth > 0) {
      const node = $from.node(depth);
      if (node.type === todo_list_item) {
        inTodoItem = true;
        break;
      }
      if (node.type === bullet_list || node.type === ordered_list || node.type === todo_list) {
        inList = true;
        currentListType = node.type;
        break;
      }
      depth--;
    }

    // If we're inside a todo item, don't allow creating any lists
    if (inTodoItem) {
      return;
    }

    if (inList) {
      if (currentListType === listType) {
        // Same list type - lift out of list
        const listItemType = listType === todo_list ? 'todo_list_item' : 'list_item';
        liftListItem(state.schema.nodes[listItemType])(
          state,
          this.editorView.dispatch,
          this.editorView,
        );
      } else {
        // Different list type - convert while maintaining nesting
        this.convertListType(currentListType, listType, state);
      }
    } else {
      wrapInList(listType)(state, this.editorView.dispatch, this.editorView);
    }

    this.focusEditor();
  }

  private convertListType(currentListType: any, newListType: any, state: any) {
    if (!this.editorView) return;

    const { $from } = state.selection;
    const tr = state.tr;
    
    // Find the current list node and its position
    let depth = $from.depth;
    let listPos = -1;
    let listNode = null;
    
    while (depth > 0) {
      const node = $from.node(depth);
      if (node.type === currentListType) {
        listPos = $from.before(depth);
        listNode = node;
        break;
      }
      depth--;
    }
    
    if (listPos === -1 || !listNode) return;
    
    // Get the list item type for the new list
    const newListItemType = newListType === state.schema.nodes.todo_list ? 'todo_list_item' : 'list_item';
    
    // Create new list items with the correct type
    const newListItems: any[] = [];
    listNode.forEach((item: any, offset: number, index: number) => {
      if (item.type.name === 'todo_list_item' || item.type.name === 'list_item') {
        // Convert the list item to the new type
        const newItem = state.schema.nodes[newListItemType].create(
          newListItemType === 'todo_list_item' ? { checked: item.attrs.checked || false } : {},
          item.content
        );
        newListItems.push(newItem);
      }
    });
    
    // Create the new list with the new items
    const newList = newListType.create({}, newListItems);
    
    // Replace the old list with the new list
    tr.replaceWith(listPos, listPos + listNode.nodeSize, newList);
    
    this.editorView.dispatch(tr);
  }

  onCodeBlock() {
    if (!this.editorView) return;
    const { state } = this.editorView;
    const { from, to } = state.selection;
    const codeType = state.schema.nodes['code_block'];

    if (from === to) {
      // If no text is selected, check if current line is empty
      const $from = state.selection.$from;
      const parent = $from.parent;
      const pos = $from.pos;
      const start = $from.start();
      const end = $from.end();
      
      // Check if current line is empty (only whitespace or no content)
      const isEmpty = parent.textContent.trim() === '' && pos === start;
      
      let tr = state.tr;
      let newPos = pos;
      
      if (isEmpty) {
        // Replace current empty paragraph with code block
        const codeNode = codeType.create({ language: 'ts', wrapped: false });
        tr = tr.replaceWith(start - 1, end + 1, codeNode);
        newPos = start;
      } else {
        // Insert a newline and then create the codeblock
        const endOfLine = $from.end();
        tr = tr.insertText('\n', endOfLine);
        newPos = endOfLine + 1;
        
        // Create empty codeblock
        const codeNode = codeType.create({ language: 'ts', wrapped: false });
        tr = tr.insert(newPos, codeNode);
      }
      
      // Set cursor inside the codeblock
      tr = tr.setSelection(TextSelection.near(tr.doc.resolve(newPos + 1)));
      this.editorView.dispatch(tr.scrollIntoView());
    } else {
      // If text is selected, convert it to a code block
      let joined = '';
      state.doc.nodesBetween(from, to, (node) => {
        if (node.isTextblock) {
          if (joined) joined += '\n';
          joined += node.textContent || '';
        }
      });

      const codeNode = codeType.create(
        { language: 'ts', wrapped: false },
        state.schema.text(joined),
      );
      let tr = state.tr.replaceRangeWith(from, to, codeNode);
      tr = tr.setSelection(TextSelection.near(tr.doc.resolve(from + 1)));
      this.editorView.dispatch(tr.scrollIntoView());
    }
    this.focusEditor();
  }

  onLink(event: { href: string; text: string }) {
    if (!this.editorView) return;
    const { state } = this.editorView;
    const { from, to } = state.selection;
    const { link } = state.schema.marks;

    if (from === to) {
      if (event.href && event.href.trim() !== '') {
        const linkText = event.text || event.href;
        const linkMark = link.create({ href: event.href });
        const textNode = state.schema.text(linkText, [linkMark]);
        const tr = state.tr.insert(from, textNode);
        this.editorView.dispatch(tr);
        this.editorView.focus();
      }
      return;
    }

    if (!event.href || event.href.trim() === '') {
      const tr = state.tr.removeMark(from, to, link);
      this.editorView.dispatch(tr);
      this.editorView.focus();
      return;
    }

    const linkMark = link.create({ href: event.href });
    const tr = state.tr.addMark(from, to, linkMark);
    this.editorView.dispatch(tr);
    this.editorView.focus();
  }

  onLinkButtonClick() {
    if (!this.editorView) return;
    const { state } = this.editorView;
    const { from, to } = state.selection;
    
    if (from === to) {
      const node = state.doc.nodeAt(from);
      if (node) {
        const linkMark = node.marks.find((mark) => mark.type === state.schema.marks['link']);
        if (linkMark && linkMark.attrs['href']) {
          this.text.set(node.text || '');
          this.href.set(linkMark.attrs['href']);
          return;
        }
      }
      this.text.set('');
      this.href.set('');
      return;
    }

    const selectedText = state.doc.textBetween(from, to);
    this.text.set(selectedText);

    const hasLinkMark = state.doc.rangeHasMark(from, to, state.schema.marks['link']);

    if (hasLinkMark) {
      let linkHref = '';

      for (let pos = from; pos < to; pos++) {
        const node = state.doc.nodeAt(pos);
        if (node) {
          const linkMark = node.marks.find((mark) => mark.type === state.schema.marks['link']);
          if (linkMark && linkMark.attrs['href']) {
            linkHref = linkMark.attrs['href'];
            break;
          }
        }
      }

      this.href.set(linkHref);
    } else {
      this.href.set('');
    }
  }

  isCursorOnLink(): boolean {
    if (!this.editorView) return false;
    const { state } = this.editorView;
    const { from } = state.selection;
    const node = state.doc.nodeAt(from);
    if (node) {
      const linkMark = node.marks.find((mark) => mark.type === state.schema.marks['link']);
      return !!linkMark;
    }
    return false;
  }

  onColor(color: string) {
    if (!this.editorView) return;
    const { state } = this.editorView;
    const { from, to } = state.selection;
    const { color: colorMark } = state.schema.marks;

    if (from === to) {
      const attrs = { color } as any;
      const tr = state.tr.addStoredMark(colorMark.create(attrs));
      this.editorView.dispatch(tr);
    } else {
      const attrs = { color } as any;
      const tr = state.tr.addMark(from, to, colorMark.create(attrs));
      this.editorView.dispatch(tr);
    }
    
    this.editorView.focus();
  }

  getCurrentColor(): string {
    if (!this.editorView) return '#FFFFFFCC';
    const { state } = this.editorView;
    const { from } = state.selection;
    const { color: colorMark } = state.schema.marks;

    const stored = state.storedMarks;
    if (stored) {
      const colorStoredMark = stored.find(mark => mark.type === colorMark);
      if (colorStoredMark && colorStoredMark.attrs['color']) {
        return colorStoredMark.attrs['color'];
      }
    }

    const node = state.doc.nodeAt(from);
    if (node) {
      const colorMarkAtPos = node.marks.find(mark => mark.type === colorMark);
      if (colorMarkAtPos && colorMarkAtPos.attrs['color']) {
        return colorMarkAtPos.attrs['color'];
      }
    }

    const { to } = state.selection;
    if (from !== to) {
      let foundColor: string | null = null;
      state.doc.nodesBetween(from, to, (node, pos) => {
        if (foundColor) return false;
        node.marks.forEach(mark => {
          if (mark.type === colorMark && mark.attrs['color']) {
            foundColor = mark.attrs['color'];
          }
        });
        return !foundColor;
      });
      if (foundColor) return foundColor;
    }

    if (from > 0) {
      const prevNode = state.doc.nodeAt(from - 1);
      if (prevNode) {
        const colorMarkAtPrev = prevNode.marks.find(mark => mark.type === colorMark);
        if (colorMarkAtPrev && colorMarkAtPrev.attrs['color']) {
          return colorMarkAtPrev.attrs['color'];
        }
      }
    }

    return '#FFFFFFCC';
  }

  onBlock(blockType: string) {
    if (!this.editorView) return;
    const { state } = this.editorView;
    const { from } = state.selection;

    if (blockType === 'hr') {
      const horizontalRule = state.schema.nodes['horizontal_rule'];
      const paragraph = state.schema.nodes['paragraph'];
      if (horizontalRule && paragraph) {
        const $from = state.selection.$from;
        const parent = $from.parent;
        const pos = $from.pos;
        const start = $from.start();
        const end = $from.end();
        
        // Check if current line is empty (only whitespace or no content)
        const isEmpty = parent.textContent.trim() === '' && pos === start;
        
        let tr = state.tr;
        let newPos = pos;
        
        if (isEmpty) {
          // Replace current empty paragraph with divider and new paragraph
          const dividerNode = horizontalRule.create();
          const paragraphNode = paragraph.create();
          tr = tr.replaceWith(start - 1, end + 1, [dividerNode, paragraphNode]);
          newPos = start + dividerNode.nodeSize;
        } else {
          // Insert divider and new paragraph at current position
          const dividerNode = horizontalRule.create();
          const paragraphNode = paragraph.create();
          tr = tr.insert(from, [dividerNode, paragraphNode]);
          newPos = from + dividerNode.nodeSize + 1;
        }
        
        tr = tr.setSelection(TextSelection.near(tr.doc.resolve(newPos)));
        this.editorView.dispatch(tr);
        this.editorView.focus();
      }
    }
  }

  onAt() {
    if (!this.editorView) return;
    //add new @ on the editor so it trigger the mention plugin
    const { state } = this.editorView;
    const { from } = state.selection;
    const tr = state.tr.insertText('@', from);
    this.editorView.dispatch(tr);
    this.editorView.focus();
  }
}
