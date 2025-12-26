import { Extension } from '@tiptap/core';

export const TabIndent = Extension.create({
  name: 'tabIndent',

  addKeyboardShortcuts() {
    return {
      Tab: () => {
        // Tab 키를 눌렀을 때 4칸 들여쓰기
        const { state, dispatch } = this.editor.view;
        const { selection } = state;
        
        // 현재 선택된 텍스트가 있으면 기본 동작 수행
        if (!selection.empty) {
          return false;
        }
        
        // 현재 라인의 시작 위치 찾기
        const { $from } = selection;
        const currentPos = $from.pos;
        
        // 4칸 공백 추가
        const spacesToAdd = '    ';
        const tr = state.tr.insertText(spacesToAdd, currentPos, currentPos);
        dispatch(tr);
        
        return true;
      },
      
      'Shift-Tab': () => {
        // Shift+Tab 키를 눌렀을 때 4칸 내어쓰기
        const { state, dispatch } = this.editor.view;
        const { selection } = state;
        
        // 현재 선택된 텍스트가 있으면 기본 동작 수행
        if (!selection.empty) {
          return false;
        }
        
        const { $from } = selection;
        const lineStart = $from.start($from.depth);
        const currentPos = $from.pos;
        
        // 현재 라인에 있는 공백 개수 계산
        const lineText = state.doc.textBetween(lineStart, currentPos);
        const leadingSpaces = lineText.match(/^(\s*)/)?.[1] || '';
        
        // 4칸 이상의 공백이 있으면 4칸 제거, 그렇지 않으면 모든 공백 제거
        let spacesToRemove = 0;
        if (leadingSpaces.length >= 4) {
          spacesToRemove = 4;
        } else if (leadingSpaces.length > 0) {
          spacesToRemove = leadingSpaces.length;
        }
        
        if (spacesToRemove > 0) {
          const tr = state.tr.delete(currentPos - spacesToRemove, currentPos);
          dispatch(tr);
        }
        
        return true;
      },
    };
  },
});

export default TabIndent;

