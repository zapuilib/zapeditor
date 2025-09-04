import { Plugin } from 'prosemirror-state';
import { Node as ProseMirrorNode } from 'prosemirror-model';
import { EditorView, NodeView } from 'prosemirror-view';

export function mediaPlugin() {
  return new Plugin({
    props: {
      nodeViews: {
        media: (node: ProseMirrorNode, view: EditorView, getPos: () => number | undefined): NodeView => {
          return new MediaNodeView(node, view, getPos);
        },
      },
    },
  });
}

class MediaNodeView implements NodeView {
  public dom: HTMLElement;
  public contentDOM?: HTMLElement;
  private isUploading = false;
  private isUploaded = false;
  private mediaUrl = '';
  private mediaType: 'image' | 'video' = 'image';
  private mediaAlt = '';
  private mediaWidth = 300;
  private mediaHeight = 200;

  constructor(
    private node: ProseMirrorNode,
    private view: EditorView,
    private getPos: () => number | undefined
  ) {
    this.dom = this.createDOM();
    this.updateFromNode();
  }

  private createDOM(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'media__node';

    // Prevent click from selecting the whole line
    container.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    return container;
  }

  private updateFromNode() {
    const { src, alt, type, uploading, width, height } = this.node.attrs;
    
    this.mediaUrl = src || '';
    this.mediaAlt = alt || '';
    this.mediaType = type || 'image';
    this.isUploading = uploading || false;
    this.isUploaded = !!(src && !uploading);
    
    if (width) this.mediaWidth = width;
    if (height) this.mediaHeight = height;
    
    this.updateDOM();
  }

  private updateDOM() {
    this.dom.innerHTML = '';

    if (this.isUploading) {
      // Show uploading state with same dimensions as final image
      this.createUploadingState();
    } else if (this.isUploaded && this.mediaUrl) {
      // Show uploaded media
      this.createUploadedState();
    } else {
      // Show placeholder
      this.createPlaceholderState();
    }
  }

  private createUploadingState() {
    const overlay = document.createElement('div');
    overlay.className = 'media__uploading__container';
    overlay.style.width = `${this.mediaWidth}px`;
    overlay.style.height = `${this.mediaHeight}px`;

    // Background image preview (blurred)
    if (this.mediaUrl) {
      const bgImage = document.createElement('div');
      bgImage.className = 'media__uploading__bg';
      bgImage.style.backgroundImage = `url(${this.mediaUrl})`;
      overlay.appendChild(bgImage);
    }

    // Spinner
    const spinner = document.createElement('div');
    spinner.className = 'media__upload__spinner';
    overlay.appendChild(spinner);

    this.dom.appendChild(overlay);
  }

