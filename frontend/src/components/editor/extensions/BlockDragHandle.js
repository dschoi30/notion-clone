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
    let hoverHandlePos = null; // 현재 호버 중인 블록 시작 pos
    let dragPreviewEl = null; // 커스텀 드래그 프리뷰 엘리먼트
    let lastDroppedEl = null; // 마지막 드랍된 블록 DOM 참조(지속 하이라이트)

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
              const $pos = tr.doc.resolve(pos);
              // 리스트 아이템(taskItem/listItem)의 내부 문단에는 핸들을 붙이지 않음
              const parent = $pos.parent;
              if (node.type.name === 'paragraph' && parent && (parent.type.name === 'taskItem' || parent.type.name === 'listItem')) {
                return;
              }
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
              let pos = Number(posAttr);
              if (Number.isNaN(pos)) return false;
              // 문단이 리스트 아이템 내부인 경우, 상위 taskItem/listItem 전체를 선택하도록 승격
              try {
                const $pos = view.state.doc.resolve(pos);
                for (let d = $pos.depth; d > 0; d -= 1) {
                  const nodeAtDepth = $pos.node(d);
                  if (nodeAtDepth && (nodeAtDepth.type.name === 'taskItem' || nodeAtDepth.type.name === 'listItem')) {
                    pos = $pos.before(d);
                    break;
                  }
                }
              } catch (_e) {}

              const tr = view.state.tr.setSelection(NodeSelection.create(view.state.doc, pos));
              view.dispatch(tr);
              return true;
            },
            mousemove(view, event) {
              const coords = { left: event.clientX, top: event.clientY };
              const found = view.posAtCoords(coords);
              if (!found || found.pos == null) return false;

              const $pos = view.state.doc.resolve(found.pos);
              // 가장 가까운 블록 노드 깊이 탐색
              let depth = $pos.depth;
              while (depth > 0 && !$pos.node(depth).isBlock) depth -= 1;
              if (depth <= 0) return false;

              const startPos = $pos.before(depth);
              if (hoverHandlePos === startPos) return false;

              // 이전 핸들 숨김
              if (hoverHandlePos != null) {
                const prev = view.dom.parentElement?.querySelector?.(`.pm-block-handle[data-pos="${hoverHandlePos}"]`);
                if (prev) prev.classList.remove('visible');
              }

              // 새 핸들 표시
              const next = view.dom.parentElement?.querySelector?.(`.pm-block-handle[data-pos="${startPos}"]`);
              if (next) next.classList.add('visible');
              hoverHandlePos = next ? startPos : null;
              return false;
            },
            mouseleave(view, _event) {
              if (hoverHandlePos != null) {
                const prev = view.dom.parentElement?.querySelector?.(`.pm-block-handle[data-pos="${hoverHandlePos}"]`);
                if (prev) prev.classList.remove('visible');
                hoverHandlePos = null;
              }
              return false;
            },
            dragover(view, event) {
              // 드롭 가능 상태 유지 (일부 브라우저에서 필수)
              event.preventDefault();
              if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
              // false를 반환하여 dropcursor 등 다른 플러그인이 dragover를 처리할 수 있게 함
              return false;
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
            
            // *TODO: 현재 드래그 프리뷰 미반영 중 - 차후 수정 필요
            const dom = view.nodeDOM(sel.from);
            if (event.dataTransfer) {
              const baseEl = dom instanceof HTMLElement ? dom : null;
              if (baseEl) {
                try {
                  const clone = baseEl.cloneNode(true);
                  const wrapper = document.createElement('div');
                  wrapper.className = 'pm-drag-preview';
                  wrapper.style.position = 'fixed';
                  wrapper.style.top = '-10000px';
                  wrapper.style.left = '-10000px';
                  wrapper.style.opacity = '0.6';
                  wrapper.style.pointerEvents = 'none';
                  wrapper.style.background = 'white';
                  wrapper.style.boxShadow = '0 2px 6px rgba(0,0,0,0.15)';
                  wrapper.appendChild(clone);
                  document.body.appendChild(wrapper);
                  dragPreviewEl = wrapper;
                  event.dataTransfer.setDragImage(wrapper, 10, 10);
                } catch (_e) {
                  if (baseEl) event.dataTransfer.setDragImage(baseEl, 10, 10);
                }
              }
            }

            dragInfo = { from: sel.from, node: sel.node };
            return true; // 우리가 처리했음을 명시
          },
          handleDragEnd(_view, _event) {
            if (dragPreviewEl && dragPreviewEl.parentNode) {
              dragPreviewEl.parentNode.removeChild(dragPreviewEl);
            }
            dragPreviewEl = null;
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

            // 원위치와 동일/바로 인접 위치 드롭은 무시 (리스트 아이템 전체 이동 고려)
            if (found.pos >= from && found.pos <= from + node.nodeSize) { dragInfo = null; return true; }
            let tr = view.state.tr;

            // 먼저 원본 노드 삭제
            tr = tr.delete(from, from + node.nodeSize);

            // 삭제 후 좌표를 현재 트랜잭션 기준으로 매핑
            const mappedPos = tr.mapping.map(found.pos);

            // 드롭 지점에 유효한 삽입 위치 계산
            // 리스트 아이템/태스크 아이템은 노드 전체를 보존하여 이동
            const sliceNode = node.type.name === 'paragraph' && node.firstChild ? node.firstChild : node;
            const slice = new Slice(Fragment.from(sliceNode.type.create(sliceNode.attrs, sliceNode.content, sliceNode.marks)), 0, 0);
            const dropPos = dropPoint(tr.doc, mappedPos, slice);
            if (dropPos == null) {
              dragInfo = null;
              return true; // 유효 위치 없으면 아무 것도 하지 않음
            }

            tr = tr.replace(dropPos, dropPos, slice);
            view.dispatch(tr.scrollIntoView());

            // 드롭된 블록에 지속 하이라이트 적용(이전 하이라이트 해제 후 적용)
            // *TODO: 현재 하이라이트 미반영 중 - 차후 수정 필요
            setTimeout(() => {console.log('lastDroppedEl',lastDroppedEl);
              if (lastDroppedEl && lastDroppedEl.classList) {
                lastDroppedEl.classList.remove('pm-block-dropped');
              }
              const droppedDom = view.nodeDOM(dropPos);
              if (droppedDom instanceof HTMLElement) {
                droppedDom.classList.add('pm-block-dropped');
                lastDroppedEl = droppedDom;
              } else {
                lastDroppedEl = null;
              }
            }, 30);
            dragInfo = null;
            return true;
          },
        },
      }),
    ];
  },
});

export default BlockDragHandle;


