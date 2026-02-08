import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import FileExplorer from '@/components/files/FileExplorer';
import { Modal } from '@/components/shared';
import type { FileRoot, FileSystemItem } from '@/models/files';

export default function Files() {
  const [fileRoots, setFileRoots] = useState<FileRoot[]>([]);
  const [selectedRoot, setSelectedRoot] = useState<FileRoot | null>(null);
  const [showAddRoot, setShowAddRoot] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadFileRoots = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('Loading file roots...');
      const response = await fetch('/api/files/roots');
      if (response.ok) {
        const data = await response.json();
        console.log('Loaded file roots:', data);
        setFileRoots(data);
        // Auto-select first root if available
        if (data && data.length > 0) {
          setSelectedRoot(prev => prev ?? data[0]);
        }
      } else {
        console.error('Failed to load file roots:', response.status);
      }
    } catch (error) {
      console.error('Error loading file roots:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load file roots on component mount
  useEffect(() => {
    loadFileRoots();
  }, [loadFileRoots]);

  const handleAddRoot = async (rootData: Omit<FileRoot, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      console.log('Adding root:', rootData);
      const response = await fetch('/api/files/roots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rootData)
      });

      if (response.ok) {
        const newRoot = await response.json();
        console.log('Root added successfully:', newRoot);
        setFileRoots(prev => {
          const updated = [newRoot, ...prev];
          console.log('Updated file roots:', updated);
          return updated;
        });
        setSelectedRoot(newRoot);
        setShowAddRoot(false);
      } else {
        const error = await response.text();
        console.error('Failed to add file root:', error);
        alert('Failed to add file root: ' + error);
      }
    } catch (error) {
      console.error('Error adding file root:', error);
      alert('Failed to add file root');
    }
  };

  const handleDeleteRoot = async (rootId: string) => {
    if (!confirm('Are you sure you want to remove this file root?')) return;

    try {
      const response = await fetch(`/api/files/roots/${rootId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setFileRoots(prev => prev.filter(root => root.id !== rootId));
        if (selectedRoot?.id === rootId) {
          setSelectedRoot(fileRoots.length > 1 ? fileRoots[0] : null);
        }
      } else {
        alert('Failed to delete file root');
      }
    } catch (error) {
      console.error('Error deleting file root:', error);
      alert('Failed to delete file root');
    }
  };

  const handleFileSelect = (file: any) => {
    console.log('Selected file:', file);
  };

  const handleDirectorySelect = (path: string) => {
    console.log('Selected directory:', path);
  };

  return (
    <>
      <Head>
        <title>File Explorer - MyHomeApp</title>
        <meta name="description" content="Browse and manage files" />
      </Head>

      <div>
        {/* File Roots Management */}
        <div className="file-roots-section" style={{ marginBottom: '2rem' }}>
          <div className="section-header">
            <h3>File Locations</h3>
            <button
              onClick={() => setShowAddRoot(true)}
              className="btn btn-primary"
            >
              + Add Location
            </button>
          </div>

          {isLoading ? (
            <p>Loading file locations...</p>
          ) : fileRoots.length === 0 ? (
            <div className="empty-state">
              <p>No file locations configured yet.</p>
              <p>Add a location to start browsing files.</p>
            </div>
          ) : (
            <div className="roots-grid">
              {fileRoots.map(root => (
                <div
                  key={root.id}
                  className={`root-card ${selectedRoot?.id === root.id ? 'selected' : ''}`}
                  onClick={() => setSelectedRoot(root)}
                >
                  <div className="root-info">
                    <h4>� {root.name}</h4>
                    <p className="root-path">{root.path}</p>
                    {root.description && (
                      <p className="root-description">{root.description}</p>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteRoot(root.id);
                    }}
                    className="delete-btn"
                    title="Remove location"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* File Explorer */}
        {selectedRoot && (
          <div className="explorer-section">
            <h3>Browsing: {selectedRoot.name}</h3>
            <FileExplorer
              key={selectedRoot.id} // Force re-render when root changes
              rootPath={selectedRoot.path}
              onFileSelect={handleFileSelect}
              onDirectorySelect={handleDirectorySelect}
            />
          </div>
        )}

        {/* Add Root Modal */}
        {showAddRoot && (
          <AddRootModal
            onAdd={handleAddRoot}
            onCancel={() => setShowAddRoot(false)}
          />
        )}
      </div>

      <style jsx>{`
        .file-roots-section {
          background: #f8f9fa;
          border-radius: 8px;
          padding: 1.5rem;
        }
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        .section-header h3 {
          margin: 0;
          font-size: 1.25rem;
          color: #333;
        }
        .btn {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 6px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-primary {
          background: #007bff;
          color: white;
        }
        .btn:hover {
          opacity: 0.9;
          transform: translateY(-1px);
        }
        .empty-state {
          text-align: center;
          padding: 2rem;
          color: #666;
        }
        .roots-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1rem;
        }
        .root-card {
          background: white;
          border: 2px solid #e1e1e1;
          border-radius: 8px;
          padding: 1rem;
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
        }
        .root-card:hover {
          border-color: #007bff;
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }
        .root-card.selected {
          border-color: #007bff;
          background: #e3f2fd;
        }
        .root-info h4 {
          margin: 0 0 0.5rem 0;
          font-size: 1.1rem;
          color: #333;
        }
        .root-path {
          font-family: monospace;
          font-size: 0.9rem;
          color: #666;
          margin: 0 0 0.5rem 0;
          word-break: break-all;
        }
        .root-description {
          font-size: 0.9rem;
          color: #888;
          margin: 0;
        }
        .delete-btn {
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
          background: #dc3545;
          color: white;
          border: none;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          font-size: 16px;
          line-height: 1;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .delete-btn:hover {
          background: #c82333;
        }
        .explorer-section {
          margin-top: 2rem;
        }
        .explorer-section h3 {
          margin-bottom: 1rem;
          color: #333;
        }
      `}</style>
    </>
  );
}

interface AddRootModalProps {
  onAdd: (root: Omit<FileRoot, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

function AddRootModal({ onAdd, onCancel }: AddRootModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    path: '',
    description: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.path.trim()) {
      alert('Name and path are required');
      return;
    }
    onAdd(formData);
  };

  return (
    <Modal open={true} title="Add File Location" onClose={onCancel} size="sm">
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Name *</label>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="e.g., Documents, Media Files"
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="path">Path *</label>
          <input
            type="text"
            id="path"
            value={formData.path}
            onChange={(e) => setFormData(prev => ({ ...prev, path: e.target.value }))}
            placeholder="e.g., /volume1/documents, C:\\Users\\John\\Documents"
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Optional description"
            rows={3}
          />
        </div>
        
        <div className="form-actions">
          <button type="button" onClick={onCancel} className="btn btn-secondary">
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            Add Location
          </button>
        </div>
      </form>

      <style jsx>{`
        .form-group {
          margin-bottom: 1rem;
        }
        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
          color: #333;
        }
        .form-group input,
        .form-group textarea {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
          box-sizing: border-box;
        }
        .form-group input:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #007bff;
          box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
        }
        .form-actions {
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
          margin-top: 2rem;
        }
        .btn {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 6px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-primary {
          background: #007bff;
          color: white;
        }
        .btn-secondary {
          background: #6c757d;
          color: white;
        }
        .btn:hover {
          opacity: 0.9;
        }
      `}</style>
    </Modal>
  );
}
