import { Extension } from '@tiptap/core';
import { Plugin, PluginKey, NodeSelection } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

/**
 * BlockDragHandle
 * - 각 블록 노드 시작 위치에 드래그 핸들을 표시하고, 핸들을 통해 블록을 선택/드래그하여 이동할 수 있게 합니다.
 * - 초기 버전은 단일 블록 이동만 지원합니다.
 */
export const BlockDragHandle = Extension.create({
  name: 'blockDragHandle',

  addProseMirrorPlugins() {
    const key = new PluginKey('blockDragHandle');
    let dragInfo = null; // { from: number, node }

    return [
      new Plugin({
        key,
        state: {
          init() {
            return DecorationSet.empty;
          },
          apply(tr, old) {
            // 문서가 변경되었거나, 선택이 바뀌었을 때만 데코레이션 재계산
            if (!tr.docChanged && !tr.selectionSet) return old;

            const decorations = [];
            tr.doc.descendants((node, pos) => {
              if (!node.isBlock) return;

              const deco = Decoration.widget(
                pos,
                () => {
                  const el = document.createElement('button');
                  el.className = 'pm-block-handle';
                  el.setAttribute('data-pos', String(pos));
                  el.setAttribute('draggable', 'true');
                  el.type = 'button';
                  el.title = '블록 드래그';
                  el.textContent = '⋮⋮';
                  return el;
                },
                { side: -1 }
              );
              decorations.push(deco);
            });

            return DecorationSet.create(tr.doc, decorations);
          },
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
          handleDOMEvents: {
            mousedown(view, event) {
              const target = event.target;
              if (!(target instanceof HTMLElement)) return false;
              if (!target.classList.contains('pm-block-handle')) return false;

              const posAttr = target.getAttribute('data-pos');
              if (!posAttr) return false;
              const pos = Number(posAttr);
              if (Number.isNaN(pos)) return false;

              const tr = view.state.tr.setSelection(NodeSelection.create(view.state.doc, pos));
              view.dispatch(tr);
              return true;
            },
            dragstart(view, event) {
              const target = event.target;
              if (!(target instanceof HTMLElement)) return false;
              if (!target.classList.contains('pm-block-handle')) return false;

              const sel = view.state.selection;
              if (!(sel instanceof NodeSelection)) return false;

              if (event.dataTransfer) {
                event.dataTransfer.effectAllowed = 'move';
                // 일부 브라우저에서 drag가 시작되도록 임의 데이터가 필요
                event.dataTransfer.setData('text/plain', 'block');
              }

              dragInfo = { from: sel.from, node: sel.node }; // 드래그 정보 저장
              return true;
            },
          },
          handleDragStart(view, event) {
            const sel = view.state.selection;
            if (sel instanceof NodeSelection) {
              const dom = view.nodeDOM(sel.from);
              if (dom instanceof HTMLElement && event.dataTransfer) {
                // 기본 드래그 프리뷰를 선택 노드로 설정
                event.dataTransfer.setDragImage(dom, 10, 10);
              }
              return false; // PM 기본 동작 허용
            }
            return false;
          },
          handleDrop(view, event) {
            // 우리가 시작한 블록 드래그만 처리
            if (!dragInfo) return false;
            event.preventDefault();

            const coords = { left: event.clientX, top: event.clientY };
            const found = view.posAtCoords(coords);
            if (!found || found.pos == null) return false;

            const { from, node } = dragInfo;
            if (!node) { dragInfo = null; return false; }

            // 원위치와 동일/바로 인접 위치 드롭은 무시
            if (found.pos >= from && found.pos <= from + node.nodeSize) { dragInfo = null; return true; }

            let tr = view.state.tr.delete(from, from + node.nodeSize);

            // 드롭 위치를 블록 경계로 스냅
            const $pos = tr.doc.resolve(Math.min(found.pos, tr.doc.content.size));
            // 가능한 한 현재 깊이에서 블록 앞 위치를 찾음
            let insertPos;
            try {
              insertPos = $pos.before($pos.depth);
            } catch (e) {
              insertPos = $pos.start($pos.depth);
            }

            tr = tr.insert(insertPos, node.type.create(node.attrs, node.content, node.marks));
            view.dispatch(tr.scrollIntoView());
            dragInfo = null;
            return true;
          },
        },
      }),
    ];
  },
});

export default BlockDragHandle;


