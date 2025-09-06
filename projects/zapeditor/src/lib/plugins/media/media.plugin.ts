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
  private mediaType: 'image' | 'video' | 'document' = 'image';
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
      this.createUploadingState();
    } else if (this.isUploaded && this.mediaUrl) {
      this.createUploadedState();
    } else {
      this.createPlaceholderState();
    }
  }

  private createUploadingState() {
    const overlay = document.createElement('div');
    overlay.className = 'media__uploading__container';
    overlay.style.width = `${this.mediaWidth}px`;
    overlay.style.height = `${this.mediaHeight}px`;

    if (this.mediaUrl) {
      const bgImage = document.createElement('div');
      bgImage.className = 'media__uploading__bg';
      bgImage.style.backgroundImage = `url(${this.mediaUrl})`;
      overlay.appendChild(bgImage);
    }

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
    } else {
      const documentPreview = this.createDocumentPreview();
      container.appendChild(documentPreview);
    }

    if (this.mediaType === 'image' || this.mediaType === 'video') {
      const leftResizeHandle = document.createElement('div');
      leftResizeHandle.className = 'media__resize__handle media__resize__handle--left';
      leftResizeHandle.setAttribute('zapEditorTooltip', 'Resize');
      container.appendChild(leftResizeHandle);

      const rightResizeHandle = document.createElement('div');
      rightResizeHandle.className = 'media__resize__handle media__resize__handle--right';
      rightResizeHandle.setAttribute('zapEditorTooltip', 'Resize');
      container.appendChild(rightResizeHandle);
    }

    const toolbar = document.createElement('div');
    toolbar.className = 'media__toolbar';

    if (this.mediaType === 'image' || this.mediaType === 'video') {
      const expandBtn = this.createToolbarButton('fa-expand', 'Expand');
      expandBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.onExpand();
      });
      toolbar.appendChild(expandBtn);
    }

    const downloadBtn = this.createToolbarButton('fa-download', 'Download');
    downloadBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onDownload();
    });
    toolbar.appendChild(downloadBtn);

    const deleteBtn = this.createToolbarButton('fa-trash', 'Delete');
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onDelete();
    });
    toolbar.appendChild(deleteBtn);

    container.appendChild(toolbar);

    this.initializeTooltips(container);

    container.addEventListener('mouseenter', () => {
      if (this.mediaType === 'image' || this.mediaType === 'video') {
        const leftHandle = container.querySelector('.media__resize__handle--left') as HTMLElement;
        const rightHandle = container.querySelector('.media__resize__handle--right') as HTMLElement;
        if (leftHandle) leftHandle.style.opacity = '1';
        if (rightHandle) rightHandle.style.opacity = '1';
      }
      toolbar.style.opacity = '1';
    });

    container.addEventListener('mouseleave', () => {
      if (this.mediaType === 'image' || this.mediaType === 'video') {
        const leftHandle = container.querySelector('.media__resize__handle--left') as HTMLElement;
        const rightHandle = container.querySelector('.media__resize__handle--right') as HTMLElement;
        if (leftHandle) leftHandle.style.opacity = '0';
        if (rightHandle) rightHandle.style.opacity = '0';
      }
      toolbar.style.opacity = '0';
    });

    if (this.mediaType === 'image' || this.mediaType === 'video') {
      const leftHandle = container.querySelector('.media__resize__handle--left') as HTMLElement;
      const rightHandle = container.querySelector('.media__resize__handle--right') as HTMLElement;
      
      if (leftHandle) {
        leftHandle.addEventListener('mousedown', (e) => {
          e.preventDefault();
          this.startResize(e, 'left');
        });
      }

      if (rightHandle) {
        rightHandle.addEventListener('mousedown', (e) => {
          e.preventDefault();
          this.startResize(e, 'right');
        });
      }
    }

    this.dom.appendChild(container);
  }

  private createDocumentPreview() {
    const preview = document.createElement('div');
    preview.className = 'media__document__preview';
    
    const icon = document.createElement('div');
    icon.className = 'media__document__icon';
    icon.innerHTML = this.getFileIcon();
    
    const details = document.createElement('div');
    details.className = 'media__document__details';
    
    const fileName = document.createElement('div');
    fileName.className = 'media__document__name';
    fileName.textContent = this.mediaAlt;
    
    const fileSize = document.createElement('div');
    fileSize.className = 'media__document__size';
    fileSize.textContent = this.formatFileSize();
    
    details.appendChild(fileName);
    details.appendChild(fileSize);
    
    preview.appendChild(icon);
    preview.appendChild(details);
    
    return preview;
  }

  private getFileIcon(): string {
    const extension = this.mediaAlt.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'pdf':
        return '<i class="fa-regular fa-file-pdf"></i>';
      case 'doc':
      case 'docx':
        return '<i class="fa-regular fa-file-word"></i>';
      case 'xls':
      case 'xlsx':
        return '<i class="fa-regular fa-file-excel"></i>';
      case 'ppt':
      case 'pptx':
        return '<i class="fa-regular fa-file-powerpoint"></i>';
      case 'zip':
      case 'rar':
      case '7z':
        return '<i class="fa-regular fa-file-archive"></i>';
      case 'txt':
        return '<i class="fa-regular fa-file-lines"></i>';
      case 'csv':
        return '<i class="fa-regular fa-file-csv"></i>';
      case 'js':
      case 'ts':
      case 'css':
      case 'html':
        return '<i class="fa-regular fa-file-code"></i>';
      default:
        return '<i class="fa-regular fa-file"></i>';
    }
  }

  private formatFileSize(): string {
    const fileSize = this.node.attrs['size'];
    
    if (!fileSize || fileSize === 0) {
      return '0 B';
    }

    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = fileSize;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    if (unitIndex === 0) {
      return `${Math.round(size)} ${units[unitIndex]}`;
    } else if (size < 10) {
      return `${size.toFixed(2)} ${units[unitIndex]}`;
    } else if (size < 100) {
      return `${size.toFixed(1)} ${units[unitIndex]}`;
    } else {
      return `${Math.round(size)} ${units[unitIndex]}`;
    }
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
    button.setAttribute('zapEditorTooltip', title);
    
    const icon = document.createElement('i');
    icon.className = `fa-regular ${iconClass}`;
    button.appendChild(icon);
    
    return button;
  }

  private initializeTooltips(container: HTMLElement) {
    import('../../services/tooltip.service').then(({ TooltipService }) => {
      const tooltipService = new TooltipService();
      
      const elementsWithTooltips = container.querySelectorAll('[zapEditorTooltip]');
      
      elementsWithTooltips.forEach((element) => {
        const tooltipText = element.getAttribute('zapEditorTooltip');
        if (tooltipText) {
          const cleanupFn = tooltipService.createTooltip({
            text: tooltipText,
            delay: 500,
            element: element as HTMLElement
          });
          
          (element as any).__tooltipCleanup = cleanupFn;
        }
      });
    });
  }

  private startResize(e: MouseEvent, direction: 'left' | 'right') {
    const startX = e.clientX;
    const startWidth = this.mediaWidth;
    const aspectRatio = startWidth / this.mediaHeight;
    
    const editorElement = this.view.dom;
    const editorRect = editorElement.getBoundingClientRect();
    const editorWidth = editorRect.width;
    const maxWidth = Math.min(editorWidth - 32, 800); // Leave 16px margin on each side
    const minWidth = 100;

    const onMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX;
      let newWidth = startWidth;

      if (direction === 'right') {
        newWidth = Math.max(minWidth, Math.min(maxWidth, startWidth + deltaX));
      } else {
        newWidth = Math.max(minWidth, Math.min(maxWidth, startWidth - deltaX));
      }

      const newHeight = newWidth / aspectRatio;
      
      this.mediaWidth = newWidth;
      this.mediaHeight = newHeight;
      
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
    this.createPreviewModal();
  }

  private createPreviewModal() {
    const modal = document.createElement('div');
    modal.className = 'media__preview__modal';

    const content = document.createElement('div');
    content.className = 'media__preview__content';

    const header = document.createElement('div');
    header.className = 'media__preview__header';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'media__preview__close';
    closeBtn.innerHTML = '<i class="fa-regular fa-times"></i>';
    closeBtn.setAttribute('zapEditorTooltip', 'Close');

    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'media__preview__download';
    downloadBtn.innerHTML = '<i class="fa-regular fa-download"></i>';
    downloadBtn.setAttribute('zapEditorTooltip', 'Download');

    const mediaContainer = document.createElement('div');
    mediaContainer.className = 'media__preview__media';

    let mediaElement: HTMLElement;
    if (this.mediaType === 'image') {
      mediaElement = document.createElement('img');
      (mediaElement as HTMLImageElement).src = this.mediaUrl;
      (mediaElement as HTMLImageElement).alt = this.mediaAlt;
      mediaElement.className = 'w-full h-full object-contain block cursor-zoom-in';
      
      // Add click-to-zoom functionality for images
      mediaElement.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleImageZoom(mediaElement as HTMLImageElement);
      });
    } else {
      mediaElement = document.createElement('video');
      (mediaElement as HTMLVideoElement).src = this.mediaUrl;
      (mediaElement as HTMLVideoElement).controls = true;
      mediaElement.className = 'w-full h-full object-contain block';
    }

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

    header.appendChild(downloadBtn);
    header.appendChild(closeBtn);
    mediaContainer.appendChild(mediaElement);
    content.appendChild(header);
    content.appendChild(mediaContainer);
    modal.appendChild(content);

    document.body.appendChild(modal);

    this.initializeTooltips(modal);

    document.body.style.overflow = 'hidden';
  }

  private closePreviewModal(modal: HTMLElement) {
    const elementsWithTooltips = modal.querySelectorAll('[zapEditorTooltip]');
    elementsWithTooltips.forEach((element) => {
      if ((element as any).__tooltipCleanup) {
        (element as any).__tooltipCleanup();
      }
    });

    modal.remove();
    document.body.style.overflow = '';
  }

  private toggleImageZoom(imgElement: HTMLImageElement) {
    const isZoomed = imgElement.classList.contains('zoomed');
    
    if (isZoomed) {
      // Reset zoom
      imgElement.classList.remove('zoomed');
      imgElement.classList.add('cursor-zoom-in');
      imgElement.style.transform = 'scale(1)';
      imgElement.style.cursor = 'zoom-in';
    } else {
      // Apply zoom
      imgElement.classList.add('zoomed');
      imgElement.classList.remove('cursor-zoom-in');
      imgElement.style.transform = 'scale(1.5)';
      imgElement.style.cursor = 'zoom-out';
    }
  }

  private onDownload() {
    const link = document.createElement('a');
    link.href = this.mediaUrl;
    link.download = this.mediaAlt || 'media-download';
    link.target = '_blank';
    link.click();
  }

  private onDelete() {
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
    const elementsWithTooltips = this.dom.querySelectorAll('[zapEditorTooltip]');
    elementsWithTooltips.forEach((element) => {
      if ((element as any).__tooltipCleanup) {
        (element as any).__tooltipCleanup();
      }
    });

    if (this.mediaUrl) {
      URL.revokeObjectURL(this.mediaUrl);
    }
  }
}
