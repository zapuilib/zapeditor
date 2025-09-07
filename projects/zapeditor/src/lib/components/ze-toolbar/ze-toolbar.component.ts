import { Component, input, output, HostListener, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';

import {
  BLOCK_STYLES,
  BLOCKS,
  COLORS,
  TEXT_FORMATTING_STYLES,
} from '../../constants/styles.constant';
import { ZeLinkCardComponent } from '../link-card/link-card.component';
import { zapEditorTooltipDirective } from '../tooltip/tooltip.directive';

export interface ZeToolbarConfig {
  showUndoRedo?: boolean;
  showMention?: boolean;
  showFileUpload?: boolean;
  showMoreBlocks?: boolean;
  showStrikethrough?: boolean;
  showCode?: boolean;
  showCodeBlock?: boolean;
  showBlockStyle?: boolean;
  showTextFormatting?: boolean;
  showAlignment?: boolean;
  showLists?: boolean;
  showColor?: boolean;
  showLink?: boolean;
  showBold?: boolean;
  showItalic?: boolean;
  showUnderline?: boolean;
}

@Component({
  selector: 'ze-toolbar',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    ZeLinkCardComponent,
    zapEditorTooltipDirective,
  ],
  templateUrl: './ze-toolbar.component.html',
  styleUrl: './ze-toolbar.component.scss',
})
export class ZeToolbarComponent {
  styleChange = output<string>();
  textFormat = output<string>();
  redo = output<void>();
  undo = output<void>();
  bold = output<void>();
  italic = output<void>();
  underline = output<void>();
  strikethrough = output<void>();
  code = output<void>();
  align = output<'left' | 'center' | 'right' | 'justify'>();
  list = output<'bullet' | 'numbered' | 'todo'>();
  codeBlock = output<void>();
  link = output<{ href: string; text: string }>();
  linkButtonClick = output<void>();
  color = output<string>();
  block = output<string>();
  at = output<void>();
  file = output<Event>();
  mode = input<'inline' | 'top'>('top');
  config = input<ZeToolbarConfig>({
    showUndoRedo: true,
    showMention: true,
    showFileUpload: true,
    showMoreBlocks: true,
    showStrikethrough: false,
    showCode: false,
    showCodeBlock: true,
    showBlockStyle: true,
    showTextFormatting: true,
    showAlignment: true,
    showLists: true,
    showColor: true,
    showLink: true,
    showBold: true,
    showItalic: true,
    showUnderline: true,
  });
  position = input<{ x: number; y: number; position?: 'top' | 'bottom' }>({
    x: 0,
    y: 0,
    position: 'top',
  });
  href = input<string>('');
  text = input<string>('');
  isOnLink = input<boolean>(false);
  currentColor = input<string>('#000000');
  showDropdown: string | null = null;
  dropdownPosition: { left: number; top: number } | null = null;
  linkForm!: FormGroup;
  blockStyles: { label: string; value: string; cmd: string }[] = BLOCK_STYLES;
  textFormattingStyles: { label: string; value: string; cmd: string }[] =
    TEXT_FORMATTING_STYLES;
  colors: { label: string; value: string }[] = COLORS;
  blocks: { label: string; value: string; img: string; descp: string }[] =
    BLOCKS;

  @HostListener('document:click', ['$event'])
  closeDropdown(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const isDropdown = target.closest('.toolbar__dropdown__wrapper');
    const isToolbar = target.closest('.toolbar');

    if (this.mode() === 'inline') {
      if (!isToolbar) {
        this.showDropdown = null;
      }
    } else {
      if (!isDropdown) {
        this.showDropdown = null;
      }
    }
  }

  toggleDropdown(type: string, event?: Event) {
    if (type === 'link') {
      this.linkButtonClick.emit();
    }

    if (event) {
      const button = event.target as HTMLElement;
      setTimeout(() => {
        const dropdown = document.querySelector(
          '.toolbar__dropdown__content'
        ) as HTMLElement;
        if (dropdown) {
          dropdown.style.display = 'grid';
          this.adjustDropdownPosition(button);
        }
      }, 0);
    } else {
      this.dropdownPosition = null;
    }

    this.showDropdown = this.showDropdown === type ? null : type;
  }

  private adjustDropdownPosition(button: HTMLElement) {
    const dropdown = document.querySelector(
      '.toolbar__dropdown__content'
    ) as HTMLElement;
    if (dropdown) {
      const buttonRect = button.getBoundingClientRect();
      const dropdownWidth = dropdown.offsetWidth || 240;
      const viewportWidth = window.innerWidth;
      const padding = 20;

      let left = buttonRect.left;

      if (left + dropdownWidth > viewportWidth - padding) {
        left = viewportWidth - dropdownWidth - padding;
      }

      if (left < padding) {
        left = padding;
      }

      dropdown.style.left = `${left}px`;
      dropdown.style.top = `${buttonRect.bottom + 8}px`;
    }
  }

  selectBlockStyle(event: Event, value: string) {
    event.stopPropagation();
    this.styleChange.emit(value);
    this.showDropdown = null;
  }

  selectTextFormattingOptions(event: Event, value: string) {
    event.stopPropagation();
    this.textFormat.emit(value);
    this.showDropdown = null;
  }

  selectColor(event: Event, value: string) {
    event.stopPropagation();
    this.color.emit(value);
    this.showDropdown = null;
  }

  selectBlock(event: Event, value: string) {
    event.stopPropagation();
    this.block.emit(value);
    this.showDropdown = null;
  }

  addLink(event: { href: string; text: string }) {
    if (event.href) {
      this.link.emit(event);
      this.toggleDropdown('link');
    }
  }

  onAlignClick(align: 'left' | 'center' | 'right' | 'justify') {
    this.showDropdown = null;
    this.align.emit(align);
  }
}
