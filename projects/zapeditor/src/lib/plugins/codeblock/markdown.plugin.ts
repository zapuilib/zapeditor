import { inputRules, InputRule } from 'prosemirror-inputrules';
import type { Schema } from 'prosemirror-model';

/**
 * This plugin adds support for markdown-like syntax in the editor.
 * It supports three backticks to create a code block and single backticks to surround text with a code mark.
 * @param schema - The schema to use for the editor.
 * @returns A plugin that adds support for markdown-like syntax in the editor.
 */
export function markdownPlugin(schema: Schema) {
    const { code_block } = schema.nodes;
    const { code: codeMark } = schema.marks;

  const threeBackticks = new InputRule(/^```\s*$/, (state, match, start, end) => {
    let tr = state.tr.delete(start, end);
    tr = tr.setBlockType(start, start, code_block, { language: 'ts', wrapped: false });
    return tr;
  });

  const singleBacktick = new InputRule(/^`([^`]+)`$/, (state, match, start, end) => {
    let tr = state.tr.delete(start, end);
    const text = match[1];
    const textNode = schema.text(text);
    tr = tr.insert(start, textNode);
    tr = tr.addMark(start, start + text.length, codeMark.create());
    return tr;
  });

  return inputRules({ rules: [threeBackticks, singleBacktick] });
}