import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ZeLinkCardComponent } from '../link-card/link-card.component';
import { zapEditorTooltipDirective } from '../tooltip/tooltip.directive';
import {
  BLOCK_STYLES,
  COLORS,
  TEXT_FORMATTING_STYLES,
} from '../../constants/styles.constant';

@Component({
  selector: 'inline-toolbar',
  imports: [CommonModule, ZeLinkCardComponent, zapEditorTooltipDirective],
  templateUrl: './inline-toolbar.component.html',
  styleUrl: './inline-toolbar.component.scss',
})
export class InlineToolbarComponent {
  bold = output<void>();
  italic = output<void>();
  underline = output<void>();
  strikethrough = output<void>();
  code = output<void>();
  align = output<'left' | 'center' | 'right' | 'justify'>();
  color = output<string>();
  link = output<{ href: string; text: string }>();
  linkButtonClick = output<void>();
  list = output<'bullet' | 'numbered' | 'todo'>();
  codeBlock = output<void>();
  blockStyle = output<string>();
  textFormatting = output<string>();
  position = input<{ x: number; y: number; position?: 'top' | 'bottom' }>({
    x: 0,
    y: 0,
    position: 'top',
  });
  currentColor = input<string>('#FFFFFFCC');
  isBold = input<boolean>(false);
  isItalic = input<boolean>(false);
  isUnderline = input<boolean>(false);
  isStrikethrough = input<boolean>(false);
  isCode = input<boolean>(false);
  isAlignLeft = input<boolean>(false);
  isAlignCenter = input<boolean>(false);
  isAlignRight = input<boolean>(false);
  isAlignJustify = input<boolean>(false);
  isOnLink = input<boolean>(false);
  href = input<string>('');
  text = input<string>('');
  showDropdown: string | null = null;
  blockStyles = BLOCK_STYLES;
  textFormattingStyles = TEXT_FORMATTING_STYLES;
  colors = COLORS;

  toggleDropdown(type: string) {
    this.showDropdown = this.showDropdown === type ? null : type;
  }

  selectBlockStyle(event: Event, value: string) {
    event.stopPropagation();
    this.blockStyle.emit(value);
    this.showDropdown = null;
  }

  selectTextFormattingOptions(event: Event, value: string) {
    event.stopPropagation();
    this.textFormatting.emit(value);
    this.showDropdown = null;
  }

  selectColor(event: Event, value: string) {
    event.stopPropagation();
    this.color.emit(value);
    this.showDropdown = null;
  }

  addLink(event: { href: string; text: string }) {
    if (event.href) {
      this.link.emit(event);
      this.showDropdown = null;
    }
  }

  onLinkClick() {
    this.linkButtonClick.emit();
    this.toggleDropdown('link');
  }
}
