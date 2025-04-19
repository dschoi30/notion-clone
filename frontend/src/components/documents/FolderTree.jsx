// src/components/documents/FolderTree.jsx
import { useState } from 'react';
import { useDocument } from '../../contexts/DocumentContext';

function FolderTree() {
  const { folders, createFolder, deleteFolder } = useDocument();
  const [newFolderName, setNewFolderName] = useState('');

  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    
    await createFolder({
      name: newFolderName,
      parentId: null,
    });
    setNewFolderName('');
  };

  const renderFolder = (folder) => (
    <div key={folder.id} className="ml-4">
      <div className="flex items-center justify-between py-2">
        <span className="text-gray-700">{folder.name}</span>
        <button
          onClick={() => deleteFolder(folder.id)}
          className="text-red-600 hover:text-red-700 text-sm"
        >
          Delete
        </button>
      </div>
      {folder.children?.map(renderFolder)}
    </div>
  );

  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-4">Folders</h3>
      <form onSubmit={handleCreateFolder} className="mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="New folder name"
            className="flex-1 p-2 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Add
          </button>
        </div>
      </form>
      <div className="space-y-2">
        {folders.map(renderFolder)}
      </div>
    </div>
  );
}

export default FolderTree;