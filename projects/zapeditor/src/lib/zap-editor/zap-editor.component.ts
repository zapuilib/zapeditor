import { isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  inject,
  input,
  model,
  output,
  PLATFORM_ID,
  signal,
  ViewChild,
  effect,
} from '@angular/core';
import { OverlayModule } from '@angular/cdk/overlay';
import { setBlockType, toggleMark } from 'prosemirror-commands';
import { redo, undo } from 'prosemirror-history';
import { EditorView } from 'prosemirror-view';
import { wrapInList, liftListItem } from 'prosemirror-schema-list';
import { TextSelection } from 'prosemirror-state';

import { ZapEditorToolbar, InlineToolbarComponent } from '../components';

export interface MediaUploadEvent {
  file: File;
  type: 'image' | 'video' | 'document';
  url: string;
}
import { BaseEditor } from './zap-editor.directives';
import { MentionUser } from '../interfaces';

@Component({
  selector: 'zap-editor',
  imports: [ZapEditorToolbar, InlineToolbarComponent, OverlayModule],
  template: ` <div class="wysiwyg__editor__wrapper">
    @if (toolbar() === 'default') {
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
      (block)="onBlock($event)"
      (file)="onFileUpload($event)"
    ></hub-editor-toolbar>
    }
    <div #editor class="wysiwyg__editor"></div>

    @if (toolbar() === 'inline' && showInlineToolbar()) {
    <inline-toolbar
      [position]="inlineToolbarPosition()"
      [currentColor]="getCurrentColor()"
      [isBold]="isBoldActive()"
      [isItalic]="isItalicActive()"
      [isUnderline]="isUnderlineActive()"
      [isStrikethrough]="isStrikethroughActive()"
      [isCode]="isCodeActive()"
      [isAlignLeft]="isAlignLeftActive()"
      [isAlignCenter]="isAlignCenterActive()"
      [isAlignRight]="isAlignRightActive()"
      [isAlignJustify]="isAlignJustifyActive()"
      [isOnLink]="isOnLink()"
      [href]="href()"
      [text]="text()"
      (bold)="onBold()"
      (italic)="onItalic()"
      (underline)="onUnderline()"
      (strikethrough)="onStrikethrough()"
      (code)="onCode()"
      (align)="setTextAlign($event)"
      (color)="onColor($event)"
      (link)="onLink($event)"
      (linkButtonClick)="onLinkButtonClick()"
      (list)="onListInline($event)"
      (codeBlock)="onCodeBlock()"
      (blockStyle)="onBlockStyle($event)"
      (textFormatting)="onTextFormatting($event)"
    ></inline-toolbar>
    }
  </div>`,
  styleUrl: './zap-editor.component.scss',
})
export class ZapEditor extends BaseEditor implements AfterViewInit {
  @ViewChild('editor') editor!: ElementRef<HTMLDivElement>;
  toolbar = input<'inline' | 'default'>('default');
  format = input<'json' | 'html'>('json');
  value = input<string>('');
  usersInput = model<MentionUser[]>([]);
  mentionSearch = output<string>();
  mediaUpload = output<MediaUploadEvent>();
  onChange = output<string>();
  href = signal<string>('');
  text = signal<string>('');
  isOnLink = signal<boolean>(false);
  private isInitialized = false;
  protected readonly platformId = inject(PLATFORM_ID);
  protected readonly cdr = inject(ChangeDetectorRef);
  showInlineToolbar = signal<boolean>(false);
  inlineToolbarPosition = signal<{
    x: number;
    y: number;
    position?: 'top' | 'bottom';
  }>({ x: 0, y: 0, position: 'top' });

  constructor() {
    super();

    effect(() => {
      this.users = this.usersInput();
      this.updateMentionUsers(this.users);
    });

    effect(() => {
      const newValue = this.value();
      if (
        this.isInitialized &&
        this.editorView &&
        newValue !== this.getCurrentContent()
      ) {
        this.loadContent(newValue);
      }
    });

    this.onMentionSearch = (query: string) => {
      this.mentionSearch.emit(query);
    };
  }


  ngAfterViewInit() {
    if (!isPlatformBrowser(this.platformId)) return;
    this.initializeEditor();
    this.setupInlineToolbarEvents();
    this.setupSlashMediaUpload();
    this.setupDragAndDrop();
    this.loadInitialContent();
    this.isInitialized = true;
  }

