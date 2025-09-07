import { Component, signal, ViewChild, OnDestroy, PLATFORM_ID, inject } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { ZapEditor, MentionOption, MediaUploadEvent } from 'zapeditor';
import { UploadService, UploadResponse } from './services/upload.service';
import { CommonModule, isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-root',
  imports: [HttpClientModule, ZapEditor, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnDestroy {
  title = 'demo';
  toolbar = signal<'inline' | 'default'>('inline');
  editorValue = signal<string>('');
  lastUpdated = signal<string>('Never');
  autoSave = signal<boolean>(true);
  storageKey = signal<string>('zap-editor-demo');
  @ViewChild('defaultEditor') defaultEditor!: ZapEditor;
  @ViewChild('inlineEditor') inlineEditor!: ZapEditor;
  
  private autoSaveTimeout: any;
  private readonly AUTO_SAVE_DELAY = 10;
  private readonly platformId = inject(PLATFORM_ID);
  
  constructor(private uploadService: UploadService) {
    this.loadFromLocalStorage();
    this.toolbar.set(localStorage.getItem('toolbar') as 'inline' | 'default' || 'inline');
  }

  ngOnDestroy() {
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }
  }

  private autoSaveContent(content: string) {
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }

    this.autoSaveTimeout = setTimeout(() => {
      if (isPlatformBrowser(this.platformId)) {
        try {
          localStorage.setItem(this.storageKey(), content);
        } catch (error) {
        }
      }
    }, this.AUTO_SAVE_DELAY);
  }

  private loadFromLocalStorage() {
    if (!isPlatformBrowser(this.platformId)) return;

    try {
      const savedContent = localStorage.getItem(this.storageKey());
      if (savedContent) {
        this.editorValue.set(savedContent);
        this.lastUpdated.set('Loaded from localStorage');
      }
    } catch (error) {
    }
  }

  users = signal<MentionOption[]>([
    {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      avatar: 'https://i.pravatar.cc/150?img=3',
    },
    {
      id: '2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      avatar: 'https://i.pravatar.cc/150?img=3',
    },
    {
      id: '3',
      name: 'Mike Johnson',
      email: 'mike@example.com',
      avatar: 'https://i.pravatar.cc/150?img=3',
    },
    {
      id: '4',
      name: 'Sarah Wilson',
      email: 'sarah@example.com',
      avatar: 'https://i.pravatar.cc/150?img=3',
    },
    {
      id: '5',
      name: 'David Brown',
      email: 'david@example.com',
      avatar: 'https://i.pravatar.cc/150?img=3',
    },
    {
      id: '6',
      name: 'Emily Davis',
      email: 'emily@example.com',
      avatar: 'https://i.pravatar.cc/150?img=3',
    },
    {
      id: '7',
      name: 'Chris Miller',
      email: 'chris@example.com',
      avatar: 'https://i.pravatar.cc/150?img=3',
    },
    {
      id: '8',
      name: 'Lisa Garcia',
      email: 'lisa@example.com',
      avatar: 'https://i.pravatar.cc/150?img=3',
    },
  ]);

  onMentionSearch(query: string) {
    const currentUsers = this.users();
    const bikasUser = {
      id: '9',
      name: 'Bikas',
      email: 'bikas@example.com',
      avatar: 'https://i.pravatar.cc/150?img=3',
    };

    const bikasExists = currentUsers.some(
      (user) => user.id === '9' || user.name === 'Bikas'
    );

    if (!bikasExists) {
      this.users.set([...currentUsers, bikasUser]);
    }
  }

  onMediaUpload(event: MediaUploadEvent) {
    
    this.uploadService.uploadFile(event.file).subscribe({
      next: (response: UploadResponse) => {
        
        if (this.defaultEditor) {
          this.defaultEditor.updateMediaWithUploadedUrl(response.url);
        }
        if (this.inlineEditor) {
          this.inlineEditor.updateMediaWithUploadedUrl(response.url);
        }
      },
      error: (error) => {
      }
    });
  }

  onEditorChange(content: string) {
    this.editorValue.set(content);
    this.lastUpdated.set(new Date().toLocaleTimeString());
    
    if (this.autoSave()) {
      this.autoSaveContent(content);
    }
  }

  loadExampleContent() {
    const exampleContent = {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1, align: 'left' },
          content: [{ type: 'text', text: 'Complete Zap Editor Example' }]
        },
        
        {
          type: 'heading',
          attrs: { level: 2, align: 'left' },
          content: [{ type: 'text', text: 'All Text Formatting Marks' }]
        },
        
        {
          type: 'paragraph',
          attrs: { align: 'left' },
          content: [
            { type: 'text', text: 'This text has ' },
            { type: 'text', marks: [{ type: 'bold' }], text: 'bold' },
            { type: 'text', text: ', ' },
            { type: 'text', marks: [{ type: 'italic' }], text: 'italic' },
            { type: 'text', text: ', ' },
            { type: 'text', marks: [{ type: 'underline' }], text: 'underline' },
            { type: 'text', text: ', ' },
            { type: 'text', marks: [{ type: 'strike' }], text: 'strikethrough' },
            { type: 'text', text: ', ' },
            { type: 'text', marks: [{ type: 'code' }], text: 'inline code' },
            { type: 'text', text: ', ' },
            { type: 'text', marks: [{ type: 'sup' }], text: 'superscript' },
            { type: 'text', text: ', and ' },
            { type: 'text', marks: [{ type: 'sub' }], text: 'subscript' },
            { type: 'text', text: ' formatting.' }
          ]
        },
        
        {
          type: 'paragraph',
          attrs: { align: 'left' },
          content: [
            { type: 'text', text: 'Color examples: ' },
            { type: 'text', marks: [{ type: 'color', attrs: { color: '#ff0000' } }], text: 'red text' },
            { type: 'text', text: ', ' },
            { type: 'text', marks: [{ type: 'color', attrs: { color: '#00ff00' } }], text: 'green text' },
            { type: 'text', text: ', ' },
            { type: 'text', marks: [{ type: 'color', attrs: { color: '#0000ff' } }], text: 'blue text' },
            { type: 'text', text: ', ' },
            { type: 'text', marks: [{ type: 'color', attrs: { color: '#ff00ff' } }], text: 'purple text' },
            { type: 'text', text: ', ' },
            { type: 'text', marks: [{ type: 'color', attrs: { color: '#ffff00' } }], text: 'yellow text' }
          ]
        },
        
        {
          type: 'paragraph',
          attrs: { align: 'left' },
          content: [
            { type: 'text', text: 'Link example: ' },
            { type: 'text', marks: [{ type: 'link', attrs: { href: 'https://example.com', title: 'Example Link' } }], text: 'Visit Example.com' }
          ]
        },
        
        {
          type: 'heading',
          attrs: { level: 3, align: 'left' },
          content: [{ type: 'text', text: 'All Heading Levels' }]
        },
        
        {
          type: 'heading',
          attrs: { level: 4, align: 'left' },
          content: [{ type: 'text', text: 'H4 Heading' }]
        },
        
        {
          type: 'heading',
          attrs: { level: 5, align: 'left' },
          content: [{ type: 'text', text: 'H5 Heading' }]
        },
        
        {
          type: 'heading',
          attrs: { level: 6, align: 'left' },
          content: [{ type: 'text', text: 'H6 Heading' }]
        },
        
        {
          type: 'heading',
          attrs: { level: 2, align: 'left' },
          content: [{ type: 'text', text: 'Text Alignment Examples' }]
        },
        
        {
          type: 'paragraph',
          attrs: { align: 'left' },
          content: [{ type: 'text', text: 'Left aligned text' }]
        },
        
        {
          type: 'paragraph',
          attrs: { align: 'center' },
          content: [{ type: 'text', text: 'Center aligned text' }]
        },
        
        {
          type: 'paragraph',
          attrs: { align: 'right' },
          content: [{ type: 'text', text: 'Right aligned text' }]
        },
        
        {
          type: 'paragraph',
          attrs: { align: 'justify' },
          content: [{ type: 'text', text: 'Justified text that spreads across the full width of the container with even spacing between words.' }]
        },
        
        {
          type: 'heading',
          attrs: { level: 2, align: 'left' },
          content: [{ type: 'text', text: 'List Examples' }]
        },
        
        {
          type: 'bullet_list',
          content: [
            {
              type: 'list_item',
              content: [
                {
                  type: 'paragraph',
                  attrs: { align: 'left' },
                  content: [{ type: 'text', text: 'First bullet point' }]
                }
              ]
            },
            {
              type: 'list_item',
              content: [
                {
                  type: 'paragraph',
                  attrs: { align: 'left' },
                  content: [{ type: 'text', text: 'Second bullet point with ' }, { type: 'text', marks: [{ type: 'bold' }], text: 'bold text' }]
                }
              ]
            },
            {
              type: 'list_item',
              content: [
                {
                  type: 'paragraph',
                  attrs: { align: 'left' },
                  content: [{ type: 'text', text: 'Third bullet point' }]
                }
              ]
            }
          ]
        },
        
        {
          type: 'ordered_list',
          attrs: { order: 1 },
          content: [
            {
              type: 'list_item',
              content: [
                {
                  type: 'paragraph',
                  attrs: { align: 'left' },
                  content: [{ type: 'text', text: 'First numbered item' }]
                }
              ]
            },
            {
              type: 'list_item',
              content: [
                {
                  type: 'paragraph',
                  attrs: { align: 'left' },
                  content: [{ type: 'text', text: 'Second numbered item' }]
                }
              ]
            },
            {
              type: 'list_item',
              content: [
                {
                  type: 'paragraph',
                  attrs: { align: 'left' },
                  content: [{ type: 'text', text: 'Third numbered item' }]
                }
              ]
            }
          ]
        },
        
        {
          type: 'todo_list',
          content: [
            {
              type: 'todo_list_item',
              attrs: { checked: true },
              content: [
                {
                  type: 'paragraph',
                  attrs: { align: 'left' },
                  content: [{ type: 'text', text: 'Completed todo item' }]
                }
              ]
            },
            {
              type: 'todo_list_item',
              attrs: { checked: false },
              content: [
                {
                  type: 'paragraph',
                  attrs: { align: 'left' },
                  content: [{ type: 'text', text: 'Pending todo item' }]
                }
              ]
            },
            {
              type: 'todo_list_item',
              attrs: { checked: false },
              content: [
                {
                  type: 'paragraph',
                  attrs: { align: 'left' },
                  content: [{ type: 'text', text: 'Another pending item' }]
                }
              ]
            }
          ]
        },
        
        {
          type: 'heading',
          attrs: { level: 2, align: 'left' },
          content: [{ type: 'text', text: 'Code Block Example' }]
        },
        
        {
          type: 'code_block',
          attrs: { language: 'ts', wrapped: false },
          content: [
            { type: 'text', text: 'function greet(name: string): string {\n  return `Hello, ${name}!`;\n}\n\nconst user = "World";\ngreet(user);' }
          ]
        },
        
        {
          type: 'heading',
          attrs: { level: 2, align: 'left' },
          content: [{ type: 'text', text: 'Blockquote Example' }]
        },
        
        {
          type: 'blockquote',
          content: [
            {
              type: 'paragraph',
              attrs: { align: 'left' },
              content: [
                { type: 'text', text: 'This is a blockquote example. You can use it to highlight important information, quotes, or callouts. It has a distinctive left border and italic styling.' }
              ]
            }
          ]
        },
        
        {
          type: 'horizontal_rule'
        },
        
        {
          type: 'heading',
          attrs: { level: 2, align: 'left' },
          content: [{ type: 'text', text: 'Mention Example' }]
        },
        
        {
          type: 'paragraph',
          attrs: { align: 'left' },
          content: [
            { type: 'text', text: 'Try typing ' },
            { type: 'text', marks: [{ type: 'code' }], text: '@ ' },
            { type: 'text', text: 'to mention someone like ' },
            { type: 'mention', attrs: { id: '1', name: 'John Doe', avatar: 'https://i.pravatar.cc/150?img=3', email: 'john@example.com' } },
            { type: 'text', text: ' or ' },
            { type: 'mention', attrs: { id: '2', name: 'Jane Smith', avatar: 'https://i.pravatar.cc/150?img=4', email: 'jane@example.com' } }
          ]
        },
        
        {
          type: 'heading',
          attrs: { level: 2, align: 'left' },
          content: [{ type: 'text', text: 'Media Upload Example' }]
        },
        
        {
          type: 'paragraph',
          attrs: { align: 'left' },
          content: [
            { type: 'text', text: 'You can upload images, videos, and documents by dragging and dropping them into the editor or using the file upload button in the toolbar.' }
          ]
        },
        
        {
          type: 'heading',
          attrs: { level: 2, align: 'left' },
          content: [{ type: 'text', text: 'Slash Commands' }]
        },
        
        {
          type: 'paragraph',
          attrs: { align: 'left' },
          content: [
            { type: 'text', text: 'Try typing ' },
            { type: 'text', marks: [{ type: 'code' }], text: '/ ' },
            { type: 'text', text: 'to see available blocks and commands. This includes headings, lists, code blocks, quotes, and more!' }
          ]
        },
        
        {
          type: 'paragraph',
          attrs: { align: 'center' },
          content: [
            { type: 'text', text: 'This example demonstrates all available blocks, marks, and styling options in the Zap Editor!' }
          ]
        }
      ]
    };
    
    this.editorValue.set(JSON.stringify(exampleContent));
  }

  clearEditor() {
    if (this.defaultEditor) {
      this.defaultEditor.clearContent();
    }
  }

  getEditorContent() {
    if (this.defaultEditor) {
      const content = this.defaultEditor.getContent();
      this.editorValue.set(content);
      this.lastUpdated.set(new Date().toLocaleTimeString());
      alert('Content updated and logged to console');
    }
  }

  testContentChange() {
    if (this.defaultEditor) {
      const testContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            attrs: { align: 'left' },
            content: [
              { type: 'text', text: 'Test content change at ' },
              { type: 'text', text: new Date().toLocaleTimeString() }
            ]
          }
        ]
      };
      
      this.defaultEditor.setContent(JSON.stringify(testContent));
    }
  }

  toggleAutoSave() {
    this.autoSave.set(!this.autoSave());
  }

  clearLocalStorage() {
    if (isPlatformBrowser(this.platformId)) {
      try {
        localStorage.removeItem(this.storageKey());
        this.editorValue.set('');
        this.lastUpdated.set('LocalStorage cleared');
      } catch (error) {
      }
    }
  }

  setToolbar(toolbar: 'inline' | 'default') {
    localStorage.setItem('toolbar', toolbar);
    this.toolbar.set(toolbar);
  }
}
