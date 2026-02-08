import { useState } from 'react';
import Image from 'next/image';
import { Bookmark, BookmarkCategory } from '@/types';

interface BookmarkCardProps {
  bookmark: Bookmark;
  categories: BookmarkCategory[];
  onEdit: (bookmark: Bookmark) => void;
  onDelete: (id: string) => void;
}

export default function BookmarkCard({ bookmark, categories, onEdit, onDelete }: BookmarkCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const category = categories.find(c => c.id === bookmark.category);
  
  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete "${bookmark.title}"?`)) {
      setIsDeleting(true);
      try {
        const response = await fetch(`/api/bookmarks/${bookmark.id}`, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          onDelete(bookmark.id);
        } else {
          alert('Failed to delete bookmark');
        }
      } catch (error) {
        console.error('Error deleting bookmark:', error);
        alert('Failed to delete bookmark');
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  };

  return (
    <div className="bookmark-card">
      <div className="bookmark-header">
        <div className="bookmark-favicon">
          {bookmark.favicon ? (
            <Image src={bookmark.favicon} alt="" width={16} height={16} unoptimized />
          ) : (
            <span>🔗</span>
          )}
        </div>
        <div className="bookmark-info">
          <h3 className="bookmark-title">
            <a 
              href={bookmark.url} 
              target="_blank" 
              rel="noopener noreferrer"
              title={bookmark.url}
            >
              {bookmark.title}
            </a>
          </h3>
          <p className="bookmark-domain">{getDomain(bookmark.url)}</p>
        </div>
        <div className="bookmark-actions">
          <button 
            onClick={() => onEdit(bookmark)}
            className="btn-icon"
            title="Edit bookmark"
          >
            ✏️
          </button>
          <button 
            onClick={handleDelete}
            className="btn-icon btn-danger"
            title="Delete bookmark"
            disabled={isDeleting}
          >
            {isDeleting ? '⏳' : '🗑️'}
          </button>
        </div>
      </div>
      
      {bookmark.description && (
        <p className="bookmark-description">{bookmark.description}</p>
      )}
      
      <div className="bookmark-meta">
        {category && (
          <span 
            className="bookmark-category"
            style={{ backgroundColor: category.color + '20', color: category.color }}
          >
            {category.icon} {category.name}
          </span>
        )}
        
        {bookmark.path && (
          <span className="bookmark-path" title="Chrome folder path">
            📁 {bookmark.path}
          </span>
        )}
        
        {bookmark.tags.length > 0 && (
          <div className="bookmark-tags">
            {bookmark.tags.map(tag => (
              <span key={tag} className="bookmark-tag">#{tag}</span>
            ))}
          </div>
        )}
        
        <span className="bookmark-date">
          Updated {formatDate(bookmark.updatedAt)}
        </span>
      </div>
    </div>
  );
}
