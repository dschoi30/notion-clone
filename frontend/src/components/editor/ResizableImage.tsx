import React, { useRef } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import { Node as ProseMirrorNode } from '@tiptap/pm/model';

interface ImageAttributes {
  width?: number;
  height?: number | 'auto';
  src?: string;
  alt?: string;
  uploading?: boolean;
}

interface ResizableImageProps {
  node: ProseMirrorNode;
  updateAttributes: (attrs: Partial<ImageAttributes>) => void;
  selected: boolean;
}

const MIN_SIZE = 50;

const ResizableImage: React.FC<ResizableImageProps> = ({ node, updateAttributes, selected }) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const { src, width = 300, height = 'auto', alt = '', uploading = false } = node.attrs;

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!imgRef.current) return;
    
    const startX = e.clientX;
    const startWidth = imgRef.current.offsetWidth;
    
    const onMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(MIN_SIZE, startWidth + (moveEvent.clientX - startX));
      updateAttributes({ width: newWidth });
    };
    
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  return (
    <NodeViewWrapper 
      className={`resizable-image${selected ? ' ProseMirror-selectednode' : ''}`}
      style={{ display: 'inline-block', position: 'relative' }}
    >
      {uploading ? (
        <div
          style={{
            width: width,
            height: height === 'auto' ? width : height,
            maxWidth: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f3f4f6',
            border: '2px dashed #d1d5db',
            borderRadius: '4px',
            position: 'relative',
          }}
        >
          <div style={{ textAlign: 'center', color: '#6b7280' }}>
            <div style={{ marginBottom: '8px' }}>
              <svg
                className="animate-spin"
                style={{ width: '24px', height: '24px', margin: '0 auto', display: 'block' }}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  style={{ opacity: 0.25 }}
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  style={{ opacity: 0.75 }}
                />
              </svg>
            </div>
            <div style={{ fontSize: '12px' }}>업로드 중...</div>
          </div>
        </div>
      ) : (
        <>
          <img
            ref={imgRef}
            src={src}
            alt={alt}
            style={{ width: width, height: height, maxWidth: '100%', display: 'block' }}
            draggable={false}
          />
          <span
            style={{
              position: 'absolute',
              right: 0,
              bottom: 0,
              width: 16,
              height: 16,
              background: '#fff',
              border: '1px solid #ccc',
              cursor: 'nwse-resize',
              zIndex: 10,
            }}
            onMouseDown={startResize}
          />
        </>
      )}
    </NodeViewWrapper>
  );
};

export default ResizableImage;

