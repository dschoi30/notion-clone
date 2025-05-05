import React, { useRef } from 'react';
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';

const MIN_SIZE = 50;

const ResizableImage = ({ node, updateAttributes, selected }) => {
  const imgRef = useRef(null);
  const { src, width = 300, height = 'auto', alt = '' } = node.attrs;

  const startResize = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = imgRef.current.offsetWidth;
    const onMouseMove = (moveEvent) => {
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
    <NodeViewWrapper className={`resizable-image${selected ? ' ProseMirror-selectednode' : ''}`}
      style={{ display: 'inline-block', position: 'relative' }}>
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
    </NodeViewWrapper>
  );
};

export default ResizableImage; 