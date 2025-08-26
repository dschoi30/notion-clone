import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import { Extension } from '@tiptap/core';
import { useCallback, useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import EditorMenuBar from './EditorMenuBar';
import './Editor.css';
import CustomImage from './CustomImage';
import { fetchImageViaProxy } from '../../services/documentApi';
import { BlockDragHandle } from './extensions/BlockDragHandle';

const lowlight = createLowlight(common);

// 배경색을 지원하기 위한 확장 기능
const BackgroundColor = Extension.create({
  name: 'backgroundColor',

  addAttributes() {
    return {
      backgroundColor: {
        default: null,
        parseHTML: element => element.style.backgroundColor,
        renderHTML: attributes => {
          if (!attributes.backgroundColor) {
            return {};
          }
          return {
            style: `background-color: ${attributes.backgroundColor}`,
          };
        },
      },
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: ['textStyle'],
        attributes: {
          backgroundColor: {
            default: null,
            parseHTML: element => element.style.backgroundColor,
            renderHTML: attributes => {
              if (!attributes.backgroundColor) {
                return {};
              }
              return {
                style: `background-color: ${attributes.backgroundColor}`,
              };
            },
          },
        },
      },
    ];
  },
});

const CLOUDINARY_CLOUD_NAME = 'dsjybr8fb'; // 실제 값으로 교체
const CLOUDINARY_UPLOAD_PRESET = 'notion-clone'; // 실제 값으로 교체

async function uploadImageToCloudinary(file) {
  const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) {
    throw new Error('이미지 업로드 실패');
  }
  const data = await response.json();
  return data.secure_url;
}

