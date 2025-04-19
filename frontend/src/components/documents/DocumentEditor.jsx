// src/components/documents/DocumentEditor.jsx
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useDocument } from '../../contexts/DocumentContext';

function DocumentEditor() {
  const { documentId } = useParams();
  const { getDocument, updateDocument } = useDocument();
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadDocument = async () => {
      if (documentId) {
        const doc = await getDocument(documentId);
        setTitle(doc.title);
        setContent(doc.content);
      }
    };
    loadDocument();
  }, [documentId, getDocument]);

  const handleTitleChange = (e) => {
    setTitle(e.target.value);
    saveChanges(e.target.value, content);
  };

  const handleContentChange = (e) => {
    setContent(e.target.value);
    saveChanges(title, e.target.value);
  };

  const saveChanges = async (newTitle, newContent) => {
    if (saving) return;
    setSaving(true);
    try {
      await updateDocument(documentId, {
        title: newTitle,
        content: newContent,
      });
    } catch (error) {
      console.error('Failed to save document:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full p-4">
      <input
        type="text"
        value={title}
        onChange={handleTitleChange}
        placeholder="Untitled"
        className="w-full p-2 mb-4 text-2xl font-bold rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      <textarea
        value={content}
        onChange={handleContentChange}
        placeholder="Start writing..."
        className="flex-1 w-full p-4 rounded resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      {saving && (
        <div className="fixed px-4 py-2 text-white bg-gray-800 rounded bottom-4 right-4">
          Saving...
        </div>
      )}
    </div>
  );
}

export default DocumentEditor;