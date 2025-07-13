import { useState, useEffect } from 'react';
import { Bookmark, BookmarkCategory } from '@/types';

interface BookmarkFormProps {
  bookmark?: Bookmark | null;
  categories: BookmarkCategory[];
  onSave: (bookmark: Bookmark) => void;
  onCancel: () => void;
}

export default function BookmarkForm({ bookmark, categories, onSave, onCancel }: BookmarkFormProps) {
  const [formData, setFormData] = useState({
    title: '',
    url: '',
    description: '',
    category: '',
    path: '',
    tags: [] as string[]
  });
  const [tagInput, setTagInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (bookmark) {
      setFormData({
        title: bookmark.title,
        url: bookmark.url,
        description: bookmark.description || '',
        category: bookmark.category,
        path: bookmark.path || '',
        tags: [...bookmark.tags]
      });
    } else {
      setFormData({
        title: '',
        url: '',
        description: '',
        category: categories[0]?.id || '',
        path: '',
        tags: []
      });
    }
  }, [bookmark, categories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const method = bookmark ? 'PUT' : 'POST';
      const url = bookmark ? `/api/bookmarks/${bookmark.id}` : '/api/bookmarks';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const data = await response.json();
        onSave(data.bookmark);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to save bookmark');
      }
    } catch (error) {
      console.error('Error saving bookmark:', error);
      alert('Failed to save bookmark');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !formData.tags.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleTagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  return (
    <div className="bookmark-form-overlay">
      <div className="bookmark-form">
        <div className="form-header">
          <h2>{bookmark ? 'Edit Bookmark' : 'Add New Bookmark'}</h2>
          <button onClick={onCancel} className="btn-close">✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="title">Title *</label>
            <input
              type="text"
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              required
              placeholder="Enter bookmark title"
            />
          </div>

          <div className="form-group">
            <label htmlFor="url">URL *</label>
            <input
              type="url"
              id="url"
              value={formData.url}
              onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
              required
              placeholder="https://example.com"
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

          <div className="form-group">
            <label htmlFor="category">Category *</label>
            <select
              id="category"
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              required
            >
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.icon} {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="path">Chrome Folder Path</label>
            <input
              type="text"
              id="path"
              value={formData.path || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, path: e.target.value }))}
              placeholder="e.g., Bookmarks Bar / Work / Tools"
            />
            <small className="form-help">Original Chrome bookmark folder path (automatically filled for imports)</small>
          </div>

          <div className="form-group">
            <label htmlFor="tags">Tags</label>
            <div className="tag-input-container">
              <input
                type="text"
                id="tags"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={handleTagKeyPress}
                placeholder="Add a tag and press Enter"
              />
              <button type="button" onClick={addTag} className="btn btn-secondary">
                Add
              </button>
            </div>
            {formData.tags.length > 0 && (
              <div className="tags-display">
                {formData.tags.map(tag => (
                  <span key={tag} className="tag-item">
                    #{tag}
                    <button 
                      type="button" 
                      onClick={() => removeTag(tag)}
                      className="tag-remove"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="form-actions">
            <button type="button" onClick={onCancel} className="btn btn-secondary">
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : (bookmark ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
