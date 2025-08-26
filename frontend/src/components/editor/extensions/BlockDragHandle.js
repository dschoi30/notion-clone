import { Extension } from '@tiptap/core';
import { Plugin, PluginKey, NodeSelection } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { dropPoint } from '@tiptap/pm/transform';
import { Fragment, Slice } from '@tiptap/pm/model';

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
            dragover(view, event) {
              // 드롭 가능 상태 유지 (일부 브라우저에서 필수)
              event.preventDefault();
              if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
              return true;
            },
          },
          handleDragStart(view, event) {
            const target = event.target;
            if (!(target instanceof HTMLElement)) return false;
            if (!target.classList.contains('pm-block-handle')) return false;

            const sel = view.state.selection;
            if (!(sel instanceof NodeSelection)) return true;

            if (event.dataTransfer) {
              event.dataTransfer.effectAllowed = 'move';
              // 일부 브라우저에서 drag가 시작되도록 임의 데이터가 필요
              event.dataTransfer.setData('text/plain', 'block');
            }

            const dom = view.nodeDOM(sel.from);
            if (dom instanceof HTMLElement && event.dataTransfer) {
              event.dataTransfer.setDragImage(dom, 10, 10);
            }

            dragInfo = { from: sel.from, node: sel.node };
            return true; // 우리가 처리했음을 명시
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
            let tr = view.state.tr;

            // 먼저 원본 노드 삭제
            tr = tr.delete(from, from + node.nodeSize);

            // 삭제 후 좌표를 현재 트랜잭션 기준으로 매핑
            const mappedPos = tr.mapping.map(found.pos);

            // 드롭 지점에 유효한 삽입 위치 계산
            const slice = new Slice(Fragment.from(node.type.create(node.attrs, node.content, node.marks)), 0, 0);
            const dropPos = dropPoint(tr.doc, mappedPos, slice);
            if (dropPos == null) {
              dragInfo = null;
              return true; // 유효 위치 없으면 아무 것도 하지 않음
            }

            tr = tr.replace(dropPos, dropPos, slice);
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