  private initializeEditor() {
    this.editorView = new EditorView(this.editor.nativeElement, {
      state: this.getState(),
      dispatchTransaction: (transaction) => {
        const newState = this.editorView!.state.apply(transaction);
        this.editorView!.updateState(newState);
        this.updateLinkState();
        this.updateInlineToolbar();
        this.cdr.detectChanges();

        if (transaction.docChanged) {
          setTimeout(() => {
            this.handleContentChange();
          }, 0);
        }
      },
    });
  }

  private setupInlineToolbarEvents() {
    if (!isPlatformBrowser(this.platformId)) return;

    window.addEventListener(
      'scroll',
      () => {
        if (this.showInlineToolbar()) {
          this.updateInlineToolbar();
        }
      },
      { passive: true }
    );

    window.addEventListener(
      'resize',
      () => {
        if (this.showInlineToolbar()) {
          this.updateInlineToolbar();
        }
      },
      { passive: true }
    );

    document.addEventListener(
      'click',
      (event) => {
        if (this.showInlineToolbar()) {
          const target = event.target as Element;
          const editorElement = this.editor?.nativeElement;

          const inlineToolbarElement = document.querySelector('inline-toolbar');
          if (inlineToolbarElement && inlineToolbarElement.contains(target)) {
            return;
          }

          if (editorElement && !editorElement.contains(target)) {
            this.showInlineToolbar.set(false);
          }
        }
      },
      { passive: true }
    );
  }

  private setupSlashMediaUpload() {
    if (!isPlatformBrowser(this.platformId)) return;

    document.addEventListener('slashMediaUpload', (event: Event) => {
      const customEvent = event as CustomEvent;
      const { file, view } = customEvent.detail;
      if (file && view === this.editorView) {
        this.insertMediaNode(file);
      }
    });
  }

  private setupDragAndDrop() {
    if (!isPlatformBrowser(this.platformId)) return;

    const editorElement = this.editor?.nativeElement;
    if (!editorElement) return;

    editorElement.addEventListener('dragover', (event) => {
      event.preventDefault();
      event.dataTransfer!.dropEffect = 'copy';
    });

    editorElement.addEventListener('dragenter', (event) => {
      event.preventDefault();
      editorElement.classList.add('drag-over');
    });

    editorElement.addEventListener('dragleave', (event) => {
      event.preventDefault();
      if (!editorElement.contains(event.relatedTarget as Node)) {
        editorElement.classList.remove('drag-over');
      }
    });

    editorElement.addEventListener('drop', (event) => {
      event.preventDefault();
      editorElement.classList.remove('drag-over');

      const files = Array.from(event.dataTransfer?.files || []);
      if (files.length > 0) {
        const file = files[0];
        this.handleDroppedFile(file);
      }
    });
  }

  private handleDroppedFile(file: File) {
    const validTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      'video/mp4',
      'video/quicktime',
      'video/webm',
      'video/avi',
      'video/mov',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv',
      'application/rtf',
      'application/zip',
      'application/x-rar-compressed',
      'application/x-7z-compressed',
      'application/x-tar',
      'application/gzip',
      'text/javascript',
      'text/typescript',
      'text/css',
      'text/html',
      'application/json',
      'text/xml',
      'application/xml',
    ];

    if (!validTypes.includes(file.type)) {
      alert(
        'Please drop a valid media file (images, videos, documents, archives, or code files)'
      );
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      alert('File size must be less than 50MB');
      return;
    }

