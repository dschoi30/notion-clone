/**
 * ProseMirror 및 TipTap 타입 확장
 * 
 * 이 파일은 ProseMirror와 TipTap의 타입 정의를 확장하여
 * 커스텀 기능을 타입 안전하게 사용할 수 있도록 합니다.
 */

import '@tiptap/pm/view';
import '@tiptap/pm/state';
import '@tiptap/react';
import type { EditorView } from '@tiptap/pm/view';
import type { Slice } from '@tiptap/pm/model';

declare module '@tiptap/pm/view' {
  /**
   * EditorProps의 handlePaste를 async 함수로도 지원하도록 확장
   * ProseMirror의 기본 시그니처는 (view, event, slice?) => boolean | void 이지만,
   * 실제로는 async 함수도 지원하므로 Promise<boolean>을 반환 타입에 추가
   * 
   * 또한 Plugin의 props에서 사용할 수 있도록 드래그 관련 핸들러도 추가
   */
  export interface EditorProps {
    handlePaste?: (
      view: EditorView,
      event: ClipboardEvent,
      slice?: Slice
    ) => boolean | void | Promise<boolean>;
    handleDragStart?: (view: EditorView, event: DragEvent) => boolean;
    handleDragEnd?: (view: EditorView, event: DragEvent) => boolean;
    handleDrop?: (view: EditorView, event: DragEvent) => boolean;
  }
}

declare module '@tiptap/react' {
  /**
   * TipTap의 UseEditorOptions에서 editorProps의 타입을 확장
   */
  export interface UseEditorOptions {
    editorProps?: {
      handlePaste?: (
        view: EditorView,
        event: ClipboardEvent,
        slice?: Slice
      ) => boolean | void | Promise<boolean>;
      [key: string]: any;
    };
  }
}

declare module '@tiptap/pm/state' {
  /**
   * Plugin의 props에 드래그 관련 핸들러를 추가
   * ProseMirror Plugin은 props에 커스텀 핸들러를 추가할 수 있지만
   * 타입 정의에는 포함되어 있지 않으므로 확장
   */
  export interface PluginSpec {
    handleDragStart?: (view: EditorView, event: DragEvent) => boolean;
    handleDragEnd?: (view: EditorView, event: DragEvent) => boolean;
    handleDrop?: (view: EditorView, event: DragEvent) => boolean;
  }
}

