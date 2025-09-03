import { Plugin } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import {
  EditorView as CodeMirror,
  keymap as cmKeymap,
  drawSelection,
} from '@codemirror/view';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { cpp } from '@codemirror/lang-cpp';
import { java } from '@codemirror/lang-java';
import { rust } from '@codemirror/lang-rust';
import { go } from '@codemirror/lang-go';
import { php } from '@codemirror/lang-php';
import { sql } from '@codemirror/lang-sql';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { markdown } from '@codemirror/lang-markdown';
import { json } from '@codemirror/lang-json';
import { xml } from '@codemirror/lang-xml';
import { yaml } from '@codemirror/lang-yaml';
import { defaultKeymap } from '@codemirror/commands';
import { syntaxHighlighting, HighlightStyle } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { exitCode } from 'prosemirror-commands';
import { undo, redo } from 'prosemirror-history';
import { TextSelection, Selection } from 'prosemirror-state';
import { keymap } from 'prosemirror-keymap';
import { Compartment } from '@codemirror/state';

const customHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: '#569cd6' },
  { tag: tags.controlKeyword, color: '#c586c0' },
  { tag: tags.operatorKeyword, color: '#569cd6' },
  { tag: tags.modifier, color: '#569cd6' },
  { tag: tags.self, color: '#569cd6' },
  { tag: tags.null, color: '#569cd6' },
  { tag: tags.atom, color: '#569cd6' },
  { tag: tags.bool, color: '#569cd6' },
  { tag: tags.string, color: '#ce9178' },
  { tag: tags.character, color: '#ce9178' },
  { tag: tags.content, color: '#ce9178' },
  { tag: tags.escape, color: '#d7ba7d' },
  { tag: tags.regexp, color: '#d16969' },
  { tag: tags.number, color: '#b5cea8' },
  { tag: tags.integer, color: '#b5cea8' },
  { tag: tags.float, color: '#b5cea8' },
  { tag: tags.comment, color: '#6a9955', fontStyle: 'italic' },
  { tag: tags.lineComment, color: '#6a9955', fontStyle: 'italic' },
  { tag: tags.blockComment, color: '#6a9955', fontStyle: 'italic' },
  { tag: tags.docComment, color: '#6a9955', fontStyle: 'italic' },
  { tag: tags.typeName, color: '#4ec9b0' },
  { tag: tags.className, color: '#4ec9b0' },
  { tag: tags.namespace, color: '#4ec9b0' },
  { tag: tags.macroName, color: '#4ec9b0' },
  { tag: tags.variableName, color: '#9cdcfe' },
  { tag: tags.propertyName, color: '#92c5f7' },
  { tag: tags.attributeName, color: '#92c5f7' },
  { tag: tags.function(tags.variableName), color: '#dcdcaa' },
  { tag: tags.function(tags.propertyName), color: '#dcdcaa' },
  { tag: tags.definition(tags.variableName), color: '#9cdcfe' },
  { tag: tags.definition(tags.propertyName), color: '#92c5f7' },
  { tag: tags.tagName, color: '#569cd6' },
  { tag: tags.attributeValue, color: '#ce9178' },
  { tag: tags.angleBracket, color: '#808080' },
  { tag: tags.operator, color: '#d4d4d4' },
  { tag: tags.punctuation, color: '#d4d4d4' },
  { tag: tags.separator, color: '#d4d4d4' },
  { tag: tags.bracket, color: '#ffd700' },
  { tag: tags.squareBracket, color: '#ffd700' },
  { tag: tags.paren, color: '#ffd700' },
  { tag: tags.brace, color: '#ffd700' },
  { tag: tags.meta, color: '#6a9955' },
  { tag: tags.annotation, color: '#6a9955' },
  { tag: tags.processingInstruction, color: '#6a9955' },      
  { tag: tags.url, color: '#ce9178', textDecoration: 'underline' },
  { tag: tags.link, color: '#ce9178', textDecoration: 'underline' },
  { tag: tags.heading, color: '#569cd6', fontWeight: 'bold' },
  { tag: tags.list, color: '#d4d4d4' },
  { tag: tags.quote, color: '#6a9955', fontStyle: 'italic' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: tags.strong, fontWeight: 'bold' },
  { tag: tags.strikethrough, textDecoration: 'line-through' },
  { tag: tags.monospace, fontFamily: 'Consolas, "Courier New", monospace' },
  { tag: tags.invalid, color: '#f44747', backgroundColor: '#1e3a8a' },
]);

