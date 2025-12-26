import { Extension } from '@tiptap/core';
import { Plugin, PluginKey, NodeSelection } from '@tiptap/pm/state';
import { Decoration, DecorationSet, EditorView } from '@tiptap/pm/view';
import { dropPoint } from '@tiptap/pm/transform';
import { Fragment, Slice } from '@tiptap/pm/model';

interface DragInfo {
  from: number;
  node: any;
}

/**
 * BlockDragHandle
 * - 각 블록 노드 시작 위치에 드래그 핸들을 표시하고, 핸들을 통해 블록을 선택/드래그하여 이동할 수 있게 합니다.
 * - 초기 버전은 단일 블록 이동만 지원합니다.
 */
export const BlockDragHandle = Extension.create({
  name: 'blockDragHandle',

  addProseMirrorPlugins() {
    const key = new PluginKey('blockDragHandle');
    let dragInfo: DragInfo | null = null; // { from: number, node }
    let hoverHandlePos: number | null = null; // 현재 호버 중인 블록 시작 pos
    let dragPreviewEl: HTMLElement | null = null; // 커스텀 드래그 프리뷰 엘리먼트
    let lastDroppedEl: HTMLElement | null = null; // 마지막 드랍된 블록 DOM 참조(지속 하이라이트)

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

            const decorations: Decoration[] = [];
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
                  el.title = '드래그해서 옮기기';
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
              } catch (_e) {
                // 에러 무시
              }

              const tr = view.state.tr.setSelection(NodeSelection.create(view.state.doc, pos));
              view.dispatch(tr);
              return true;
            },
            mousemove(view, event) {
              // 요청사항: 핸들 레일 X 좌표를 유지한 채 수직 이동만으로도 동작하도록
              // X는 보정하지 않고, 우선 DOM의 핸들들 중 Y가 가장 가까운 것을 선택한다.
              const x = event.clientX;
              const y = event.clientY;
              const found = view.posAtCoords({ left: x, top: y });

              // 1) DOM 기반으로 Y와 가장 가까운 핸들을 우선 탐색 (체크박스 레일 등 좌표 치우침 상황 대응)
              let targetEl: HTMLElement | null = null;
              let targetPos: number | null = null;
              const handleEls = view.dom.querySelectorAll?.('.pm-block-handle') || [];
              let bestDy = Infinity;
              for (const el of handleEls) {
                const r = el.getBoundingClientRect();
                const cy = (r.top + r.bottom) / 2;
                const dy = Math.abs(cy - y);
                if (dy < bestDy) {
                  bestDy = dy;
                  targetEl = el as HTMLElement;
                }
              }
              if (targetEl) {
                const posAttr = targetEl.getAttribute('data-pos');
                targetPos = posAttr ? Number(posAttr) : null;
              }

              // 2) 보정 실패 시 좌표→문서 매핑으로 대체
              if (targetPos == null && found && found.pos != null) {
                const { doc } = view.state;
                let candidatePos: number | null = null;
                let candidateNode: any = null;
                doc.nodesBetween(found.pos, found.pos, (node, pos) => {
                  if (node.isBlock) {
                    candidateNode = node;
                    candidatePos = pos;
                  }
                });
                if (candidatePos != null) {
                  targetPos = candidatePos;
                  if (candidateNode && candidateNode.type && candidateNode.type.name === 'paragraph') {
                    try {
                      const $start = doc.resolve(candidatePos);
                      const parentNode = $start.depth > 0 ? $start.node($start.depth - 1) : null;
                      if (parentNode && (parentNode.type.name === 'taskItem' || parentNode.type.name === 'listItem')) {
                        targetPos = $start.before($start.depth - 1);
                      }
                    } catch (_e) {
                      // 에러 무시
                    }
                  }
                }
              }

              if (targetPos == null || hoverHandlePos === targetPos) return false;

              // 이전 핸들 숨김
              if (hoverHandlePos != null) {
                const prev = view.dom.querySelector?.(`.pm-block-handle[data-pos="${hoverHandlePos}"]`);
                if (prev) prev.classList.remove('visible');
              }

              // 새 핸들 표시
              const next = view.dom.querySelector?.(`.pm-block-handle[data-pos="${targetPos}"]`);
              if (next) next.classList.add('visible');
              hoverHandlePos = next ? targetPos : null;
              return false;
            },
            mouseleave(view, _event) {
              if (hoverHandlePos != null) {
                const prev = view.dom.querySelector?.(`.pm-block-handle[data-pos="${hoverHandlePos}"]`);
                if (prev) prev.classList.remove('visible');
                hoverHandlePos = null;
              }
              return false;
            },
            dragover(_view, event) {
              // 드롭 가능 상태 유지 (일부 브라우저에서 필수)
              event.preventDefault();
              if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
              // false를 반환하여 dropcursor 등 다른 플러그인이 dragover를 처리할 수 있게 함
              return false;
            },
          },
          // 드래그 시작 핸들러 (타입 확장으로 지원, 런타임에서는 작동하지만 타입 정의에는 없음)
          handleDragStart(view: EditorView, event: DragEvent) {
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
          // 드래그 종료 핸들러 (타입 확장으로 지원)
          handleDragEnd(_view: EditorView, _event: DragEvent) {
            if (dragPreviewEl && dragPreviewEl.parentNode) {
              dragPreviewEl.parentNode.removeChild(dragPreviewEl);
            }
            dragPreviewEl = null;
            return false;
          },
          // 드롭 핸들러 (타입 확장으로 지원)
          handleDrop(view: EditorView, event: DragEvent) {
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

            // 드롭 완료 블록에 지속 하이라이트 적용(이전 하이라이트 해제 후 적용)
            // *TODO: 현재 하이라이트 미반영 중 - 차후 수정 필요
            setTimeout(() => {
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
        } as any, // ProseMirror Plugin의 props는 EditorProps 타입이지만, 
                   // 실제로는 handleDragStart/DragEnd/Drop 같은 커스텀 핸들러도 지원함
                   // 타입 확장이 제네릭 타입과 충돌하여 타입 단언 사용
      }),
    ];
  },
});

export default BlockDragHandle;

