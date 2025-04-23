import { DocumentProvider } from '../../contexts/DocumentContext';
import DocumentList from '../documents/DocumentList';
import DocumentEditor from '../documents/DocumentEditor';

export default function DocumentLayout() {
  return (
    <DocumentProvider>
      <div className="flex h-screen bg-gray-50">
        {/* 중앙 사이드바 - 문서 목록 */}
        <div className="bg-white border-r border-gray-200 w-72">
          <DocumentList />
        </div>

        {/* 메인 컨텐츠 - 문서 에디터 */}
        <div className="flex-1 bg-white">
          <DocumentEditor />
        </div>
      </div>
    </DocumentProvider>
  );
} 