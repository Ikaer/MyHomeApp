import React, { useState, useEffect } from 'react';
import TreeView, { TreeNode, buildTreeFromPaths } from '@/components/shared/TreeView';
import styles from './FileExplorer.module.css';
import type { FileSystemItem } from '@/models';

interface FileItem extends FileSystemItem {} // Legacy alias

interface FileExplorerProps {
  rootPath?: string;
  onFileSelect?: (file: FileItem) => void;
  onDirectorySelect?: (path: string) => void;
  className?: string;
  allowedExtensions?: string[]; // Filter files by extension
  showHiddenFiles?: boolean;
}

const FileExplorer: React.FC<FileExplorerProps> = ({
  rootPath = '/',
  onFileSelect,
  onDirectorySelect,
  className = '',
  allowedExtensions,
  showHiddenFiles = false
}) => {
  const [treeNodes, setTreeNodes] = useState<TreeNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mock file system data - replace with actual API calls
  const mockFileSystem: FileItem[] = [
    { path: '/Documents', name: 'Documents', type: 'directory' },
    { path: '/Documents/Reports', name: 'Reports', type: 'directory' },
    { path: '/Documents/Reports/2024-Q1.pdf', name: '2024-Q1.pdf', type: 'file', size: 1024000, extension: 'pdf' },
    { path: '/Documents/Reports/2024-Q2.pdf', name: '2024-Q2.pdf', type: 'file', size: 1200000, extension: 'pdf' },
    { path: '/Documents/Notes.txt', name: 'Notes.txt', type: 'file', size: 2048, extension: 'txt' },
    { path: '/Pictures', name: 'Pictures', type: 'directory' },
    { path: '/Pictures/Vacation', name: 'Vacation', type: 'directory' },
    { path: '/Pictures/Vacation/beach.jpg', name: 'beach.jpg', type: 'file', size: 2500000, extension: 'jpg' },
    { path: '/Pictures/Vacation/sunset.jpg', name: 'sunset.jpg', type: 'file', size: 3200000, extension: 'jpg' },
    { path: '/Pictures/family.png', name: 'family.png', type: 'file', size: 1800000, extension: 'png' },
    { path: '/Downloads', name: 'Downloads', type: 'directory' },
    { path: '/Downloads/installer.exe', name: 'installer.exe', type: 'file', size: 45000000, extension: 'exe' },
    { path: '/Downloads/README.md', name: 'README.md', type: 'file', size: 5120, extension: 'md' },
  ];

  useEffect(() => {
    loadFileSystem();
  }, [rootPath, allowedExtensions, showHiddenFiles]);
  const loadFileSystem = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Loading file system for root:', rootPath);        const response = await fetch('/api/files/browse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          rootPath: rootPath,
          relativePath: '' // Start at root
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load file system');
      }

      const data = await response.json();
      let files = data.items || [];
      
      // Filter by allowed extensions
      if (allowedExtensions && allowedExtensions.length > 0) {
        files = files.filter((file: FileItem) => {
          if (file.type === 'directory') return true;
          return allowedExtensions.includes(file.extension || '');
        });
      }
      
      // Filter hidden files
      if (!showHiddenFiles) {
        files = files.filter((file: FileItem) => !file.name.startsWith('.'));
      }

      // Convert to tree nodes directly (no need for buildTreeFromPaths since we only have first level)
      const rootNodes: TreeNode[] = files.map((file: FileItem) => ({
        id: file.path,
        label: file.name,
        path: file.path,
        icon: getFileIcon(file),
        data: file,
        children: file.type === 'directory' ? [] : undefined, // Empty array for directories, undefined for files
        isExpanded: false
      }));

      setTreeNodes(rootNodes);
      
      // Don't auto-expand anything initially
      setExpandedNodes(new Set());
    } catch (err: any) {
      setError(err.message || 'Failed to load file system');
      console.error('File system load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getFileIcon = (file?: FileItem): string => {
    if (!file) return '📄';
    if (file.type === 'directory') return '📁';
    
    const ext = file.extension?.toLowerCase();
    switch (ext) {
      case 'pdf': return '📄';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'svg': return '🖼️';
      case 'mp4':
      case 'avi':
      case 'mov': return '🎬';
      case 'mp3':
      case 'wav':
      case 'flac': return '🎵';
      case 'zip':
      case 'rar':
      case '7z': return '🗜️';
      case 'exe':
      case 'msi': return '⚙️';
      case 'txt':
      case 'md':
      case 'log': return '📝';
      case 'js':
      case 'ts':
      case 'jsx':
      case 'tsx': return '📜';
      case 'html':
      case 'css': return '🌐';
      default: return '📄';
    }
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatDate = (date?: Date | string): string => {
    if (!date) return '';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(dateObj);
  };

  const handleNodeSelect = (node: TreeNode) => {
    setSelectedNode(node);
    const fileItem = node.data as FileItem;
    
    if (fileItem) {
      // Always set selectedFile to show details for both files and directories
      setSelectedFile(fileItem);
      
      if (fileItem.type === 'file') {
        onFileSelect?.(fileItem);
      } else {
        onDirectorySelect?.(fileItem.path);
      }
    }
  };

  const handleNodeExpand = async (node: TreeNode, expanded: boolean) => {
    console.log('Node expand called:', node.label, 'expanded:', expanded);
    
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (expanded) {
        newSet.add(node.id);
      } else {
        newSet.delete(node.id);
      }
      return newSet;
    });

    // Load children when expanding a directory for the first time
    if (expanded && node.data && (node.data as FileItem).type === 'directory' && 
        (!node.children || node.children.length === 0)) {
      
      console.log('Loading children for directory:', node.label);
      
      try {
        const fileItem = node.data as FileItem;
        const relativePath = fileItem.path.startsWith('/') ? fileItem.path.slice(1) : fileItem.path;
        
        console.log('API call for path:', relativePath);
        
        const response = await fetch('/api/files/browse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            rootPath: rootPath,
            relativePath: relativePath
          })
        });

        if (response.ok) {
          const data = await response.json();
          let files = data.items || [];
          
          console.log('Loaded files:', files.length);
          
          // Apply filters
          if (allowedExtensions && allowedExtensions.length > 0) {
            files = files.filter((file: FileItem) => {
              if (file.type === 'directory') return true;
              return allowedExtensions.includes(file.extension || '');
            });
          }
          
          if (!showHiddenFiles) {
            files = files.filter((file: FileItem) => !file.name.startsWith('.'));
          }

          // Convert to tree nodes
          const childNodes: TreeNode[] = files.map((file: FileItem) => ({
            id: file.path,
            label: file.name,
            path: file.path,
            icon: getFileIcon(file),
            data: file,
            children: file.type === 'directory' ? [] : undefined,
            isExpanded: false
          }));

          console.log('Created child nodes:', childNodes.length);

          // Update the tree nodes
          setTreeNodes(prevNodes => {
            const updateNode = (nodes: TreeNode[]): TreeNode[] => {
              return nodes.map(n => {
                if (n.id === node.id) {
                  console.log('Updating node with children:', childNodes.length);
                  return { ...n, children: childNodes };
                }
                if (n.children) {
                  return { ...n, children: updateNode(n.children) };
                }
                return n;
              });
            };
            return updateNode(prevNodes);
          });
        } else {
          console.error('API response not OK:', response.status);
        }
      } catch (error) {
        console.error('Failed to load directory contents:', error);
      }
    }
  };

  return (
    <div className={`${styles.fileExplorer} ${className}`}>
      {/* Left Pane - Tree View */}
      <div className={styles.fileTreePane}>
        <div className={styles.paneHeader}>
          <h3>📁 File Explorer</h3>
          <button 
            onClick={loadFileSystem}
            className={styles.refreshBtn}
            disabled={loading}
            title="Refresh"
          >
            🔄
          </button>
        </div>
        
        {loading ? (
          <div className={styles.loadingState}>
            <p>Loading files...</p>
          </div>
        ) : error ? (
          <div className={styles.errorState}>
            <p>{error}</p>
            <button onClick={loadFileSystem}>Retry</button>
          </div>
        ) : (
          <TreeView
            nodes={treeNodes}
            onNodeSelect={handleNodeSelect}
            onNodeExpand={handleNodeExpand}
            selectedNodeId={selectedNode?.id}
            expandedNodes={expandedNodes}
            className={styles.fileTree}
          />
        )}
      </div>

      {/* Right Pane - File Details */}
      <div className={styles.fileDetailsPane}>
        <div className={styles.paneHeader}>
          <h3>📋 Details</h3>
        </div>
        
        {selectedFile ? (
          <div className={styles.fileDetails}>
            <div className={styles.fileIconLarge}>
              {getFileIcon(selectedFile)}
            </div>
            
            <div className={styles.fileInfo}>
              <h4 className={styles.fileName}>{selectedFile.name}</h4>
              <div className={styles.fileProperties}>
                <div className={styles.property}>
                  <span className={styles.propertyLabel}>Type:</span>
                  <span className={styles.propertyValue}>
                    {selectedFile.type === 'directory' 
                      ? 'Directory' 
                      : selectedFile.extension?.toUpperCase() || 'File'}
                  </span>
                </div>
                
                {selectedFile.size && (
                  <div className={styles.property}>
                    <span className={styles.propertyLabel}>Size:</span>
                    <span className={styles.propertyValue}>
                      {formatFileSize(selectedFile.size)}
                    </span>
                  </div>
                )}
                
                <div className={styles.property}>
                  <span className={styles.propertyLabel}>Path:</span>
                  <span className={styles.propertyValue} title={selectedFile.path}>
                    {selectedFile.path}
                  </span>
                </div>
                
                {selectedFile.modified && (
                  <div className={styles.property}>
                    <span className={styles.propertyLabel}>Modified:</span>
                    <span className={styles.propertyValue}>
                      {formatDate(selectedFile.modified)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* File Preview Area */}
            <div className={styles.filePreview}>
              {selectedFile.extension === 'txt' || selectedFile.extension === 'md' ? (
                <div className={styles.textPreview}>
                  <h5>Preview:</h5>
                  <div className={styles.previewContent}>
                    {/* Add actual file content loading here */}
                    <p>Text file preview would appear here...</p>
                  </div>
                </div>
              ) : (selectedFile.extension === 'jpg' || selectedFile.extension === 'png') ? (
                <div className={styles.imagePreview}>
                  <h5>Preview:</h5>
                  <div className={styles.previewContent}>
                    {/* Add actual image loading here */}
                    <div className={styles.imagePlaceholder}>
                      🖼️ Image preview would appear here
                    </div>
                  </div>
                </div>
              ) : (
                <div className={styles.noPreview}>
                  <p>No preview available for this file type</p>
                </div>
              )}
            </div>
          </div>
        ) : selectedNode?.data?.type === 'directory' ? (
          <div className={styles.directoryDetails}>
            <div className={styles.fileIconLarge}>📁</div>
            <div className={styles.fileInfo}>
              <h4 className={styles.fileName}>{selectedNode.label}</h4>
              <div className={styles.fileProperties}>
                <div className={styles.property}>
                  <span className={styles.propertyLabel}>Type:</span>
                  <span className={styles.propertyValue}>Folder</span>
                </div>
                <div className={styles.property}>
                  <span className={styles.propertyLabel}>Path:</span>
                  <span className={styles.propertyValue} title={selectedNode.path}>
                    {selectedNode.path}
                  </span>
                </div>
                <div className={styles.property}>
                  <span className={styles.propertyLabel}>Items:</span>
                  <span className={styles.propertyValue}>
                    {selectedNode.children?.length || 0} items
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.emptySelection}>
            <p>Select a file or folder to view details</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileExplorer;