const AVAILABLE_LANGUAGES = [
  { label: 'TypeScript', value: 'ts' },
  { label: 'JavaScript', value: 'js' },
  { label: 'Python', value: 'py' },
  { label: 'C++', value: 'cpp' },
  { label: 'Java', value: 'java' },
  { label: 'Rust', value: 'rust' },
  { label: 'Go', value: 'go' },
  { label: 'PHP', value: 'php' },
  { label: 'SQL', value: 'sql' },
  { label: 'HTML', value: 'html' },
  { label: 'CSS', value: 'css' },
  { label: 'Markdown', value: 'md' },
  { label: 'JSON', value: 'json' },
  { label: 'XML', value: 'xml' },
  { label: 'YAML', value: 'yaml' },
  { label: 'Shell', value: 'sh' },
  { label: 'Plain Text', value: 'text' },
];

function getLanguageSupport(language: string) {
  switch (language) {
    case 'ts':
    case 'js':
      return javascript({ typescript: true });
    case 'py':
      return python();
    case 'cpp':
      return cpp();
    case 'java':
      return java();
    case 'rust':
      return rust();
    case 'go':
      return go();
    case 'php':
      return php();
    case 'sql':
      return sql();
    case 'html':
      return html();
    case 'css':
      return css();
    case 'md':
      return markdown();
    case 'json':
      return json();
    case 'xml':
      return xml();
    case 'yaml':
      return yaml();
    default:
      return []; // No syntax highlighting for plain text and shell
  }
}

/**
 * CodeMirror node view for code blocks.
 * This plugin is used to render the code blocks in the editor.
 */
class CodeBlockView {
  private node: any;
  private view: EditorView;
  private getPos: () => number;
  private cm: CodeMirror;
  public dom: HTMLElement;
  private updating: boolean = false;
  private wrappingCompartment: Compartment;
  private languageCompartment: Compartment;
  private controlsContainer: HTMLElement;

  constructor(node: any, view: EditorView, getPos: () => number) {
    this.node = node;
    this.view = view;
    this.getPos = getPos;
    this.wrappingCompartment = new Compartment();
    this.languageCompartment = new Compartment();

    const isWrapped = node.attrs.wrapped === true;
    const language = node.attrs.language || 'ts';

    this.cm = new CodeMirror({
      doc: this.node.textContent,
      extensions: [
        cmKeymap.of([...this.codeMirrorKeymap(), ...defaultKeymap]),
        drawSelection(),
        syntaxHighlighting(customHighlightStyle),
        this.languageCompartment.of(getLanguageSupport(language)),
        this.wrappingCompartment.of(isWrapped ? CodeMirror.lineWrapping : []),
        CodeMirror.updateListener.of((update) => this.forwardUpdate(update)),
        CodeMirror.focusChangeEffect.of((state, focusing) => {
          if (focusing) {
            this.cm.focus();
          }
          return null;
        }),
      ],
    });

    const wrapper = document.createElement('div');
    wrapper.className = 'pm-codeblock';

    // Create toolbar container at the top
    this.controlsContainer = document.createElement('div');
    this.controlsContainer.className = 'codeblock-toolbar';

    const toolbarContent = document.createElement('div');
    toolbarContent.className = 'codeblock-tools-container';

    this.createLanguageSelector(toolbarContent);

    this.createActionButtons(toolbarContent);

    this.controlsContainer.appendChild(toolbarContent);
    wrapper.appendChild(this.controlsContainer);
    wrapper.appendChild(this.cm.dom);
    this.dom = wrapper;
    this.updating = false;

    this.cm.dom.addEventListener('click', () => {
      this.cm.focus();
    });
  }

