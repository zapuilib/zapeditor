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
import { setBlockType, toggleMark } from 'prosemirror-commands';
import { redo, undo } from 'prosemirror-history';
import { EditorView } from 'prosemirror-view';
import { wrapInList, liftListItem } from 'prosemirror-schema-list';
import { TextSelection } from 'prosemirror-state';

import { HubEditorToolbar, InlineToolbarComponent } from '../components';
import { BaseEditor } from './hub-editor.directives';
import { MentionUser } from '../interfaces';

@Component({
  selector: 'zap-editor',
  imports: [HubEditorToolbar, InlineToolbarComponent],
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
        (block)="onBlock($event)"></hub-editor-toolbar>
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
        (textFormatting)="onTextFormatting($event)"></inline-toolbar>
    }
  </div>`,
  styleUrl: './hub-editor.component.scss',
})
export class ZapEditor extends BaseEditor implements AfterViewInit {
  @ViewChild('editor') editor!: ElementRef<HTMLDivElement>;
  toolbar = input<'inline' | 'default'>('default');
  usersInput = model<MentionUser[]>([]);
  mentionSearch = output<string>();
  protected readonly platformId = inject(PLATFORM_ID);
  protected readonly cdr = inject(ChangeDetectorRef);
  href = signal<string>('');
  text = signal<string>('');
  isOnLink = signal<boolean>(false);
  
  // Inline toolbar state
  showInlineToolbar = signal<boolean>(false);
  inlineToolbarPosition = signal<{ x: number; y: number; position?: 'top' | 'bottom' }>({ x: 0, y: 0, position: 'top' });

  constructor() {
    super();
    
    effect(() => {
      this.users = this.usersInput();
      this.updateMentionUsers(this.users);
    });
    
    this.onMentionSearch = (query: string) => {
      this.mentionSearch.emit(query);
    };
  }

  ngAfterViewInit() {
    if (!isPlatformBrowser(this.platformId)) return;
    this.initializeEditor();
    this.setupInlineToolbarEvents();
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
      }
    });
  }

  private setupInlineToolbarEvents() {
    if (!isPlatformBrowser(this.platformId)) return;
    
    // Listen for scroll events to update toolbar position
    window.addEventListener('scroll', () => {
      if (this.showInlineToolbar()) {
        this.updateInlineToolbar();
      }
    }, { passive: true });
    
    // Listen for resize events
    window.addEventListener('resize', () => {
      if (this.showInlineToolbar()) {
        this.updateInlineToolbar();
      }
    }, { passive: true });
    
    // Listen for clicks outside to close toolbar
    document.addEventListener('click', (event) => {
      if (this.showInlineToolbar()) {
        const target = event.target as Element;
        const editorElement = this.editor?.nativeElement;
        
        // Check if click is outside the editor
        if (editorElement && !editorElement.contains(target)) {
          this.showInlineToolbar.set(false);
        }
      }
    }, { passive: true });
  }

  private updateInlineToolbar() {
    if (this.toolbar() !== 'inline' || !this.editorView) {
      this.showInlineToolbar.set(false);
      return;
    }

    const { state } = this.editorView;
    const { selection } = state;
    const { from, to } = selection;

    // Only show toolbar if there's a text selection
    if (from === to) {
      this.showInlineToolbar.set(false);
      return;
    }

    try {
      // Get the coordinates of the selection
      let startCoords, endCoords;
      
      // For select all, find the first and last visible text positions
      if (from === 0 && to === state.doc.content.size) {
        // This is likely a select all - find first and last visible text
        let firstTextPos = 0;
        let lastTextPos = state.doc.content.size;
        
        // Find the first text position
        state.doc.descendants((node, pos) => {
          if (node.isText && node.text && node.text.length > 0) {
            firstTextPos = pos;
            return false; // Stop searching
          }
          return true;
        });
        
        // Find the last text position
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
      
      // Get editor container bounds
      const editorRect = this.editor.nativeElement.getBoundingClientRect();
      
      // Get the current text alignment - handle multi-node selections
      const $from = state.selection.$from;
      let textAlign = 'left'; // default
      
      // For multi-node selections (like select all), check the first text block
      if (from !== to) {
        // Find the first text block in the selection
        state.doc.nodesBetween(from, to, (node, pos) => {
          if (node.isTextblock && (node.type.name === 'paragraph' || node.type.name === 'heading')) {
            textAlign = node.attrs['align'] || 'left';
            return false; // Stop after finding the first text block
          }
          return true;
        });
      } else {
        // Single cursor position
        const parent = $from.parent;
        textAlign = parent.attrs['align'] || 'left';
      }
      
      // For multi-line selections, use the first visible line
      let selectionCenterX, selectionTop, selectionBottom;
      
      if (startCoords.top === endCoords.top) {
        // Single line selection
        selectionTop = startCoords.top;
        selectionBottom = startCoords.bottom;
        
        // Position based on text alignment
        if (textAlign === 'center') {
          selectionCenterX = (startCoords.left + endCoords.left) / 2;
        } else if (textAlign === 'right') {
          selectionCenterX = endCoords.left;
        } else {
          // left or justify
          selectionCenterX = startCoords.left;
        }
      } else {
        // Multi-line selection - use the first line that's visible
        selectionTop = startCoords.top;
        selectionBottom = startCoords.bottom;
        
        // For multi-line, position based on alignment of the first line
        if (textAlign === 'center') {
          selectionCenterX = startCoords.left + (startCoords.right - startCoords.left) / 2;
        } else if (textAlign === 'right') {
          selectionCenterX = startCoords.right;
        } else {
          // left or justify
          selectionCenterX = startCoords.left;
        }
      }
      
      // Toolbar dimensions (approximate)
      const toolbarWidth = 300; // Approximate width
      const toolbarHeight = 40; // Approximate height
      const offset = 1; // Distance from selection - very close positioning
      
      let x = selectionCenterX;
      let y = selectionTop;
      let position: 'top' | 'bottom' = 'top'; // Default position
      
      // Always position on top - no exceptions, with additional 100px offset
      y = selectionTop - toolbarHeight - offset + 40;
      position = 'top';
      
      // Adjust horizontal positioning based on text alignment
      if (textAlign === 'center') {
        // Center the toolbar
        if (x - toolbarWidth / 2 < editorRect.left) {
          x = editorRect.left + toolbarWidth / 2 + offset;
        } else if (x + toolbarWidth / 2 > editorRect.right) {
          x = editorRect.right - toolbarWidth / 2 - offset;
        }
      } else if (textAlign === 'right') {
        // Align toolbar to the right
        x = Math.min(x, editorRect.right - toolbarWidth / 2 - offset);
        if (x - toolbarWidth / 2 < editorRect.left) {
          x = editorRect.left + toolbarWidth / 2 + offset;
        }
      } else {
        // left or justify - align toolbar to the left
        x = Math.max(x, editorRect.left + toolbarWidth / 2 + offset);
        if (x + toolbarWidth / 2 > editorRect.right) {
          x = editorRect.right - toolbarWidth / 2 - offset;
        }
      }
      
      this.inlineToolbarPosition.set({ x, y, position });
      this.showInlineToolbar.set(true);
    } catch (error) {
      // If there's an error getting coordinates, hide the toolbar
      console.warn('Error updating inline toolbar position:', error);
      this.showInlineToolbar.set(false);
    }
  }

  private updateLinkState() {
    this.isOnLink.set(this.isCursorOnLink());
  }

  // Formatting state checkers
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
    
    // Update toolbar position after formatting change
    setTimeout(() => {
      this.updateInlineToolbar();
    }, 0);
  }

  onItalic() {
    if (!this.editorView) return;
    const { italic } = this.editorView.state.schema.marks;
    toggleMark(italic)(this.editorView.state, this.editorView.dispatch);
    this.editorView.focus();
    
    // Update toolbar position after formatting change
    setTimeout(() => {
      this.updateInlineToolbar();
    }, 0);
  }

  onUnderline() {
    if (!this.editorView) return;
    const { underline } = this.editorView.state.schema.marks;
    toggleMark(underline)(this.editorView.state, this.editorView.dispatch);
    this.editorView.focus();
    
    // Update toolbar position after formatting change
    setTimeout(() => {
      this.updateInlineToolbar();
    }, 0);
  }

  onStrikethrough() {
    if (!this.editorView) return;
    const { strike } = this.editorView.state.schema.marks;
    toggleMark(strike)(this.editorView.state, this.editorView.dispatch);
    this.editorView.focus();
    
    // Update toolbar position after formatting change
    setTimeout(() => {
      this.updateInlineToolbar();
    }, 0);
  }

  onCode() {
    if (!this.editorView) return;
    const { code } = this.editorView.state.schema.marks;
    toggleMark(code)(this.editorView.state, this.editorView.dispatch);
    this.editorView.focus();
    
    // Update toolbar position after formatting change
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
      
      // Update toolbar position after formatting change
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
      
      // Update toolbar position after formatting change
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
      
      // Update toolbar position after alignment change
      setTimeout(() => {
        this.updateInlineToolbar();
      }, 0);
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

  onListInline(event: any) {
    if (!this.editorView) return;

    const { state } = this.editorView;
    const { bullet_list, ordered_list, todo_list, todo_list_item } = state.schema.nodes;

    let listType;
    if (event === 'bullet') listType = bullet_list;
    else if (event === 'numbered') listType = ordered_list;
    else if (event === 'todo') listType = todo_list;
    else return;

    // If there's a text selection, handle it properly
    let workingState = state;
    if (state.selection.from !== state.selection.to) {
      // Check if this is a "select all" (from=0, to=doc.content.size)
      const isSelectAll = state.selection.from === 0 && state.selection.to === state.doc.content.size;
      
      if (isSelectAll) {
        // For select all, just collapse to the beginning of the document
        // This will make the list command work on the first paragraph
        const tr = state.tr.setSelection(TextSelection.create(state.doc, 1));
        workingState = state.apply(tr);
      } else {
        // For regular selections, collapse to the end
        const tr = state.tr.setSelection(TextSelection.create(state.doc, state.selection.to));
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
        liftListItem(workingState.schema.nodes[listItemType])(workingState, this.editorView.dispatch, this.editorView);
      } else {
        // Different list type - convert while maintaining nesting
        this.convertListType(currentListType, listType, workingState);
      }
    } else {
      wrapInList(listType)(workingState, this.editorView.dispatch, this.editorView);
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
    
    // Update toolbar position after color change
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
    } else if (blockType === 'quote') {
      const blockquote = state.schema.nodes['blockquote'];
      if (blockquote) {
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
          // Replace current empty paragraph with blockquote containing a paragraph
          const paragraph = state.schema.nodes['paragraph'];
          const paragraphNode = paragraph.create();
          const blockquoteNode = blockquote.create({}, paragraphNode);
          tr = tr.replaceWith(start - 1, end + 1, blockquoteNode);
          newPos = start;
        } else {
          // Insert blockquote with paragraph at current position
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
    //add new @ on the editor so it trigger the mention plugin
    const { state } = this.editorView;
    const { from } = state.selection;
    const tr = state.tr.insertText('@', from);
    this.editorView.dispatch(tr);
    this.editorView.focus();
  }
}