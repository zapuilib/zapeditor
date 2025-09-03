import { Directive } from '@angular/core';
import { MarkSpec, Schema } from 'prosemirror-model';
import { EditorView } from 'prosemirror-view';
import { autoLinkPlugin, linkHoverPlugin, placeholderPlugin, codeMirrorPlugin, addSurrounding, markdownPlugin, mentionPlugin, triggerMention, createTodoListPlugin, createTodoInputRulesPlugin, createTodoKeymapPlugin } from '../plugins';
import { redo, undo } from 'prosemirror-history';
import { history } from 'prosemirror-history';
import { EditorState, TextSelection } from 'prosemirror-state';
import { baseKeymap, setBlockType, toggleMark } from 'prosemirror-commands';
import { keymap } from 'prosemirror-keymap';


@Directive({ selector: '[hubEditor]' })
export class BaseEditor {
  protected editorView: EditorView | null = null;

  protected schema = new Schema({
    nodes: {
      doc: { content: 'block+' },
      paragraph: {
        group: 'block',
        content: 'inline*',
        attrs: { align: { default: 'left' } },
        parseDOM: [
          {
            tag: 'p',
            getAttrs: (dom: any) => ({
              align: ((dom as HTMLElement).style?.textAlign || 'left') as string,
            }),
          },
        ],
        toDOM(node) {
          const align = (node.attrs['align'] || 'left') as string;
          const attrs: Record<string, any> = {};
          if (align && align !== 'left') attrs['style'] = `text-align: ${align}`;
          return ['p', attrs, 0] as any;
        },
      },
      text: { group: 'inline' },
      heading: {
        attrs: { level: { default: 1 }, align: { default: 'left' } },
        content: 'inline*',
        group: 'block',
        defining: true,
        parseDOM: [
          {
            tag: 'h1',
            getAttrs: (dom: any) => ({
              level: 1,
              align: ((dom as HTMLElement).style?.textAlign || 'left') as string,
            }),
          },
          {
            tag: 'h2',
            getAttrs: (dom: any) => ({
              level: 2,
              align: ((dom as HTMLElement).style?.textAlign || 'left') as string,
            }),
          },
          {
            tag: 'h3',
            getAttrs: (dom: any) => ({
              level: 3,
              align: ((dom as HTMLElement).style?.textAlign || 'left') as string,
            }),
          },
          {
            tag: 'h4',
            getAttrs: (dom: any) => ({
              level: 4,
              align: ((dom as HTMLElement).style?.textAlign || 'left') as string,
            }),
          },
          {
            tag: 'h5',
            getAttrs: (dom: any) => ({
              level: 5,
              align: ((dom as HTMLElement).style?.textAlign || 'left') as string,
            }),
          },
          {
            tag: 'h6',
            getAttrs: (dom: any) => ({
              level: 6,
              align: ((dom as HTMLElement).style?.textAlign || 'left') as string,
            }),
          },
        ],
        toDOM(node) {
          const level = node.attrs['level'] as number;
          const align = (node.attrs['align'] || 'left') as string;
          const attrs: Record<string, any> = {};
          if (align && align !== 'left') attrs['style'] = `text-align: ${align}`;
          return ['h' + level, attrs, 0] as any;
        },
      },
      list_item: {
        content: '(paragraph | heading) (bullet_list | ordered_list | todo_list | block)*',
        parseDOM: [{ tag: 'li' }],
        toDOM() {
          return ['li', 0] as any;
        },
      },
      bullet_list: {
        group: 'block',
        content: 'list_item+',
        parseDOM: [{ tag: 'ul' }],
        toDOM() {
          return ['ul', 0] as any;
        },
      },
      ordered_list: {
        group: 'block',
        content: 'list_item+',
        attrs: { order: { default: 1 } },
        parseDOM: [
          {
            tag: 'ol',
            getAttrs(dom: any) {
              const el = dom as HTMLOListElement;
              return { order: Number(el.getAttribute('start') || 1) };
            },
          },
        ],
        toDOM(node) {
          const attrs: any = {};
          if (node.attrs['order'] && node.attrs['order'] !== 1) attrs.start = node.attrs['order'];
          return ['ol', attrs, 0] as any;
        },
      },
      todo_list: {
        group: 'block',
        content: 'todo_list_item+',
        parseDOM: [{ tag: 'ul.todo__list' }],
        toDOM() {
          return ['ul', { class: 'todo__list' }, 0] as any;
        },
      },
      todo_list_item: {
        content: '(paragraph | heading) block*',
        attrs: { checked: { default: false } },
        parseDOM: [
          {
            tag: 'li.todo__list__item',
            getAttrs(dom: any) {
              const el = dom as HTMLElement;
              const checkbox = el.querySelector('input[type="checkbox"]') as HTMLInputElement;
              return { checked: checkbox ? checkbox.checked : false };
            },
          },
        ],
        toDOM(node) {
          const checked = node.attrs['checked'];
          return [
            'li',
            { class: 'todo__list__item' },
            [
              'div',
              { class: 'todo__checkbox__wrapper' },
              [
                'input',
                {
                  type: 'checkbox',
                  class: 'todo__checkbox__input',
                  checked: checked ? '' : undefined,
                  style: 'display: none;',
                },
              ],
              [
                'div',
                { 
                  class: `todo__checkbox ${checked ? 'todo__checkbox--checked' : ''}`,
                  'data-checked': checked ? 'true' : 'false'
                },
              ],
            ],
            ['div', { class: 'todo__content' }, 0],
          ] as any;
        },
      },
      code_block: {
        group: 'block',
        content: 'text*',
        code: true,
        defining: true,
        attrs: { 
          language: { default: 'ts' },
          wrapped: { default: false }
        },
        parseDOM: [{ tag: 'pre', preserveWhitespace: 'full' }],
        toDOM() {
          return ['pre', ['code', 0]];
        },
      },
      horizontal_rule: {
        group: 'block',
        content: '',
        selectable: true,
        atom: true,
        parseDOM: [{ tag: 'hr' }],
        toDOM() {
          return ['div', { class: 'hub__editor__divider__wrapper' }, ['hr', { class: 'hub__editor__divider' }]];
        },
      },
      mention: {
        group: 'inline',
        inline: true,
        atom: true,
        isolating: true,
        defining: false,
        selectable: false,
        draggable: false,
        attrs: {
          id: { validate: 'string' },
          name: { validate: 'string' },
          avatar: { default: null, validate: 'string|null' },
          email: { default: null, validate: 'string|null' },
        },
        parseDOM: [
          {
            tag: 'span[data-mention-id]',
            getAttrs(dom: HTMLElement) {
              return {
                id: dom.getAttribute('data-mention-id'),
                name: dom.getAttribute('data-mention-name'),
                avatar: dom.getAttribute('data-mention-avatar'),
                email: dom.getAttribute('data-mention-email'),
              };
            },
          },
        ],
        toDOM(node) {
          const { id, name, avatar, email } = node.attrs;
          return [
            'span',
            {
              class: 'mention',
              'data-mention-id': id,
              'data-mention-name': name,
              'data-mention-avatar': avatar,
              'data-mention-email': email,
            },
            `@${name}`,
          ];
        },
      },
    },
    marks: {
      bold: {
        parseDOM: [{ tag: 'strong' }],
        toDOM() {
          return ['strong', 0];
        },
      },
      italic: {
        parseDOM: [{ tag: 'em' }],
        toDOM() {
          return ['em', 0];
        },
      },
      underline: {
        parseDOM: [{ tag: 'u' }],
        toDOM() {
          return ['u', 0];
        },
      },
      strike: {
        parseDOM: [{ tag: 's' }, { tag: 'strike' }, { tag: 'del' }],
        toDOM() {
          return ['s', 0] as any;
        },
      },
      code: {
        parseDOM: [{ tag: 'code' }],
        toDOM() {
          return ['code', 0] as any;
        },
      },
      sup: {
        parseDOM: [{ tag: 'sup' }],
        toDOM() {
          return ['sup', 0] as any;
        },
      },
      sub: {
        parseDOM: [{ tag: 'sub' }],
        toDOM() {
          return ['sub', 0] as any;
        },
      },
      color: {
        attrs: { color: {} },
        parseDOM: [
          {
            style: 'color',
            getAttrs: (value: string) => ({ color: value }),
          },
        ],
        toDOM(node) {
          const color = (node.attrs['color'] || '') as string;
          const attrs: Record<string, any> = color ? { style: `color: ${color}` } : {};
          return ['span', attrs, 0] as any;
        },
      },

      link: {
        attrs: {
          href: { validate: 'string' },
          title: { default: null, validate: 'string|null' },
        },
        inclusive: false,
        parseDOM: [
          {
            tag: 'a[href]',
            getAttrs(dom: HTMLElement) {
              return {
                href: dom.getAttribute('href'),
                title: dom.getAttribute('title'),
              };
            },
          },
        ],
        toDOM(node) {
          const { href, title } = node.attrs;
          return ['a', { href, title, target: '_blank', rel: 'noopener noreferrer' }, 0];
        },
      } as MarkSpec,

    },
  });