  private createLanguageSelector(toolbarContent: HTMLElement) {
    const languageSelector = document.createElement('div');
    languageSelector.className = 'language-selector';

    const currentLang = this.node.attrs['language'] || 'ts';

    const languageSelect = document.createElement('div');
    languageSelect.className = 'language-select';

    const currentLangDisplay = document.createElement('div');
    currentLangDisplay.className = 'current-language';
    currentLangDisplay.textContent =
      AVAILABLE_LANGUAGES.find((lang) => lang.value === currentLang)?.label || 'TypeScript';

    const dropdownArrow = document.createElement('i');
    dropdownArrow.className = 'fa-solid fa-chevron-down';

    languageSelect.appendChild(currentLangDisplay);
    languageSelect.appendChild(dropdownArrow);

    const languageDropdown = document.createElement('div');
    languageDropdown.className = 'language-dropdown';
    languageDropdown.style.display = 'none';

    AVAILABLE_LANGUAGES.forEach((lang) => {
      const langOption = document.createElement('div');
      langOption.className = 'language-option';
      langOption.textContent = lang.label;
      langOption.addEventListener('click', (e) => {
        e.stopPropagation();
        this.changeLanguage(lang.value);
        currentLangDisplay.textContent = lang.label;
        languageDropdown.style.display = 'none';
      });
      languageDropdown.appendChild(langOption);
    });

    languageSelect.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = languageDropdown.style.display !== 'none';

      if (isVisible) {
        languageDropdown.style.display = 'none';
      } else {
        const rect = languageSelect.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const spaceBelow = viewportHeight - rect.bottom;
        const dropdownHeight = 200; // Approximate dropdown height

        if (spaceBelow >= dropdownHeight) {
          languageDropdown.style.bottom = 'auto';
          languageDropdown.style.top = '100%';
          languageDropdown.style.marginBottom = 'auto';
        } else {
          languageDropdown.style.top = 'auto';
          languageDropdown.style.bottom = '100%';
          languageDropdown.style.marginBottom = '5px';
          languageDropdown.style.marginTop = 'auto';
        }

        languageDropdown.style.display = 'block';
      }
    });

    document.addEventListener('click', () => {
      languageDropdown.style.display = 'none';
    });

    languageSelector.appendChild(languageSelect);
    languageSelector.appendChild(languageDropdown);
    toolbarContent.appendChild(languageSelector);
  }

  private createActionButtons(toolbarContent: HTMLElement) {
    const actionsContainer = document.createElement('div');
    actionsContainer.className = 'tooltip-actions';

    const wrapBtn = document.createElement('button');
    wrapBtn.className = 'wrap-btn';
    wrapBtn.innerHTML = '<i class="fa-regular fa-arrows-up-down-left-right"></i>';
    wrapBtn.title = 'Toggle code block wrap';

    wrapBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.toggleWrapping();
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.innerHTML = '<i class="fa-regular fa-trash"></i>';
    deleteBtn.title = 'Delete code block';

    deleteBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.deleteCodeBlock();
    });

    actionsContainer.appendChild(wrapBtn);
    actionsContainer.appendChild(deleteBtn);
    toolbarContent.appendChild(actionsContainer);
  }

  private changeLanguage(language: string) {
    const { state, dispatch } = this.view;
    const pos = this.getPos();

    const currentNode = state.doc.nodeAt(pos);
    if (!currentNode) {
      return;
    }

    const codeMirrorText = this.cm.state.doc.toString();

    const textContent = codeMirrorText || currentNode.textContent;

    const newNode = currentNode.type.create(
      { language, wrapped: currentNode.attrs['wrapped'] },
      textContent ? state.schema.text(textContent) : null,
    );

    const tr = state.tr.replaceWith(pos, pos + currentNode.nodeSize, newNode);
    dispatch(tr);

    this.node = newNode;

    this.cm.dispatch({
      effects: [this.languageCompartment.reconfigure(getLanguageSupport(language))],
    });
  }

  private toggleWrapping() {
    const { state, dispatch } = this.view;

    let actualPos = -1;
    state.doc.descendants((node, pos) => {
      if (node === this.node) {
        actualPos = pos;
        return false;
      }
      return true;
    });

    if (actualPos === -1) {
      return;
    }

    const node = state.doc.nodeAt(actualPos);
    if (!node || node.type.name !== 'code_block') {
      return;
    }

    const isCurrentlyWrapped = node.attrs['wrapped'] === true;

    if (isCurrentlyWrapped) {
      const newCodeBlock = node.type.create(
        {
          language: node.attrs['language'] || 'ts',
          wrapped: false,
        },
        node.content,
      );

      const tr = state.tr.replaceWith(actualPos, actualPos + node.nodeSize, newCodeBlock);
      tr.setSelection(TextSelection.near(tr.doc.resolve(actualPos)));
      dispatch(tr);
    } else {
      const newCodeBlock = node.type.create(
        {
          language: node.attrs['language'] || 'ts',
          wrapped: true,
        },
        node.content,
      );

      const tr = state.tr.replaceWith(actualPos, actualPos + node.nodeSize, newCodeBlock);
      tr.setSelection(TextSelection.near(tr.doc.resolve(actualPos)));
      dispatch(tr);
    }
  }

  private deleteCodeBlock() {
    const { state, dispatch } = this.view;

    let actualPos = -1;
    state.doc.descendants((node, pos) => {
      if (node === this.node) {
        actualPos = pos;
        return false;
      }
      return true;
    });

    if (actualPos === -1) {
      return;
    }

    const node = state.doc.nodeAt(actualPos);
    if (!node || node.type.name !== 'code_block') {
      return;
    }

    const paragraph = state.schema.nodes['paragraph'];
    const newParagraph = paragraph.create();

    const tr = state.tr.replaceWith(actualPos, actualPos + node.nodeSize, newParagraph);
    tr.setSelection(TextSelection.near(tr.doc.resolve(actualPos)));
    dispatch(tr);
  }

  setWrapping(wrapped: boolean) {
    this.cm.dispatch({
      effects: [this.wrappingCompartment.reconfigure(wrapped ? CodeMirror.lineWrapping : [])],
    });
  }

  forwardUpdate(update: any) {
    if (this.updating || !this.cm.hasFocus) return;

    try {
      let actualPos = -1;
      this.view.state.doc.descendants((node, pos) => {
        if (node === this.node) {
          actualPos = pos;
          return false;
        }
        return true;
      });

      if (actualPos === -1) {
        return;
      }

      let offset = actualPos + 1;
      let { main } = update.state.selection;
      let selFrom = offset + main.from;
      let selTo = offset + main.to;
      let pmSel = this.view.state.selection;

      const docSize = this.view.state.doc.content.size;
      if (selFrom < 0 || selTo < 0 || selFrom > docSize || selTo > docSize) {
        return;
      }

      if (update.docChanged || pmSel.from != selFrom || pmSel.to != selTo) {
        let tr = this.view.state.tr;
        update.changes.iterChanges(
          (fromA: number, toA: number, fromB: number, toB: number, text: any) => {
            const startPos = offset + fromA;
            const endPos = offset + toA;

            if (startPos < 0 || endPos < 0 || startPos > docSize || endPos > docSize) {
              return;
            }

            if (text.length) {
              tr.replaceWith(startPos, endPos, this.view.state.schema.text(text.toString()));
            } else {
              tr.delete(startPos, endPos);
            }
            offset += toB - fromB - (toA - fromA);
          },
        );

        if (
          selFrom >= 0 &&
          selTo >= 0 &&
          selFrom <= tr.doc.content.size &&
          selTo <= tr.doc.content.size
        ) {
          tr.setSelection(TextSelection.create(tr.doc, selFrom, selTo));
        }

        this.view.dispatch(tr);
      }
    } catch (error) {
      // Silently handle errors to prevent editor malfunction
    }
  }

  setSelection(anchor: number, head: number) {
    try {
      this.cm.focus();
      this.updating = true;

      const docSize = this.cm.state.doc.length;
      if (anchor < 0 || head < 0 || anchor > docSize || head > docSize) {
        anchor = Math.max(0, Math.min(anchor, docSize));
        head = Math.max(0, Math.min(head, docSize));
      }

      this.cm.dispatch({ selection: { anchor, head } });
      this.updating = false;
    } catch (error) {
      this.updating = false;
    }
  }

  codeMirrorKeymap() {
    let view = this.view;
    return [
      { key: 'ArrowUp', run: () => this.maybeEscape('line', -1) },
      { key: 'ArrowLeft', run: () => this.maybeEscape('char', -1) },
      { key: 'ArrowDown', run: () => this.maybeEscape('line', 1) },
      { key: 'ArrowRight', run: () => this.maybeEscape('char', 1) },
      {
        key: 'Enter',
        run: () => {
          const result = exitCode(view.state, view.dispatch);
          if (result) {
            view.focus();
          }
          return result;
        },
      },
      {
        key: 'Shift-Enter',
        run: () => {
          return false;
        },
      },
      {
        key: 'Backspace',
        run: () => {
          if (this.cm.state.doc.toString().trim() === '') {
            const pos = this.getPos();
            const codeBlockSize = this.node.nodeSize;
            const paragraph = view.state.schema.nodes['paragraph'];
            const newParagraph = paragraph.create();

            const tr = view.state.tr.replaceWith(pos, pos + codeBlockSize, newParagraph);
            tr.setSelection(TextSelection.near(tr.doc.resolve(pos)));
            view.dispatch(tr);
            view.focus();
            return true;
          }
          return false;
        },
      },
      { key: 'Ctrl-z', mac: 'Cmd-z', run: () => undo(view.state, view.dispatch) },
      { key: 'Shift-Ctrl-z', mac: 'Shift-Cmd-z', run: () => redo(view.state, view.dispatch) },
      { key: 'Ctrl-y', mac: 'Cmd-y', run: () => redo(view.state, view.dispatch) },
    ];
  }

  maybeEscape(unit: string, dir: number): boolean {
    let { state } = this.cm;
    let { main } = state.selection;
    if (!main.empty) return false;
    if (unit == 'line') {
      const line = state.doc.lineAt(main.head);
      if (dir < 0 ? line.from > 0 : line.to < state.doc.length) return false;
    } else {
      if (dir < 0 ? main.head > 0 : main.head < state.doc.length) return false;
    }
    let targetPos = this.getPos() + (dir < 0 ? 0 : this.node.nodeSize);
    let selection = Selection.near(this.view.state.doc.resolve(targetPos), dir);
    let tr = this.view.state.tr.setSelection(selection).scrollIntoView();
    this.view.dispatch(tr);
    this.view.focus();
    return true;
  }

  update(node: any) {
    try {
      if (node.type != this.node.type) return false;

      const wasWrapped = this.node.attrs.wrapped === true;
      const isWrapped = node.attrs.wrapped === true;

      this.node = node;

      if (wasWrapped !== isWrapped) {
        this.setWrapping(isWrapped);
      }

      if (this.updating) return true;

      let newText = node.textContent;
      let curText = this.cm.state.doc.toString();

      if (newText != curText) {
        let start = 0;
        let curEnd = curText.length;
        let newEnd = newText.length;

        while (start < curEnd && curText.charCodeAt(start) == newText.charCodeAt(start)) {
          ++start;
        }
        while (
          curEnd > start &&
          newEnd > start &&
          curText.charCodeAt(curEnd - 1) == newText.charCodeAt(newEnd - 1)
        ) {
          curEnd--;
          newEnd--;
        }

        this.updating = true;
        this.cm.dispatch({
          changes: {
            from: start,
            to: curEnd,
            insert: newText.slice(start, newEnd),
          },
        });
        this.updating = false;
      }
      return true;
    } catch (error) {
      this.updating = false;
      return true;
    }
  }

  selectNode() {
    this.cm.focus();
  }
  stopEvent() {
    return true;
  }
}

function arrowHandler(dir: string) {
  return (state: any, dispatch: any, view: any) => {
    if (state.selection.empty && view.endOfTextblock(dir)) {
      let side = dir == 'left' || dir == 'up' ? -1 : 1;
      let $head = state.selection.$head;
      let nextPos = Selection.near(
        state.doc.resolve(side > 0 ? $head.after() : $head.before()),
        side,
      );
      if (nextPos.$head && nextPos.$head.parent.type.name == 'code_block') {
        dispatch(state.tr.setSelection(nextPos));
        return true;
      }
    }
    return false;
  };
}

const arrowHandlers = keymap({
  ArrowLeft: arrowHandler('left'),
  ArrowRight: arrowHandler('right'),
  ArrowUp: arrowHandler('up'),
  ArrowDown: arrowHandler('down'),
});

export function codeMirrorPlugin() {
  return new Plugin({
    props: {
      nodeViews: {
        code_block: (node, view, getPos) => {
          if (typeof getPos === 'function') {
            const pos = getPos();
            if (typeof pos === 'number') {
              return new CodeBlockView(node, view, () => pos);
            }
          }
          return new CodeBlockView(node, view, () => 0);
        },
      },
    },
    keymap: arrowHandlers,
  });
}
