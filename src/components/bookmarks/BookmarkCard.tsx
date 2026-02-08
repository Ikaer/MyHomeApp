import { useState } from 'react';
import Image from 'next/image';
import { Bookmark, BookmarkCategory } from '@/types';
import styles from './BookmarkCard.module.css';

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
    <div className={styles.bookmarkCard}>
      <div className={styles.bookmarkHeader}>
        <div className={styles.bookmarkFavicon}>
          {bookmark.favicon ? (
            <Image src={bookmark.favicon} alt="" width={16} height={16} unoptimized />
          ) : (
            <span>🔗</span>
          )}
        </div>
        <div className={styles.bookmarkInfo}>
          <h3 className={styles.bookmarkTitle}>
            <a 
              href={bookmark.url} 
              target="_blank" 
              rel="noopener noreferrer"
              title={bookmark.url}
            >
              {bookmark.title}
            </a>
          </h3>
          <p className={styles.bookmarkDomain}>{getDomain(bookmark.url)}</p>
        </div>
        <div className={styles.bookmarkActions}>
          <button 
            onClick={() => onEdit(bookmark)}
            className={styles.iconButton}
            title="Edit bookmark"
          >
            ✏️
          </button>
          <button 
            onClick={handleDelete}
            className={`${styles.iconButton} ${styles.iconDanger}`}
            title="Delete bookmark"
            disabled={isDeleting}
          >
            {isDeleting ? '⏳' : '🗑️'}
          </button>
        </div>
      </div>
      
      {bookmark.description && (
        <p className={styles.bookmarkDescription}>{bookmark.description}</p>
      )}
      
      <div className={styles.bookmarkMeta}>
        {category && (
          <span 
            className={styles.bookmarkCategory}
            style={{ backgroundColor: category.color + '20', color: category.color }}
          >
            {category.icon} {category.name}
          </span>
        )}
        
        {bookmark.path && (
          <span className={styles.bookmarkPath} title="Chrome folder path">
            📁 {bookmark.path}
          </span>
        )}
        
        {bookmark.tags.length > 0 && (
          <div className={styles.bookmarkTags}>
            {bookmark.tags.map(tag => (
              <span key={tag} className={styles.bookmarkTag}>#{tag}</span>
            ))}
          </div>
        )}
        
        <span className={styles.bookmarkDate}>
          Updated {formatDate(bookmark.updatedAt)}
        </span>
      </div>
    </div>
  );
}
