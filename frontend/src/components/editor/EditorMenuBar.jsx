import { Button } from '@/components/ui/button';
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Undo,
  Redo,
  Link as LinkIcon,
  Palette,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

const COLORS = [
  { name: '검정', value: '#000000' },
  { name: '회색', value: '#666666' },
  { name: '빨강', value: '#ff0000' },
  { name: '주황', value: '#ff8800' },
  { name: '노랑', value: '#ffcc00' },
  { name: '초록', value: '#00cc00' },
  { name: '파랑', value: '#0066ff' },
  { name: '보라', value: '#6600ff' },
];

const BG_COLORS = [
  { name: '흰색', value: '#ffffff' },
  { name: '연한 회색', value: '#f1f1f1' },
  { name: '연한 빨강', value: '#ffe6e6' },
  { name: '연한 주황', value: '#fff3e6' },
  { name: '연한 노랑', value: '#fffbe6' },
  { name: '연한 초록', value: '#e6ffe6' },
  { name: '연한 파랑', value: '#e6f2ff' },
  { name: '연한 보라', value: '#f2e6ff' },
];

const EditorMenuBar = ({ editor, setLink }) => {
  if (!editor) {
    return null;
  }

  const menuItems = [
    {
      icon: <Bold className="w-4 h-4" />,
      title: '굵게',
      action: () => editor.chain().focus().toggleBold().run(),
      isActive: () => editor.isActive('bold'),
    },
    {
      icon: <Italic className="w-4 h-4" />,
      title: '기울임',
      action: () => editor.chain().focus().toggleItalic().run(),
      isActive: () => editor.isActive('italic'),
    },
    {
      icon: <Strikethrough className="w-4 h-4" />,
      title: '취소선',
      action: () => editor.chain().focus().toggleStrike().run(),
      isActive: () => editor.isActive('strike'),
    },
    {
      icon: <Code className="w-4 h-4" />,
      title: '코드',
      action: () => editor.chain().focus().toggleCode().run(),
      isActive: () => editor.isActive('code'),
    },
    {
      icon: <Heading1 className="w-4 h-4" />,
      title: '제목 1',
      action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      isActive: () => editor.isActive('heading', { level: 1 }),
    },
    {
      icon: <Heading2 className="w-4 h-4" />,
      title: '제목 2',
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      isActive: () => editor.isActive('heading', { level: 2 }),
    },
    {
      icon: <Heading3 className="w-4 h-4" />,
      title: '제목 3',
      action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      isActive: () => editor.isActive('heading', { level: 3 }),
    },
    {
      icon: <List className="w-4 h-4" />,
      title: '글머리 기호',
      action: () => editor.chain().focus().toggleBulletList().run(),
      isActive: () => editor.isActive('bulletList'),
    },
    {
      icon: <ListOrdered className="w-4 h-4" />,
      title: '번호 매기기',
      action: () => editor.chain().focus().toggleOrderedList().run(),
      isActive: () => editor.isActive('orderedList'),
    },
    {
      icon: <CheckSquare className="w-4 h-4" />,
      title: '체크리스트',
      action: () => editor.chain().focus().toggleTaskList().run(),
      isActive: () => editor.isActive('taskList'),
    },
    {
      icon: <Quote className="w-4 h-4" />,
      title: '인용',
      action: () => editor.chain().focus().toggleBlockquote().run(),
      isActive: () => editor.isActive('blockquote'),
    },
  ];

  return (
    <div className="sticky top-0 z-30 bg-white border-b border-input">
      <div className="flex flex-wrap gap-2 p-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().chain().focus().undo().run()}
          title="실행 취소"
        >
          <Undo className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().chain().focus().redo().run()}
          title="다시 실행"
        >
          <Redo className="w-4 h-4" />
        </Button>

        {menuItems.map((item, index) => (
          <Button
            key={index}
            variant={item.isActive() ? 'secondary' : 'ghost'}
            size="sm"
            onClick={item.action}
            title={item.title}
          >
            {item.icon}
          </Button>
        ))}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="gap-2"
              title="글자색"
            >
              <Palette className="w-4 h-4" />
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: editor.getAttributes('textStyle').color || '#000000' }} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {COLORS.map((color) => (
              <DropdownMenuItem
                key={color.value}
                onClick={() => editor.chain().focus().setColor(color.value).run()}
                className="flex gap-2 items-center"
              >
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: color.value }} />
                <span>{color.name}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="gap-2"
              title="배경색"
            >
              <div className="w-4 h-4 rounded border border-gray-300" style={{ backgroundColor: editor.getAttributes('textStyle').backgroundColor }} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {BG_COLORS.map((color) => (
              <DropdownMenuItem
                key={color.value}
                onClick={() => {
                  if (editor.getAttributes('textStyle').backgroundColor === color.value) {
                    editor.chain().focus().unsetMark('textStyle').run();
                  } else {
                    editor.chain().focus().setMark('textStyle', { backgroundColor: color.value }).run();
                  }
                }}
                className="flex gap-2 items-center"
              >
                <div className="w-4 h-4 rounded border border-gray-300" style={{ backgroundColor: color.value }} />
                <span>{color.name}</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem
              onClick={() => editor.chain().focus().unsetMark('textStyle').run()}
              className="flex gap-2 items-center border-t"
            >
              <div className="relative w-4 h-4 rounded border border-gray-300">
                <div className="flex absolute inset-0 justify-center items-center text-red-500">×</div>
              </div>
              <span>배경색 제거</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default EditorMenuBar; 