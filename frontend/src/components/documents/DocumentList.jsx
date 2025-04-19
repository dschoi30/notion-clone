// src/components/documents/DocumentList.jsx
import { useDocument } from '../../contexts/DocumentContext';

function DocumentList() {
  const { documents, createDocument, deleteDocument } = useDocument();

  const handleCreateDocument = async () => {
    await createDocument({
      title: 'Untitled',
      content: '',
      folderId: null,
    });
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Documents</h2>
        <button
          onClick={handleCreateDocument}
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          New Document
        </button>
      </div>
      <div className="space-y-2">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="flex items-center justify-between p-3 hover:bg-gray-50 rounded"
          >
            <span className="text-gray-700">{doc.title || 'Untitled'}</span>
            <button
              onClick={() => deleteDocument(doc.id)}
              className="text-red-600 hover:text-red-700"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default DocumentList;