  protected getState(): EditorState {
    const state = EditorState.create({
      schema: this.schema,
      plugins: [
        placeholderPlugin('Start writing something'),
        autoLinkPlugin(),
        linkHoverPlugin(),
        codeMirrorPlugin(),
        addSurrounding(),
        markdownPlugin(this.schema),
        mentionPlugin(),
        createTodoListPlugin(),
        createTodoInputRulesPlugin(this.schema),
        createTodoKeymapPlugin(this.schema, this.editorView),
        history(),
        keymap({
          'Mod-z': undo,
          'Shift-Mod-z': redo,
          'Mod-b': toggleMark(this.schema.marks.bold),
          'Mod-i': toggleMark(this.schema.marks.italic),
          'Mod-u': toggleMark(this.schema.marks.underline),
          'Mod-Alt-0': (state, dispatch, view) =>
            setBlockType(state.schema.nodes['heading'], { level: 0 })(state, dispatch, view),
          'Mod-Alt-1': (state, dispatch, view) =>
            setBlockType(state.schema.nodes['heading'], { level: 1 })(state, dispatch, view),
          'Mod-Alt-2': (state, dispatch, view) =>
            setBlockType(state.schema.nodes['heading'], { level: 2 })(state, dispatch, view),
          'Mod-Alt-3': (state, dispatch, view) =>
            setBlockType(state.schema.nodes['heading'], { level: 3 })(state, dispatch, view),
          'Mod-Alt-4': (state, dispatch, view) =>
            setBlockType(state.schema.nodes['heading'], { level: 4 })(state, dispatch, view),
          'Mod-Alt-5': (state, dispatch, view) =>
            setBlockType(state.schema.nodes['heading'], { level: 5 })(state, dispatch, view),
          'Mod-Alt-6': (state, dispatch, view) =>
            setBlockType(state.schema.nodes['heading'], { level: 6 })(state, dispatch, view),
          'Mod-Shift-x': toggleMark(this.schema.marks.strike),
          'Mod-Shift-c': toggleMark(this.schema.marks.code),
          'Mod-Shift-s': toggleMark(this.schema.marks.sup),
          'Mod-Shift-b': toggleMark(this.schema.marks.sub),
          '@': (state, dispatch, view) => {
            if (view) {
              triggerMention(view);
            }
            return true;
          },
        }),
        keymap(baseKeymap),
      ],
    });
    return state;
  }
}