const Editor = forwardRef(({ content, onUpdate, editable = true }, ref) => {
  const [isComposing, setIsComposing] = useState(false);
  const latestHTML = useRef('');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        dropcursor: {
          color: '#93c5fd',
          width: 4,
        },
      }),
      Placeholder.configure({
        placeholder: '내용을 입력하세요...',
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      CodeBlockLowlight.configure({
        lowlight,
      }),
      Highlight,
      Link.configure({
        openOnClick: false,
      }),
      TextStyle,
      Color,
      BackgroundColor,
      CustomImage,
      BlockDragHandle,
    ],
    content: '',
    onUpdate: ({ editor }) => {
      latestHTML.current = editor.getHTML();
      if (!isComposing) {
        onUpdate(latestHTML.current);
      }
    },
    editorProps: {
      // handlePaste를 async 함수로 변경
      async handlePaste(view, event) {
        const items = event.clipboardData?.items;
        if (!items) return false;
        console.log('Available Clipboard Types:', Array.from(items).map(item => item.type));
  
        let htmlString = null;
        let imageFiles = [];
        // text/plain은 Tiptap 기본 핸들러가 더 잘 처리할 수 있으므로 여기서는 수집하지 않음
  
        // 비동기 작업(getAsString)을 기다리기 위해 Promise 사용
        const processingPromises = Array.from(items).map(item => {
          return new Promise(async (resolve) => {
            if (item.type === 'text/html') {
              item.getAsString(html => {
                htmlString = html; // 외부 스코프 변수에 할당
                resolve();
              });
            } else if (item.type.startsWith('image/')) {
              const file = item.getAsFile();
              if (file) imageFiles.push(file); // 외부 스코프 변수에 할당
              resolve();
            } else {
              resolve(); // 처리하지 않는 타입도 resolve
            }
          });
        });
  
        // 모든 아이템의 비동기 처리가 완료될 때까지 기다림
        await Promise.all(processingPromises);
  
        // --- 처리 우선순위 결정 ---
  
        // 1. text/html 데이터가 있으면 최우선 처리
        if (htmlString) {
          console.log("Processing text/html content...");
          try {
            // 모든 <img> 태그 src 추출
            const imgSrcMatches = [...htmlString.matchAll(/<img[^>]+src=["']([^"'>]+)["']/gi)];
            const imageProcessingPromises = imgSrcMatches.map(match => {
              const originalSrc = match[1];
              // 각 이미지 src 처리 (data:, http://, https://) 후 최종 URL과 width 반환
              return new Promise(async (resolve) => { // 각 이미지 처리를 Promise로 감쌈
                try {
                  let finalImageUrl;
                  let blob;
                  if (originalSrc.startsWith('data:image/')) {
                    const res = await fetch(originalSrc);
                    blob = await res.blob();
                    if (!blob.type.startsWith('image/')) return resolve({ originalSrc, finalImageUrl: null, error: 'Invalid blob type' });
                    const file = new File([blob], 'clipboard-image', { type: blob.type });
                    finalImageUrl = await uploadImageToCloudinary(file);
                  } else if (originalSrc.startsWith('http://') || originalSrc.startsWith('https://')) {
                    finalImageUrl = await fetchImageViaProxy(originalSrc);
                  } else {
                    return resolve({ originalSrc, finalImageUrl: null, error: 'Unsupported src type' });
                  }
  
                  // 최종 URL로 이미지 크기 계산
                  const img = new window.Image();
                  img.src = finalImageUrl;
                  img.onload = () => {
                    let width = img.width;
                    if (width > 1280) width = 1280;
                    resolve({ originalSrc, finalImageUrl, width }); // 성공 시 정보 반환
                  };
                  img.onerror = () => resolve({ originalSrc, finalImageUrl, width: null, error: 'Image load error' }); // 로드 실패해도 resolve
                } catch (e) {
                  console.error(`Error processing image ${originalSrc}:`, e);
                  resolve({ originalSrc, finalImageUrl: null, error: e.message }); // 에러 발생 시 정보 포함 resolve
                }
              });
            });
  
            // 모든 이미지 처리가 완료될 때까지 기다림 (성공/실패 무관)
            const imageResults = await Promise.allSettled(imageProcessingPromises);
  
            // 원본 src를 최종 URL/width로 매핑하는 객체 생성
            const urlMap = {};
            imageResults.forEach(result => {
              if (result.status === 'fulfilled' && result.value.finalImageUrl) {
                urlMap[result.value.originalSrc] = { url: result.value.finalImageUrl, width: result.value.width };
              } else {
                // 처리 실패한 이미지 로그 (선택적)
                const failedSrc = result.reason?.originalSrc || result.value?.originalSrc || 'unknown';
                console.warn(`Failed to process image from HTML: ${failedSrc}`);
              }
            });
  
            // 원본 HTML에서 <img> 태그 교체
            let modifiedHtml = htmlString.replace(/<img[^>]*src=["']([^"'>]+)["'][^>]*>/gi, (match, capturedSrc) => {
              const mapping = urlMap[capturedSrc];
              if (mapping && mapping.url) {
                // 간단한 교체. 속성을 유지하려면 더 복잡한 파싱 필요.
                return `<img src="${mapping.url}" ${mapping.width ? `width="${mapping.width}"` : ''} />`;
              } else {
                return ''; // 처리 실패한 이미지는 제거
              }
            });
  
            // Tiptap 명령으로 수정된 HTML 삽입
            const success = editor.chain().focus().insertContent(modifiedHtml, {
              parseOptions: { preserveWhitespace: false } // 필요에 따라 옵션 조정
            }).run();
  
            if (!success) {
              console.error("Failed to insert HTML content via Tiptap command.");
            }
  
            return true; // HTML 처리 완료
  
          } catch (e) {
            console.error("Error processing HTML clipboard content:", e);
            alert(`HTML 붙여넣기 처리 중 오류 발생: ${e.message}`);
            return false; // 오류 발생 시 기본 핸들러에 맡길 수 있음
          }
        }
        // 2. text/html 없고 image 파일만 있는 경우
        else if (imageFiles.length > 0) {
          console.log(`Processing ${imageFiles.length} image file(s)...`);
          try {
            alert(`이미지 파일 ${imageFiles.length}개 업로드 중...`);
            // 모든 파일을 Cloudinary에 업로드
            const uploadPromises = imageFiles.map(file => uploadImageToCloudinary(file));
            const uploadedUrls = await Promise.all(uploadPromises);
  
            // 업로드된 이미지를 순차적으로 에디터에 삽입
            for (const url of uploadedUrls) {
              await new Promise((resolve, reject) => { // 각 삽입을 Promise로 처리
                const img = new window.Image();
                img.src = url;
                img.onload = () => {
                  let width = img.width;
                  if (width > 1280) width = 1280;
                  try {
                    view.dispatch(
                      view.state.tr.replaceSelectionWith(
                        view.state.schema.nodes.image.create({ src: url, width })
                      )
                    );
                    resolve();
                  } catch(e) { reject(e); }
                };
                img.onerror = reject;
              });
            }
            return true; // 이미지 파일 처리 완료
          } catch (e) {
            console.error("Error processing direct image files:", e);
            alert(`이미지 파일 처리 중 오류 발생: ${e.message}`);
            return false; // 오류 발생 시 기본 핸들러
          }
        }
  
        // 3. 처리할 이미지나 HTML 없으면 기본 핸들러에 맡김
        console.log("No relevant clipboard content found, letting default handler proceed.");
        return false;
      },
    },
    editable,
  });

  useImperativeHandle(ref, () => ({
    focus: () => {
      if (editor) editor.commands.focus();
    }
  }), [editor]);

  // compositionend에서만 onUpdate를 강제 호출
  const handleCompositionStart = () => setIsComposing(true);
  const handleCompositionEnd = () => {
    setIsComposing(false);
    if (editor) {
      const html = editor.getHTML();
      if (html !== latestHTML.current) {
        latestHTML.current = html;
        onUpdate(html);
      }
    }
  };

  useEffect(() => {
    // IME 조합 중에는 외부 content 동기화를 적용하지 않음
    if (!editor) return;
    if (isComposing) return;
    // 사용자가 현재 입력 중(focus)일 때는 불필요한 되감기 방지
    if (editor.isFocused) {
      // 최신 에디터 내용과 동일한 경우만 무시, 다른 경우에도 포커스 중이면 건너뜀
      return;
    }
    const currentHtml = editor.getHTML();
    if (typeof content === 'string' && content !== currentHtml) {
      editor.commands.setContent(content);
    }
  }, [content, editor, isComposing]);

  const setLink = useCallback(() => {
    const previousUrl = editor.getAttributes('link').href ?? '';
    const url = window.prompt('URL 입력', previousUrl);

    if (url === null) {
      return;
    }

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className="pb-4 editor">
      <EditorMenuBar editor={editor} setLink={setLink} />
      <EditorContent 
        editor={editor}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
      />
    </div>
  );
});

export default Editor; 