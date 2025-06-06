import React, { createContext, useContext, useState, useCallback } from 'react';
import * as workspaceApi from '@/services/workspaceApi';
import { useEffect } from 'react';

const WorkspaceContext = createContext();

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}

export function WorkspaceProvider({ children }) {
  const [workspaces, setWorkspaces] = useState([]);
  const [currentWorkspace, setCurrentWorkspace] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchWorkspaces = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await workspaceApi.getAccessibleWorkspaces();
      setWorkspaces(data);
      if (data.length > 0 && !currentWorkspace) {
        setCurrentWorkspace(data[0]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace]);

  const createWorkspace = useCallback(async (workspaceData) => {
    try {
      setLoading(true);
      setError(null);
      const newWorkspace = await workspaceApi.createWorkspace(workspaceData);
      setWorkspaces(prev => [...prev, newWorkspace]);
      return newWorkspace;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateWorkspace = useCallback(async (id, workspaceData) => {
    try {
      setLoading(true);
      setError(null);
      const updatedWorkspace = await workspaceApi.updateWorkspace(id, workspaceData);
      setWorkspaces(prev => prev.map(workspace => 
        workspace.id === id ? updatedWorkspace : workspace
      ));
      if (currentWorkspace?.id === id) {
        setCurrentWorkspace(updatedWorkspace);
      }
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace]);

  const deleteWorkspace = useCallback(async (id) => {
    try {
      setLoading(true);
      setError(null);
      await workspaceApi.deleteWorkspace(id);
      setWorkspaces(prev => prev.filter(workspace => workspace.id !== id));
      if (currentWorkspace?.id === id) {
        setCurrentWorkspace(workspaces.find(w => w.id !== id) || null);
      }
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace, workspaces]);

  const selectWorkspace = useCallback((workspace) => {
    setCurrentWorkspace(workspace);
    localStorage.setItem('selectedWorkspace', workspace.id);
  }, []);

  useEffect(() => {
    const savedId = localStorage.getItem('selectedWorkspace');
    if (workspaces.length > 0) {
      if (savedId) {
        const found = workspaces.find(ws =>  String(ws.id) === String(savedId));
        if (found && (!currentWorkspace || currentWorkspace.id !== found.id)) {
          setCurrentWorkspace(found);
        } else if (!found && (!currentWorkspace || currentWorkspace.id !== workspaces[0].id)) {
          setCurrentWorkspace(workspaces[0]);
        }
      } else if (!currentWorkspace || currentWorkspace.id !== workspaces[0].id) {
        setCurrentWorkspace(workspaces[0]);
      }
    }
  }, [workspaces]);

  const value = {
    workspaces,
    currentWorkspace,
    loading,
    error,
    fetchWorkspaces,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    selectWorkspace
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
} 