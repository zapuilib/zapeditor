import { Component, HostListener, input, model, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';

import {
  BLOCK_STYLES,
  BLOCKS,
  COLORS,
  TEXT_FORMATTING_STYLES,
} from '../../constants';
import { ZeLinkCardComponent } from '../link-card/link-card.component';
import { zapEditorTooltipDirective } from '../tooltip/tooltip.directive';

@Component({
  selector: 'hub-editor-toolbar',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    ZeLinkCardComponent,
    zapEditorTooltipDirective,
  ],
  templateUrl: './editor-toolbar.component.html',
  styleUrl: './editor-toolbar.component.scss',
})
export class ZapEditorToolbar {
  styleChange = output<string>();
  textFormat = output<string>();
  redo = output<void>();
  undo = output<void>();
  bold = output<void>();
  italic = output<void>();
  underline = output<void>();
  align = output<'left' | 'center' | 'right' | 'justify'>();
  list = output<'bullet' | 'numbered' | 'todo'>();
  codeBlock = output<void>();
  showDropdown: string | null = null;
  link = output<{ href: string; text: string }>();
  linkButtonClick = output<void>();
  color = output<string>();
  block = output<string>();
  at = output<void>();
  file = output<Event>();
  href = model<string>();
  text = model<string>();
  isOnLink = input<boolean>(false);
  currentColor = input<string>('#000000');
  blockStyles: { label: string; value: string; cmd: string }[] = BLOCK_STYLES;
  textFormattingStyles: { label: string; value: string; cmd: string }[] =
    TEXT_FORMATTING_STYLES;
  linkForm!: FormGroup;
  colors: { label: string; value: string }[] = COLORS;
  blocks: { label: string; value: string; img: string; descp: string }[] =
    BLOCKS;

  @HostListener('document:click', ['$event'])
  closeDropdown(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const isDropdown = target.closest('.tool__dropdown__wrapper');
    if (!isDropdown) {
      this.showDropdown = null;
    }
  }

  toggleDropdown(key: string) {
    if (key === 'link') {
      this.linkButtonClick.emit();
    }
    this.showDropdown = this.showDropdown === key ? null : key;
  }

  selectBlockStyle(event: Event, styleValue: string) {
    event.stopPropagation();
    this.styleChange.emit(styleValue);
    this.showDropdown = null;
  }

  selectTextFormattingOptions(event: Event, value: string) {
    event.stopPropagation();
    this.textFormat.emit(value);
    this.showDropdown = null;
  }

  addLink(event: { href: string; text: string }) {
    if (event.href) {
      this.link.emit(event);
      this.toggleDropdown('link');
    }
  }

  selectColor(event: Event, color: string) {
    event.stopPropagation();
    this.color.emit(color);
    this.showDropdown = null;
  }

  selectBlock(event: Event, block: string) {
    event.stopPropagation();
    this.block.emit(block);
    this.showDropdown = null;
  }
}