  private createUploadedState() {
    const container = document.createElement('div');
    container.className = 'media__uploaded__container';
    container.style.width = `${this.mediaWidth}px`;
    container.style.height = `${this.mediaHeight}px`;

    if (this.mediaType === 'image') {
      const img = document.createElement('img');
      img.className = 'media__uploaded__img';
      img.src = this.mediaUrl;
      img.alt = this.mediaAlt;
      container.appendChild(img);
    } else if (this.mediaType === 'video') {
      const video = document.createElement('video');
      video.className = 'media__uploaded__video';
      video.src = this.mediaUrl;
      video.controls = true;
      container.appendChild(video);
    }

    // Left resize handle
    const leftResizeHandle = document.createElement('div');
    leftResizeHandle.className = 'media__resize__handle media__resize__handle--left';
    container.appendChild(leftResizeHandle);

    // Right resize handle
    const rightResizeHandle = document.createElement('div');
    rightResizeHandle.className = 'media__resize__handle media__resize__handle--right';
    container.appendChild(rightResizeHandle);

    // Toolbar (shown on hover)
    const toolbar = document.createElement('div');
    toolbar.className = 'media__toolbar';

    // Expand button
    const expandBtn = this.createToolbarButton('fa-expand', 'Expand');
    expandBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onExpand();
    });
    toolbar.appendChild(expandBtn);

    // Download button
    const downloadBtn = this.createToolbarButton('fa-download', 'Download');
    downloadBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onDownload();
    });
    toolbar.appendChild(downloadBtn);

    // Delete button
    const deleteBtn = this.createToolbarButton('fa-trash', 'Delete');
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onDelete();
    });
    toolbar.appendChild(deleteBtn);

    container.appendChild(toolbar);

    // Hover effects
    container.addEventListener('mouseenter', () => {
      leftResizeHandle.style.opacity = '1';
      rightResizeHandle.style.opacity = '1';
      toolbar.style.opacity = '1';
    });

    container.addEventListener('mouseleave', () => {
      leftResizeHandle.style.opacity = '0';
      rightResizeHandle.style.opacity = '0';
      toolbar.style.opacity = '0';
    });

    // Resize functionality
    leftResizeHandle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.startResize(e, 'left');
    });

    rightResizeHandle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.startResize(e, 'right');
    });

    this.dom.appendChild(container);
  }

  private createPlaceholderState() {
    const placeholder = document.createElement('div');
    placeholder.className = 'media__placeholder';
    placeholder.style.width = `${this.mediaWidth}px`;
    placeholder.style.height = `${this.mediaHeight}px`;
    placeholder.textContent = 'No media selected';
    this.dom.appendChild(placeholder);
  }

  private createToolbarButton(iconClass: string, title: string): HTMLElement {
    const button = document.createElement('button');
    button.title = title;
    
    const icon = document.createElement('i');
    icon.className = `fa-regular ${iconClass}`;
    button.appendChild(icon);
    
    return button;
  }

  private startResize(e: MouseEvent, direction: 'left' | 'right') {
    const startX = e.clientX;
    const startWidth = this.mediaWidth;
    const aspectRatio = startWidth / this.mediaHeight;
    
    // Get editor boundaries
    const editorElement = this.view.dom;
    const editorRect = editorElement.getBoundingClientRect();
    const editorWidth = editorRect.width;
    const maxWidth = Math.min(editorWidth - 32, 800); // Leave 16px margin on each side
    const minWidth = 100;

    const onMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX;
      let newWidth = startWidth;

      if (direction === 'right') {
        // Right resize - drag right (positive delta) should resize up
        newWidth = Math.max(minWidth, Math.min(maxWidth, startWidth + deltaX));
      } else {
        // Left resize - drag inside (positive delta) should resize down
        newWidth = Math.max(minWidth, Math.min(maxWidth, startWidth - deltaX));
      }

      const newHeight = newWidth / aspectRatio;
      
      this.mediaWidth = newWidth;
      this.mediaHeight = newHeight;
      
      // Update the container width (it will auto-center due to margin: 0 auto)
      const container = this.dom.querySelector('.media__container') as HTMLElement;
      if (container) {
        container.style.width = `${newWidth}px`;
        container.style.height = `${newHeight}px`;
      }
      
      this.updateNodeAttrs({
        width: newWidth,
        height: newHeight
      });
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  private onExpand() {
    // Create full-width preview modal
    this.createPreviewModal();
  }

  private createPreviewModal() {
    // Create modal overlay
    const modal = document.createElement('div');
    modal.className = 'media__preview__modal';

    // Create modal content
    const content = document.createElement('div');
    content.className = 'media__preview__content';

    // Create header with buttons
    const header = document.createElement('div');
    header.className = 'media__preview__header';

    // Create close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'media__preview__close';
    closeBtn.innerHTML = '<i class="fa-regular fa-times"></i>';

    // Create download button
    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'media__preview__download';
    downloadBtn.innerHTML = '<i class="fa-regular fa-download"></i>';

    // Create media container
    const mediaContainer = document.createElement('div');
    mediaContainer.className = 'media__preview__media';

    // Create media element
    let mediaElement: HTMLElement;
    if (this.mediaType === 'image') {
      mediaElement = document.createElement('img');
      (mediaElement as HTMLImageElement).src = this.mediaUrl;
      (mediaElement as HTMLImageElement).alt = this.mediaAlt;
      mediaElement.className = 'w-full h-full object-contain block';
    } else {
      mediaElement = document.createElement('video');
      (mediaElement as HTMLVideoElement).src = this.mediaUrl;
      (mediaElement as HTMLVideoElement).controls = true;
      mediaElement.className = 'w-full h-full object-contain block';
    }

    // Add event listeners
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.closePreviewModal(modal);
    });

    downloadBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onDownload();
    });

    modal.addEventListener('click', () => {
      this.closePreviewModal(modal);
    });

    content.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    // Assemble modal
    header.appendChild(downloadBtn);
    header.appendChild(closeBtn);
    mediaContainer.appendChild(mediaElement);
    content.appendChild(header);
    content.appendChild(mediaContainer);
    modal.appendChild(content);

    // Add to document
    document.body.appendChild(modal);

    // Prevent body scroll
    document.body.style.overflow = 'hidden';
  }

  private closePreviewModal(modal: HTMLElement) {
    modal.remove();
    document.body.style.overflow = '';
  }

  private onDownload() {
    // Handle download functionality
    const link = document.createElement('a');
    link.href = this.mediaUrl;
    link.download = this.mediaAlt || 'media-download';
    link.target = '_blank';
    link.click();
  }

  private onDelete() {
    // Handle delete functionality
    const pos = this.getPos();
    if (pos !== undefined) {
      const tr = this.view.state.tr.delete(pos, pos + this.node.nodeSize);
      this.view.dispatch(tr);
    }
  }

  private updateNodeAttrs(attrs: Record<string, any>) {
    const pos = this.getPos();
    if (pos !== undefined) {
      const tr = this.view.state.tr.setNodeMarkup(pos, undefined, {
        ...this.node.attrs,
        ...attrs
      });
      this.view.dispatch(tr);
    }
  }

  update(node: ProseMirrorNode): boolean {
    if (node.type !== this.node.type) return false;
    this.node = node;
    this.updateFromNode();
    return true;
  }

  destroy() {
    // Clean up any event listeners or object URLs
    if (this.mediaUrl) {
      URL.revokeObjectURL(this.mediaUrl);
    }
  }
}
