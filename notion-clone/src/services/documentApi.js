// src/services/documentApi.js
const API_BASE_URL = 'http://localhost:8080/api';

class DocumentApiService {
  async request(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return response.json();
  }

  async getDocuments() {
    return this.request('/documents');
  }

  async getDocument(id) {
    return this.request(`/documents/${id}`);
  }

  async createDocument(data) {
    return this.request('/documents', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateDocument(id, data) {
    return this.request(`/documents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteDocument(id) {
    return this.request(`/documents/${id}`, {
      method: 'DELETE',
    });
  }

  async getFolders() {
    return this.request('/folders');
  }

  async createFolder(data) {
    return this.request('/folders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteFolder(id) {
    return this.request(`/folders/${id}`, {
      method: 'DELETE',
    });
  }
}

export const documentApi = new DocumentApiService();