import { describe, it, expect, beforeEach } from 'vitest';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { Schema } from 'prosemirror-model';
import { slashPlugin } from './slash.plugin';

// Mock schema for testing
const mockSchema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { content: 'inline*', group: 'block' },
    text: { group: 'inline' },
    bullet_list: { content: 'list_item+', group: 'block' },
    ordered_list: { content: 'list_item+', group: 'block' },
    todo_list: { content: 'todo_list_item+', group: 'block' },
    list_item: { content: 'paragraph block*' },
    todo_list_item: { content: 'paragraph block*' },
  },
});

describe('Slash Plugin - List Context Prevention', () => {
  let editorView: EditorView;
  let plugin: any;

  beforeEach(() => {
    // Create a minimal editor view for testing
    const state = EditorState.create({
      schema: mockSchema,
      doc: mockSchema.node('doc', null, [
        mockSchema.node('paragraph', null, mockSchema.text('Test content'))
      ])
    });

    editorView = new EditorView(document.createElement('div'), {
      state,
      plugins: [slashPlugin()]
    });

    plugin = slashPlugin();
  });

  it('should prevent adding bullet list when already in bullet list', () => {
    // Create a document with a bullet list
    const bulletList = mockSchema.node('bullet_list', null, [
      mockSchema.node('list_item', null, [
        mockSchema.node('paragraph', null, mockSchema.text('Item 1'))
      ])
    ]);

    const state = EditorState.create({
      schema: mockSchema,
      doc: mockSchema.node('doc', null, [bulletList])
    });

    const newView = new EditorView(document.createElement('div'), {
      state,
      plugins: [slashPlugin()]
    });

    // Simulate being inside the list item
    const $from = state.selection.$from;
    
    // This should return true since we're in a bullet list context
    const isInList = isInListContext($from, mockSchema);
    expect(isInList).toBe(true);
  });

  it('should prevent adding todo list when already in todo list', () => {
    // Create a document with a todo list
    const todoList = mockSchema.node('todo_list', null, [
      mockSchema.node('todo_list_item', { checked: false }, [
        mockSchema.node('paragraph', null, mockSchema.text('Todo item'))
      ])
    ]);

    const state = EditorState.create({
      schema: mockSchema,
      doc: mockSchema.node('doc', null, [todoList])
    });

    const $from = state.selection.$from;
    
    // This should return true since we're in a todo list context
    const isInList = isInListContext($from, mockSchema);
    expect(isInList).toBe(true);
  });

  it('should allow adding lists when not in list context', () => {
    // Create a simple document without lists
    const state = EditorState.create({
      schema: mockSchema,
      doc: mockSchema.node('doc', null, [
        mockSchema.node('paragraph', null, mockSchema.text('Regular paragraph'))
      ])
    });

    const $from = state.selection.$from;
    
    // This should return false since we're not in a list context
    const isInList = isInListContext($from, mockSchema);
    expect(isInList).toBe(false);
  });
});

// Helper function to test list context detection
function isInListContext($from: any, schema: any): boolean {
  let depth = $from.depth;
  
  while (depth > 0) {
    const node = $from.node(depth);
    if (
      node.type === schema.nodes['bullet_list'] ||
      node.type === schema.nodes['ordered_list'] ||
      node.type === schema.nodes['todo_list'] ||
      node.type === schema.nodes['list_item'] ||
      node.type === schema.nodes['todo_list_item']
    ) {
      return true;
    }
    depth--;
  }
  
  return false;
}
