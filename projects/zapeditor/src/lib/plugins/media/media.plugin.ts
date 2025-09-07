import { Plugin } from 'prosemirror-state';
import { Node as ProseMirrorNode } from 'prosemirror-model';
import { EditorView, NodeView } from 'prosemirror-view';

import { MEDIA_CONSTANTS } from './media.constant';
import { 
  getFileIcon, 
  formatFileSize, 
  createToolbarButton, 
  cleanupTooltips, 
  initializeTooltips, 
  downloadFile, 
  calculateResizeConstraints, 
  calculateNewDimensions 
} from './media.util';

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
  private mediaWidth: number = MEDIA_CONSTANTS.DEFAULT_WIDTH;
  private mediaHeight: number = MEDIA_CONSTANTS.DEFAULT_HEIGHT;

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

    this.createMediaElement(container);
    this.createResizeHandles(container);
    this.createToolbar(container);
    this.setupEventListeners(container);
    this.initializeTooltips(container);

    this.dom.appendChild(container);
  }

  private createMediaElement(container: HTMLElement) {
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
  }

  private createResizeHandles(container: HTMLElement) {
    if (this.mediaType === 'image' || this.mediaType === 'video') {
      const leftHandle = document.createElement('div');
      leftHandle.className = 'media__resize__handle media__resize__handle__left';
      container.appendChild(leftHandle);

      const rightHandle = document.createElement('div');
      rightHandle.className = 'media__resize__handle media__resize__handle__right';
      container.appendChild(rightHandle);
    }
  }

  private createToolbar(container: HTMLElement) {
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
  }

  private setupEventListeners(container: HTMLElement) {
    const toolbar = container.querySelector('.media__toolbar') as HTMLElement;
    
    container.addEventListener('mouseenter', () => {
      this.showControls(container, toolbar);
    });

    container.addEventListener('mouseleave', () => {
      this.hideControls(container, toolbar);
    });

    if (this.mediaType === 'image' || this.mediaType === 'video') {
      this.setupResizeHandles(container);
    }
  }

  private showControls(container: HTMLElement, toolbar: HTMLElement) {
    if (this.mediaType === 'image' || this.mediaType === 'video') {
      const leftHandle = container.querySelector('.media__resize__handle__left') as HTMLElement;
      const rightHandle = container.querySelector('.media__resize__handle__right') as HTMLElement;
      if (leftHandle) leftHandle.style.opacity = '1';
      if (rightHandle) rightHandle.style.opacity = '1';
    }
    toolbar.style.opacity = '1';
  }

  private hideControls(container: HTMLElement, toolbar: HTMLElement) {
    if (this.mediaType === 'image' || this.mediaType === 'video') {
      const leftHandle = container.querySelector('.media__resize__handle__left') as HTMLElement;
      const rightHandle = container.querySelector('.media__resize__handle__right') as HTMLElement;
      if (leftHandle) leftHandle.style.opacity = '0';
      if (rightHandle) rightHandle.style.opacity = '0';
    }
    toolbar.style.opacity = '0';
  }

  private setupResizeHandles(container: HTMLElement) {
    const leftHandle = container.querySelector('.media__resize__handle__left') as HTMLElement;
    const rightHandle = container.querySelector('.media__resize__handle__right') as HTMLElement;
    
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
    return getFileIcon(this.mediaAlt);
  }

  private formatFileSize(): string {
    const fileSize = this.node.attrs['size'];
    return formatFileSize(fileSize);
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
    return createToolbarButton(iconClass, title);
  }

  private initializeTooltips(container: HTMLElement) {
    initializeTooltips(container);
  }

  private startResize(e: MouseEvent, direction: 'left' | 'right') {
    const startX = e.clientX;
    const startWidth = this.mediaWidth;
    const startHeight = this.mediaHeight;
    
    const editorElement = this.view.dom;
    const constraints = calculateResizeConstraints(editorElement);

    const onMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX;
      const { newWidth, newHeight } = calculateNewDimensions(
        startWidth, 
        startHeight, 
        deltaX, 
        direction, 
        constraints
      );
      
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
    modal.className = 'ze__media__preview__modal';

    const content = document.createElement('div');
    content.className = 'ze__media__preview__content';

    const header = this.createModalHeader();
    const mediaContainer = this.createModalMediaContainer();

    this.setupModalEventListeners(modal, content);

    content.appendChild(header);
    content.appendChild(mediaContainer);
    modal.appendChild(content);

    document.body.appendChild(modal);
    this.initializeTooltips(modal);
    document.body.style.overflow = 'hidden';
  }

  private createModalHeader() {
    const header = document.createElement('div');
    header.className = 'ze__media__preview__header';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'ze__media__preview__close';
    closeBtn.innerHTML = '<i class="fa-regular fa-times"></i>';
    closeBtn.setAttribute('zapEditorTooltip', 'Close');

    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'ze__media__preview__download';
    downloadBtn.innerHTML = '<i class="fa-regular fa-download"></i>';
    downloadBtn.setAttribute('zapEditorTooltip', 'Download');

    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.closePreviewModal(closeBtn.closest('.ze__media__preview__modal') as HTMLElement);
    });

    downloadBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onDownload();
    });

    header.appendChild(downloadBtn);
    header.appendChild(closeBtn);

    return header;
  }

  private createModalMediaContainer() {
    const mediaContainer = document.createElement('div');
    mediaContainer.className = 'ze__media__preview__media';

    const mediaElement = this.createModalMediaElement();
    mediaContainer.appendChild(mediaElement);

    return mediaContainer;
  }

  private createModalMediaElement(): HTMLElement {
    if (this.mediaType === 'image') {
      const img = document.createElement('img');
      img.src = this.mediaUrl;
      img.alt = this.mediaAlt;
      img.className = 'w-full h-full object-contain block cursor-zoom-in';
      
      img.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleImageZoom(img);
      });

      return img;
    } else {
      const video = document.createElement('video');
      video.src = this.mediaUrl;
      video.controls = true;
      video.className = 'w-full h-full object-contain block';
      return video;
    }
  }

  private setupModalEventListeners(modal: HTMLElement, content: HTMLElement) {
    modal.addEventListener('click', () => {
      this.closePreviewModal(modal);
    });

    content.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  private closePreviewModal(modal: HTMLElement) {
    cleanupTooltips(modal);
    modal.remove();
    document.body.style.overflow = '';
  }

  private toggleImageZoom(imgElement: HTMLImageElement) {
    const isZoomed = imgElement.classList.contains('zoomed');
    
    if (isZoomed) {
      imgElement.classList.remove('zoomed');
      imgElement.classList.add('cursor-zoom-in');
      imgElement.style.transform = 'scale(1)';
      imgElement.style.cursor = 'zoom-in';
    } else {
      imgElement.classList.add('zoomed');
      imgElement.classList.remove('cursor-zoom-in');
      imgElement.style.transform = 'scale(1.5)';
      imgElement.style.cursor = 'zoom-out';
    }
  }

  private onDownload() {
    downloadFile(this.mediaUrl, this.mediaAlt);
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
    cleanupTooltips(this.dom);

    if (this.mediaUrl) {
      URL.revokeObjectURL(this.mediaUrl);
    }
  }
}
