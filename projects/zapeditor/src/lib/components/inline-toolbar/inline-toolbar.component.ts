import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HubLinkCardComponent } from '../link-card/link-card.component';
import { COLORS, TEXT_FORMATTING_STYLES } from '../../constants/styles.constant';

@Component({
  selector: 'inline-toolbar',
  imports: [CommonModule, HubLinkCardComponent],
  template: `
    <div class="inline__toolbar" 
         [style.left.px]="position().x" 
         [style.top.px]="position().y"
         [class.inline__toolbar--top]="position().position === 'top'"
         [class.inline__toolbar--bottom]="position().position === 'bottom'">
      <div class="inline__toolbar__content">
        <!-- Text Style Dropdown -->
        <div class="inline__toolbar__group">
          <div class="inline__toolbar__dropdown__wrapper">
            <button
              class="inline__toolbar__dropdown"
              (click)="toggleDropdown('block_style')"
            >
              <div class="trigger">
                <span>Tt</span>
                <i class="fa-regular fa-chevron-down"></i>
              </div>
            </button>
            @if (showDropdown === 'block_style') {
            <div class="inline__toolbar__dropdown__content">
              @for (style of blockStyles; track $index) {
              <div
                class="inline__toolbar__option"
                (click)="selectBlockStyle($event, style.value)"
              >
                <span [ngClass]="style.value">{{ style.label }}</span>
                <span class="shortcut">{{ style.cmd }}</span>
              </div>
              }
            </div>
            }
          </div>
        </div>

        <!-- Text Formatting -->
        <div class="inline__toolbar__group">
          <button 
            class="inline__toolbar__button"
            [class.inline__toolbar__button--active]="isBold()"
            (click)="bold.emit()">
            <i class="fa-regular fa-bold"></i>
          </button>
          <button 
            class="inline__toolbar__button"
            [class.inline__toolbar__button--active]="isItalic()"
            (click)="italic.emit()">
            <i class="fa-regular fa-italic"></i>
          </button>
          <button 
            class="inline__toolbar__button"
            [class.inline__toolbar__button--active]="isUnderline()"
            (click)="underline.emit()">
            <i class="fa-regular fa-underline"></i>
          </button>
          <div class="inline__toolbar__dropdown__wrapper">
            <button
              class="inline__toolbar__dropdown"
              (click)="toggleDropdown('text_formatting')"
            >
              <i class="fa-regular fa-ellipsis-vertical"></i>
            </button>
            @if (showDropdown === 'text_formatting') {
            <div class="inline__toolbar__dropdown__content">
              @for (style of textFormattingStyles; track $index) {
              <div
                class="inline__toolbar__option"
                (click)="selectTextFormattingOptions($event, style.value)"
              >
                <span>{{ style.label }}</span>
                <span class="shortcut">{{ style.cmd }}</span>
              </div>
              }
            </div>
            }
          </div>
        </div>

        <!-- Separator -->
        <div class="inline__toolbar__separator"></div>

        <!-- Alignment -->
        <div class="inline__toolbar__group">
          <button 
            class="inline__toolbar__button"
            [class.inline__toolbar__button--active]="isAlignLeft()"
            (click)="align.emit('left')">
            <i class="fa-regular fa-align-left"></i>
          </button>
          <button 
            class="inline__toolbar__button"
            [class.inline__toolbar__button--active]="isAlignCenter()"
            (click)="align.emit('center')">
            <i class="fa-regular fa-align-center"></i>
          </button>
          <button 
            class="inline__toolbar__button"
            [class.inline__toolbar__button--active]="isAlignRight()"
            (click)="align.emit('right')">
            <i class="fa-regular fa-align-right"></i>
          </button>
          <button 
            class="inline__toolbar__button"
            [class.inline__toolbar__button--active]="isAlignJustify()"
            (click)="align.emit('justify')">
            <i class="fa-regular fa-align-justify"></i>
          </button>
        </div>

        <!-- Separator -->
        <div class="inline__toolbar__separator"></div>

        <!-- Lists -->
        <div class="inline__toolbar__group">
          <button class="inline__toolbar__button" (click)="list.emit('bullet')">
            <i class="fa-regular fa-list-ul"></i>
          </button>
          <button class="inline__toolbar__button" (click)="list.emit('numbered')">
            <i class="fa-regular fa-list-ol"></i>
          </button>
          <button class="inline__toolbar__button" (click)="list.emit('todo')">
            <i class="fa-regular fa-list-check"></i>
          </button>
        </div>

        <!-- Separator -->
        <div class="inline__toolbar__separator"></div>

        <!-- Color & Link -->
        <div class="inline__toolbar__group">
          <div class="inline__toolbar__dropdown__wrapper">
            <button
              class="inline__toolbar__dropdown"
              (click)="toggleDropdown('color')"
            >
              <div class="trigger">
                <span class="color" [style.background]="currentColor()"></span>
              </div>
            </button>
            @if (showDropdown === 'color') {
            <div class="inline__toolbar__dropdown__content color__dropdown">
              @for (color of colors; track $index) {
              <div
                class="inline__toolbar__option"
                [style.background]="color.value"
                (click)="selectColor($event, color.value)"
              >
                <span class="sr-only">{{ color.label }}</span>
              </div>
              }
            </div>
            }
          </div>
          <button class="inline__toolbar__button" (click)="codeBlock.emit()">
            <i class="fa-regular fa-code"></i>
          </button>
          <div class="inline__toolbar__dropdown__wrapper">
            <button
              class="inline__toolbar__dropdown"
              [disabled]="isOnLink()"
              (click)="onLinkClick()"
            >
              <div><i class="fa-regular fa-link"></i></div>
            </button>
            @if (showDropdown === 'link') {
            <div class="inline__toolbar__dropdown__content link__editor">
              <hub-editor-link-card
                [href]="href()"
                [text]="text()"
                (add)="addLink($event)"
              ></hub-editor-link-card>
            </div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrl: './inline-toolbar.component.scss'
})
export class InlineToolbarComponent {
  // Inputs
  position = input<{ x: number; y: number; position?: 'top' | 'bottom' }>({ x: 0, y: 0, position: 'top' });
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

  // Outputs
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

  // Dropdown state
  showDropdown: string | null = null;

  // Data arrays (same as main toolbar)
  blockStyles = [
    { label: 'Paragraph', value: 'p', cmd: '⌘⌥0' },
    { label: 'Heading 1', value: 'h1', cmd: '⌘⌥1' },
    { label: 'Heading 2', value: 'h2', cmd: '⌘⌥2' },
    { label: 'Heading 3', value: 'h3', cmd: '⌘⌥3' },
    { label: 'Heading 4', value: 'h4', cmd: '⌘⌥4' },
    { label: 'Heading 5', value: 'h5', cmd: '⌘⌥5' },
    { label: 'Heading 6', value: 'h6', cmd: '⌘⌥6' }
  ];

  textFormattingStyles = TEXT_FORMATTING_STYLES;
  colors = COLORS;

  // Methods
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
    // First populate the link data (like main toolbar does)
    this.linkButtonClick.emit();
    // Then open the dropdown
    this.toggleDropdown('link');
  }
}