    this.insertMediaNode(file);
  }

  private updateInlineToolbar() {
    if (this.toolbar() !== 'inline' || !this.editorView) {
      this.showInlineToolbar.set(false);
      return;
    }

    const { state } = this.editorView;
    const { selection } = state;
    const { from, to } = selection;

    if (from === to) {
      this.showInlineToolbar.set(false);
      return;
    }

    let hasMediaNode = false;
    state.doc.nodesBetween(from, to, (node) => {
      if (node.type.name === 'media') {
        hasMediaNode = true;
        return false;
      }
      return true;
    });

    if (hasMediaNode) {
      this.showInlineToolbar.set(false);
      return;
    }

    try {
      let startCoords, endCoords;

      if (from === 0 && to === state.doc.content.size) {
        let firstTextPos = 0;
        let lastTextPos = state.doc.content.size;

        state.doc.descendants((node, pos) => {
          if (node.isText && node.text && node.text.length > 0) {
            firstTextPos = pos;
            return false;
          }
          return true;
        });

        state.doc.descendants((node, pos) => {
          if (node.isText && node.text && node.text.length > 0) {
            lastTextPos = pos + node.nodeSize;
          }
          return true;
        });

        startCoords = this.editorView.coordsAtPos(firstTextPos);
        endCoords = this.editorView.coordsAtPos(lastTextPos);
      } else {
        startCoords = this.editorView.coordsAtPos(from);
        endCoords = this.editorView.coordsAtPos(to);
      }

      const editorRect = this.editor.nativeElement.getBoundingClientRect();

      const $from = state.selection.$from;
      let textAlign = 'left';

      if (from !== to) {
        state.doc.nodesBetween(from, to, (node, pos) => {
          if (
            node.isTextblock &&
            (node.type.name === 'paragraph' || node.type.name === 'heading')
          ) {
            textAlign = node.attrs['align'] || 'left';
            return false;
          }
          return true;
        });
      } else {
        const parent = $from.parent;
        textAlign = parent.attrs['align'] || 'left';
      }

      let selectionCenterX, selectionTop, selectionBottom;

      if (startCoords.top === endCoords.top) {
        selectionTop = startCoords.top;
        selectionBottom = startCoords.bottom;

        if (textAlign === 'center') {
          selectionCenterX = (startCoords.left + endCoords.left) / 2;
        } else if (textAlign === 'right') {
          selectionCenterX = endCoords.left;
        } else {
          selectionCenterX = startCoords.left;
        }
      } else {
        selectionTop = startCoords.top;
        selectionBottom = startCoords.bottom;

        if (textAlign === 'center') {
          selectionCenterX =
            startCoords.left + (startCoords.right - startCoords.left) / 2;
        } else if (textAlign === 'right') {
          selectionCenterX = startCoords.right;
        } else {
          selectionCenterX = startCoords.left;
        }
      }

      const toolbarElement = document.querySelector(
        '.inline__toolbar__content'
      ) as HTMLElement;
      let toolbarWidth = 300;
      let toolbarHeight = 40;

      if (toolbarElement) {
        const rect = toolbarElement.getBoundingClientRect();
        toolbarWidth = rect.width;
        toolbarHeight = rect.height;
      }

      const offset = 2;
      const minLeftOffset = 50;
      const isMobile = window.innerWidth <= 768;

      let x = selectionCenterX;
      let y = selectionTop;
      let position: 'top' | 'bottom' = 'top';

      y = selectionTop - toolbarHeight - offset + 40;
      position = 'top';

      if (isMobile) {
        const lineStart = $from.start();
        const lineStartCoords = this.editorView.coordsAtPos(lineStart);
        x = lineStartCoords.left;

        const minX = minLeftOffset + toolbarWidth / 2;
        const maxX = window.innerWidth - minLeftOffset - toolbarWidth / 2;

        if (x < minX) {
          x = minX;
        } else if (x > maxX) {
          x = maxX;
        }
      } else {
        const minX = minLeftOffset + toolbarWidth / 2;
        const maxX = window.innerWidth - minLeftOffset - toolbarWidth / 2;

        if (x < minX) {
          x = minX;
        } else if (x > maxX) {
          x = maxX;
        }
      }

      if (y < 20) {
        y = selectionBottom + offset;
        position = 'bottom';
      }

      if (y + toolbarHeight > window.innerHeight - 20) {
        y = selectionTop - toolbarHeight - offset;
        position = 'top';
      }

      this.inlineToolbarPosition.set({ x, y, position });
      this.showInlineToolbar.set(true);
    } catch (error) {
      this.showInlineToolbar.set(false);
    }
  }

  private updateLinkState() {
    this.isOnLink.set(this.isCursorOnLink());
  }

  isBoldActive(): boolean {
    if (!this.editorView) return false;
    const { state } = this.editorView;
    const { from, to } = state.selection;
    return state.doc.rangeHasMark(from, to, state.schema.marks['bold']);
  }

  isItalicActive(): boolean {
    if (!this.editorView) return false;
    const { state } = this.editorView;
    const { from, to } = state.selection;
    return state.doc.rangeHasMark(from, to, state.schema.marks['italic']);
  }

  isUnderlineActive(): boolean {
    if (!this.editorView) return false;
    const { state } = this.editorView;
    const { from, to } = state.selection;
    return state.doc.rangeHasMark(from, to, state.schema.marks['underline']);
  }

  isStrikethroughActive(): boolean {
    if (!this.editorView) return false;
    const { state } = this.editorView;
    const { from, to } = state.selection;
    return state.doc.rangeHasMark(from, to, state.schema.marks['strike']);
  }

  isCodeActive(): boolean {
    if (!this.editorView) return false;
    const { state } = this.editorView;
    const { from, to } = state.selection;
    return state.doc.rangeHasMark(from, to, state.schema.marks['code']);
  }

  isAlignLeftActive(): boolean {
    if (!this.editorView) return false;
    const { state } = this.editorView;
    const { $from } = state.selection;
    const parent = $from.parent;
    return parent.attrs['align'] === 'left' || !parent.attrs['align'];
  }

  isAlignCenterActive(): boolean {
    if (!this.editorView) return false;
    const { state } = this.editorView;
    const { $from } = state.selection;
    const parent = $from.parent;
    return parent.attrs['align'] === 'center';
  }

  isAlignRightActive(): boolean {
    if (!this.editorView) return false;
    const { state } = this.editorView;
    const { $from } = state.selection;
    const parent = $from.parent;
    return parent.attrs['align'] === 'right';
  }

  isAlignJustifyActive(): boolean {
    if (!this.editorView) return false;
    const { state } = this.editorView;
    const { $from } = state.selection;
    const parent = $from.parent;
    return parent.attrs['align'] === 'justify';
  }

  private applyBlock(nodeType: any, attrs?: any) {
    const state = this.editorView!.state;
    try {
      const result = setBlockType(nodeType, attrs)(
        state,
        this.editorView!.dispatch,
        this.editorView!
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

    setTimeout(() => {
      this.updateInlineToolbar();
    }, 0);
  }

  onItalic() {
    if (!this.editorView) return;
    const { italic } = this.editorView.state.schema.marks;
    toggleMark(italic)(this.editorView.state, this.editorView.dispatch);
    this.editorView.focus();

    setTimeout(() => {
      this.updateInlineToolbar();
    }, 0);
  }

  onUnderline() {
    if (!this.editorView) return;
    const { underline } = this.editorView.state.schema.marks;
    toggleMark(underline)(this.editorView.state, this.editorView.dispatch);
    this.editorView.focus();

    setTimeout(() => {
      this.updateInlineToolbar();
    }, 0);
  }

  onStrikethrough() {
    if (!this.editorView) return;
    const { strike } = this.editorView.state.schema.marks;
    toggleMark(strike)(this.editorView.state, this.editorView.dispatch);
    this.editorView.focus();

    setTimeout(() => {
      this.updateInlineToolbar();
    }, 0);
  }

  onCode() {
    if (!this.editorView) return;
    const { code } = this.editorView.state.schema.marks;
    toggleMark(code)(this.editorView.state, this.editorView.dispatch);
    this.editorView.focus();

    setTimeout(() => {
      this.updateInlineToolbar();
    }, 0);
  }

  onBlockStyle(value: string) {
    this.onStyleChange(value);
  }

  onTextFormatting(value: string) {
    if (!this.editorView) return;

    switch (value) {
      case 'strikethrough':
        this.onStrikethrough();
        break;
      case 'code':
        this.onCode();
        break;
      case 'superscript':
        this.onSuperscript();
        break;
      case 'subscript':
        this.onSubscript();
        break;
    }
  }

  onSuperscript() {
    if (!this.editorView) return;
    const { sup } = this.editorView.state.schema.marks;
    if (sup) {
      toggleMark(sup)(this.editorView.state, this.editorView.dispatch);
      this.editorView.focus();

      setTimeout(() => {
        this.updateInlineToolbar();
      }, 0);
    }
  }

  onSubscript() {
    if (!this.editorView) return;
    const { sub } = this.editorView.state.schema.marks;
    if (sub) {
      toggleMark(sub)(this.editorView.state, this.editorView.dispatch);
      this.editorView.focus();

      setTimeout(() => {
        this.updateInlineToolbar();
      }, 0);
    }
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
        const tr = this.editorView.state.tr.insert(
          0,
          heading.create({ level })
        );
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

    const $from = state.selection.$from;
    let isInListItem = false;
    let depth = $from.depth;

    while (depth > 0) {
      const node = $from.node(depth);
      if (
        node.type.name === 'list_item' ||
        node.type.name === 'todo_list_item'
      ) {
        isInListItem = true;
        break;
      }
      depth--;
    }

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

      setTimeout(() => {
        this.updateInlineToolbar();
      }, 0);
    }
  }

  onList(event: any) {
    if (!this.editorView) return;

    const { state } = this.editorView;
    const { bullet_list, ordered_list, todo_list, todo_list_item } =
      state.schema.nodes;

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
      if (
        node.type === bullet_list ||
        node.type === ordered_list ||
        node.type === todo_list
      ) {
        inList = true;
        currentListType = node.type;
        break;
      }
      depth--;
    }

    if (inTodoItem) {
      return;
    }

    if (inList) {
      if (currentListType === listType) {
        const listItemType =
          listType === todo_list ? 'todo_list_item' : 'list_item';
        liftListItem(state.schema.nodes[listItemType])(
          state,
          this.editorView.dispatch,
          this.editorView
        );
      } else {
        this.convertListType(currentListType, listType, state);
      }
    } else {
      wrapInList(listType)(state, this.editorView.dispatch, this.editorView);
    }

    this.focusEditor();
  }

  onListInline(event: any) {
    if (!this.editorView) return;

    const { state } = this.editorView;
    const { bullet_list, ordered_list, todo_list, todo_list_item } =
      state.schema.nodes;

    let listType;
    if (event === 'bullet') listType = bullet_list;
    else if (event === 'numbered') listType = ordered_list;
    else if (event === 'todo') listType = todo_list;
    else return;

    let workingState = state;
    if (state.selection.from !== state.selection.to) {
      const isSelectAll =
        state.selection.from === 0 &&
        state.selection.to === state.doc.content.size;

      if (isSelectAll) {
        const tr = state.tr.setSelection(TextSelection.create(state.doc, 1));
        workingState = state.apply(tr);
      } else {
        const tr = state.tr.setSelection(
          TextSelection.create(state.doc, state.selection.to)
        );
        workingState = state.apply(tr);
      }
    }

    const $from = workingState.selection.$from;
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
      if (
        node.type === bullet_list ||
        node.type === ordered_list ||
        node.type === todo_list
      ) {
        inList = true;
        currentListType = node.type;
        break;
      }
      depth--;
    }

    if (inTodoItem) {
      return;
    }

    if (inList) {
      if (currentListType === listType) {
        const listItemType =
          listType === todo_list ? 'todo_list_item' : 'list_item';
        liftListItem(workingState.schema.nodes[listItemType])(
          workingState,
          this.editorView.dispatch,
          this.editorView
        );
      } else {
        this.convertListType(currentListType, listType, workingState);
      }
    } else {
      wrapInList(listType)(
        workingState,
        this.editorView.dispatch,
        this.editorView
      );
    }

    this.focusEditor();
  }

  private convertListType(currentListType: any, newListType: any, state: any) {
    if (!this.editorView) return;

    const { $from } = state.selection;
    const tr = state.tr;

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

    const newListItemType =
      newListType === state.schema.nodes.todo_list
        ? 'todo_list_item'
        : 'list_item';

    const newListItems: any[] = [];
    listNode.forEach((item: any, offset: number, index: number) => {
      if (
        item.type.name === 'todo_list_item' ||
        item.type.name === 'list_item'
      ) {
        const newItem = state.schema.nodes[newListItemType].create(
          newListItemType === 'todo_list_item'
            ? { checked: item.attrs.checked || false }
            : {},
          item.content
        );
        newListItems.push(newItem);
      }
    });

    const newList = newListType.create({}, newListItems);

    tr.replaceWith(listPos, listPos + listNode.nodeSize, newList);

    this.editorView.dispatch(tr);
  }

  onCodeBlock() {
    if (!this.editorView) return;
    const { state } = this.editorView;
    const { from, to } = state.selection;
    const codeType = state.schema.nodes['code_block'];

    if (from === to) {
      const $from = state.selection.$from;
      const parent = $from.parent;
      const pos = $from.pos;
      const start = $from.start();
      const end = $from.end();

      const isEmpty = parent.textContent.trim() === '' && pos === start;

      let tr = state.tr;
      let newPos = pos;

      if (isEmpty) {
        const codeNode = codeType.create({ language: 'ts', wrapped: false });
        tr = tr.replaceWith(start - 1, end + 1, codeNode);
        newPos = start;
      } else {
        const endOfLine = $from.end();
        tr = tr.insertText('\n', endOfLine);
        newPos = endOfLine + 1;

        const codeNode = codeType.create({ language: 'ts', wrapped: false });
        tr = tr.insert(newPos, codeNode);
      }

      tr = tr.setSelection(TextSelection.near(tr.doc.resolve(newPos + 1)));
      this.editorView.dispatch(tr.scrollIntoView());
    } else {
      let joined = '';
      state.doc.nodesBetween(from, to, (node) => {
        if (node.isTextblock) {
          if (joined) joined += '\n';
          joined += node.textContent || '';
        }
      });

      const codeNode = codeType.create(
        { language: 'ts', wrapped: false },
        state.schema.text(joined)
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
        const linkMark = node.marks.find(
          (mark) => mark.type === state.schema.marks['link']
        );
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

    const hasLinkMark = state.doc.rangeHasMark(
      from,
      to,
      state.schema.marks['link']
    );

    if (hasLinkMark) {
      let linkHref = '';

      for (let pos = from; pos < to; pos++) {
        const node = state.doc.nodeAt(pos);
        if (node) {
          const linkMark = node.marks.find(
            (mark) => mark.type === state.schema.marks['link']
          );
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
      const linkMark = node.marks.find(
        (mark) => mark.type === state.schema.marks['link']
      );
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

    setTimeout(() => {
      this.updateInlineToolbar();
    }, 0);
  }

  getCurrentColor(): string {
    if (!this.editorView) return '#FFFFFFCC';
    const { state } = this.editorView;
    const { from } = state.selection;
    const { color: colorMark } = state.schema.marks;

    const stored = state.storedMarks;
    if (stored) {
      const colorStoredMark = stored.find((mark) => mark.type === colorMark);
      if (colorStoredMark && colorStoredMark.attrs['color']) {
        return colorStoredMark.attrs['color'];
      }
    }

    const node = state.doc.nodeAt(from);
    if (node) {
      const colorMarkAtPos = node.marks.find((mark) => mark.type === colorMark);
      if (colorMarkAtPos && colorMarkAtPos.attrs['color']) {
        return colorMarkAtPos.attrs['color'];
      }
    }

    const { to } = state.selection;
    if (from !== to) {
      let foundColor: string | null = null;
      state.doc.nodesBetween(from, to, (node, pos) => {
        if (foundColor) return false;
        node.marks.forEach((mark) => {
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
        const colorMarkAtPrev = prevNode.marks.find(
          (mark) => mark.type === colorMark
        );
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

        const isEmpty = parent.textContent.trim() === '' && pos === start;

        let tr = state.tr;
        let newPos = pos;

        if (isEmpty) {
          const dividerNode = horizontalRule.create();
          const paragraphNode = paragraph.create();
          tr = tr.replaceWith(start - 1, end + 1, [dividerNode, paragraphNode]);
          newPos = start + dividerNode.nodeSize;
        } else {
          const dividerNode = horizontalRule.create();
          const paragraphNode = paragraph.create();
          tr = tr.insert(from, [dividerNode, paragraphNode]);
          newPos = from + dividerNode.nodeSize + 1;
        }

        tr = tr.setSelection(TextSelection.near(tr.doc.resolve(newPos)));
        this.editorView.dispatch(tr);
        this.editorView.focus();
      }
    } else if (blockType === 'quote') {
      const blockquote = state.schema.nodes['blockquote'];
      if (blockquote) {
        const $from = state.selection.$from;
        const parent = $from.parent;
        const pos = $from.pos;
        const start = $from.start();
        const end = $from.end();

        const isEmpty = parent.textContent.trim() === '' && pos === start;

        let tr = state.tr;
        let newPos = pos;

        if (isEmpty) {
          const paragraph = state.schema.nodes['paragraph'];
          const paragraphNode = paragraph.create();
          const blockquoteNode = blockquote.create({}, paragraphNode);
          tr = tr.replaceWith(start - 1, end + 1, blockquoteNode);
          newPos = start;
        } else {
          const paragraph = state.schema.nodes['paragraph'];
          const paragraphNode = paragraph.create();
          const blockquoteNode = blockquote.create({}, paragraphNode);
          tr = tr.insert(from, blockquoteNode);
          newPos = from + 1;
        }

        tr = tr.setSelection(TextSelection.near(tr.doc.resolve(newPos)));
        this.editorView.dispatch(tr);
        this.editorView.focus();
      }
    }
  }

  onAt() {
    if (!this.editorView) return;
    const { state } = this.editorView;
    const { from } = state.selection;
    const tr = state.tr.insertText('@', from);
    this.editorView.dispatch(tr);
    this.editorView.focus();
  }

  onFileUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    const validTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      'video/mp4',
      'video/quicktime',
      'video/webm',
      'video/avi',
      'video/mov',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv',
      'application/rtf',
      'application/zip',
      'application/x-rar-compressed',
      'application/x-7z-compressed',
      'application/x-tar',
      'application/gzip',
      'text/javascript',
      'text/typescript',
      'text/css',
      'text/html',
      'application/json',
      'text/xml',
      'application/xml',
    ];

    if (!validTypes.includes(file.type)) {
      alert(
        'Please select a valid media file (images, videos, documents, archives, or code files)'
      );
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      alert('File size must be less than 50MB');
      return;
    }

    this.insertMediaNode(file);
  }

  private async insertMediaNode(file: File) {
    if (!this.editorView) return;

    const { state } = this.editorView;
    const { from } = state.selection;

    let type: 'image' | 'video' | 'document';
    if (file.type.startsWith('image/')) {
      type = 'image';
    } else if (file.type.startsWith('video/')) {
      type = 'video';
    } else {
      type = 'document';
    }

    const url = URL.createObjectURL(file);

    const { width, height } = await this.calculateSmartDimensions(
      file,
      type,
      url
    );

    const mediaNode = state.schema.nodes['media'].create({
      src: url,
      alt: file.name,
      type: type,
      uploading: true,
      width: width,
      height: height,
      size: file.size,
    });

    const tr = state.tr.insert(from, mediaNode);
    this.editorView.dispatch(tr);

    this.simulateMediaUpload(file, url, type, width, height);
  }

  private calculateSmartDimensions(
    file: File,
    type: 'image' | 'video' | 'document',
    url: string
  ): Promise<{ width: number; height: number }> {
    return new Promise((resolve) => {
      if (type === 'image') {
        const img = new Image();

        img.onload = () => {
          const maxWidth = 800;
          const maxHeight = 600;
          
          let width = img.naturalWidth;
          let height = img.naturalHeight;

          if (width <= maxWidth && height <= maxHeight) {
            resolve({ width, height });
          } else {
            const aspectRatio = width / height;

            if (width > maxWidth) {
              width = maxWidth;
              height = width / aspectRatio;
            }

            if (height > maxHeight) {
              height = maxHeight;
              width = height * aspectRatio;
            }

            resolve({ width, height });
          }
        };

        img.onerror = () => {
          resolve({ width: 800, height: 600 });
        };

        img.src = url;
      } else if (type === 'video') {
        resolve({ width: 600, height: 400 });
      } else {
        resolve({ width: 800, height: 80 });
      }
    });
  }

  private calculateMediaDimensions(
    file: File,
    type: 'image' | 'video'
  ): { width: number; height: number } {
    let width = 300;
    let height = 200;

    if (type === 'image') {
      const maxWidth = 800;
      const maxHeight = 600;
      width = maxWidth;
      height = maxHeight;
    } else if (type === 'video') {
      width = 600;
      height = 400;
    }

    return { width, height };
  }

  private simulateMediaUpload(
    file: File,
    url: string,
    type: 'image' | 'video' | 'document',
    width: number,
    height: number
  ) {
    this.mediaUpload.emit({
      file,
      type: type,
      url: url,
    });
  }

  public updateMediaWithUploadedUrl(uploadedUrl: string) {
    if (!this.editorView) return;

    const { state } = this.editorView;

    let mediaPos = -1;
    state.doc.descendants((node, pos) => {
      if (node.type.name === 'media' && node.attrs['uploading'] === true) {
        mediaPos = pos;
        return false;
      }
      return true; 
    });

    if (mediaPos !== -1) {
      const tr = state.tr.setNodeMarkup(mediaPos, undefined, {
        ...state.doc.nodeAt(mediaPos)?.attrs,
        src: uploadedUrl,
        uploading: false,
      });
      this.editorView.dispatch(tr);
    }
  }

  private generateRealImageUrl(
    file: File,
    width: number,
    height: number
  ): string {
    const imageWidth = Math.floor(width);
    const imageHeight = Math.floor(height);
    return `https://picsum.photos/${imageWidth}/${imageHeight}?random=${Date.now()}`;
  }

  private handleContentChange() {
    if (!this.editorView) return;

    const content = this.getCurrentContent();

    this.onChange.emit(content);
  }

  private getCurrentContent(): string {
    if (!this.editorView) return '';

    const { state } = this.editorView;
    const { doc } = state;

    if (this.format() === 'html') {
      return this.docToHTML(doc);
    } else {
      return JSON.stringify(doc.toJSON());
    }
  }


  private loadInitialContent() {
    if (!isPlatformBrowser(this.platformId)) return;

    const inputValue = this.value();
    if (inputValue) {
      this.loadContent(inputValue);
      return;
    }
  }

  private loadContent(content: string) {
    if (!this.editorView) return;

    try {
      let doc;
      if (this.format() === 'html') {
        doc = this.htmlToDoc(content);
      } else {
        const json = JSON.parse(content);
        doc = this.editorView.state.schema.nodeFromJSON(json);
      }

      if (doc) {
        const tr = this.editorView.state.tr.replaceWith(
          0,
          this.editorView.state.doc.content.size,
          doc.content
        );
        this.editorView.dispatch(tr);
      }
    } catch (error) {
    }
  }

  private htmlToDoc(html: string): any {
    const parser = new DOMParser();
    const dom = parser.parseFromString(html, 'text/html');

    const textContent = dom.body.textContent || '';
    return this.editorView!.state.schema.nodes['paragraph'].create(
      {},
      this.editorView!.state.schema.text(textContent)
    );
  }

  private docToHTML(doc: any): string {
    let html = '';
    doc.descendants((node: any) => {
      if (node.type.name === 'paragraph') {
        const align = node.attrs.align || 'left';
        const style = align !== 'left' ? ` style="text-align: ${align}"` : '';
        html += `<p${style}>${this.nodeToHTML(node)}</p>`;
      } else if (node.type.name === 'heading') {
        const level = node.attrs.level;
        const align = node.attrs.align || 'left';
        const style = align !== 'left' ? ` style="text-align: ${align}"` : '';
        html += `<h${level}${style}>${this.nodeToHTML(node)}</h${level}>`;
      } else if (node.type.name === 'code_block') {
        html += `<pre><code>${this.nodeToHTML(node)}</code></pre>`;
      } else if (node.type.name === 'horizontal_rule') {
        html += '<hr>';
      } else if (node.type.name === 'blockquote') {
        html += `<blockquote>${this.nodeToHTML(node)}</blockquote>`;
      } else if (node.type.name === 'bullet_list') {
        html += `<ul>${this.nodeToHTML(node)}</ul>`;
      } else if (node.type.name === 'ordered_list') {
        const order = node.attrs.order || 1;
        const start = order !== 1 ? ` start="${order}"` : '';
        html += `<ol${start}>${this.nodeToHTML(node)}</ol>`;
      } else if (node.type.name === 'todo_list') {
        html += `<ul class="todo__list">${this.nodeToHTML(node)}</ul>`;
      } else if (node.type.name === 'list_item') {
        html += `<li>${this.nodeToHTML(node)}</li>`;
      } else if (node.type.name === 'todo_list_item') {
        const checked = node.attrs.checked ? 'checked' : '';
        html += `<li class="todo__list__item"><div class="todo__checkbox__wrapper"><input type="checkbox" class="todo__checkbox__input" ${checked} style="display: none;"><div class="todo__checkbox ${
          checked ? 'todo__checkbox--checked' : ''
        }" data-checked="${checked}"></div></div><div class="todo__content">${this.nodeToHTML(
          node
        )}</div></li>`;
      } else if (node.type.name === 'media') {
        const { src, alt, type, width, height } = node.attrs;
        if (type === 'image') {
          html += `<div data-media="true" data-src="${src}" data-alt="${alt}" data-type="${type}" data-width="${width}" data-height="${height}"><img src="${src}" alt="${alt}" style="max-width: ${width}px; max-height: ${height}px;"></div>`;
        } else if (type === 'video') {
          html += `<div data-media="true" data-src="${src}" data-alt="${alt}" data-type="${type}" data-width="${width}" data-height="${height}"><video src="${src}" controls style="max-width: ${width}px; max-height: ${height}px;"></video></div>`;
        } else {
          html += `<div data-media="true" data-src="${src}" data-alt="${alt}" data-type="${type}" data-width="${width}" data-height="${height}"><a href="${src}" target="_blank">${alt}</a></div>`;
        }
      }
      return true;
    });
    return html;
  }

  private nodeToHTML(node: any): string {
    if (node.isText) {
      let text = node.text;
      if (node.marks) {
        node.marks.forEach((mark: any) => {
          switch (mark.type.name) {
            case 'bold':
              text = `<strong>${text}</strong>`;
              break;
            case 'italic':
              text = `<em>${text}</em>`;
              break;
            case 'underline':
              text = `<u>${text}</u>`;
              break;
            case 'strike':
              text = `<s>${text}</s>`;
              break;
            case 'code':
              text = `<code>${text}</code>`;
              break;
            case 'sup':
              text = `<sup>${text}</sup>`;
              break;
            case 'sub':
              text = `<sub>${text}</sub>`;
              break;
            case 'color':
              text = `<span style="color: ${mark.attrs.color}">${text}</span>`;
              break;
            case 'link':
              text = `<a href="${mark.attrs.href}" target="_blank" rel="noopener noreferrer">${text}</a>`;
              break;
          }
        });
      }
      return text;
    } else if (node.content) {
      return node.content.map((child: any) => this.nodeToHTML(child)).join('');
    }
    return '';
  }

  public getContent(): string {
    return this.getCurrentContent();
  }

  public setContent(content: string) {
    this.loadContent(content);
  }

  public clearContent() {
    if (!this.editorView) return;

    const tr = this.editorView.state.tr.replaceWith(
      0,
      this.editorView.state.doc.content.size,
      this.editorView.state.schema.nodes['paragraph'].create()
    );
    this.editorView.dispatch(tr);
  }
}
