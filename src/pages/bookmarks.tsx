import { useState, useEffect } from 'react';
import Head from 'next/head';
import BookmarkCard from '@/components/bookmarks/BookmarkCard';
import BookmarkForm from '@/components/bookmarks/BookmarkForm';
import { Bookmark, BookmarkCategory } from '@/types';
import styles from './bookmarks/BookmarksPage.module.css';

export default function Bookmarks() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [categories, setCategories] = useState<BookmarkCategory[]>([]);
  const [filteredBookmarks, setFilteredBookmarks] = useState<Bookmark[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        
        // Load bookmarks and categories in parallel
        const [bookmarksRes, categoriesRes] = await Promise.all([
          fetch('/api/bookmarks'),
          fetch('/api/bookmarks/categories')
        ]);
        
        const bookmarksData = await bookmarksRes.json();
        const categoriesData = await categoriesRes.json();
        
        setBookmarks(bookmarksData.bookmarks || []);
        setCategories(categoriesData.categories || []);
        setFilteredBookmarks(bookmarksData.bookmarks || []);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Filter bookmarks when search term or category changes
  useEffect(() => {
    let filtered = bookmarks;

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(bookmark =>
        bookmark.title.toLowerCase().includes(searchLower) ||
        (bookmark.description && bookmark.description.toLowerCase().includes(searchLower)) ||
        bookmark.url.toLowerCase().includes(searchLower) ||
        bookmark.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter(bookmark => bookmark.category === selectedCategory);
    }

    // Sort by updated date (newest first)
    filtered.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    setFilteredBookmarks(filtered);
  }, [bookmarks, searchTerm, selectedCategory]);

  const handleAddBookmark = () => {
    setEditingBookmark(null);
    setShowForm(true);
  };

  const handleEditBookmark = (bookmark: Bookmark) => {
    setEditingBookmark(bookmark);
    setShowForm(true);
  };

  const handleSaveBookmark = (savedBookmark: Bookmark) => {
    if (editingBookmark) {
      // Update existing bookmark
      setBookmarks(prev => 
        prev.map(b => b.id === savedBookmark.id ? savedBookmark : b)
      );
    } else {
      // Add new bookmark
      setBookmarks(prev => [savedBookmark, ...prev]);
    }
    setShowForm(false);
    setEditingBookmark(null);
  };

  const handleDeleteBookmark = (id: string) => {
    setBookmarks(prev => prev.filter(b => b.id !== id));
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingBookmark(null);
  };

  const handleExport = async () => {
    try {
      const response = await fetch('/api/bookmarks/export');
      if (response.ok) {
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bookmarks-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export bookmarks');
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const fileName = file.name;
      
      // Determine if it's HTML or JSON and send appropriate data
      const isHTML = fileName.toLowerCase().endsWith('.html') || 
                     fileName.toLowerCase().endsWith('.htm') ||
                     text.trim().startsWith('<!DOCTYPE') ||
                     text.trim().startsWith('<html');
      
      let requestBody;
      
      if (isHTML) {
        // Send raw file content for server-side parsing
        requestBody = {
          fileContent: text,
          fileName: fileName
        };
      } else {
        // Legacy JSON format
        const data = JSON.parse(text);
        requestBody = data;
      }
      
      const response = await fetch('/api/bookmarks/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Successfully imported ${result.imported || 'unknown'} bookmarks!`);
        // Refresh bookmarks
        window.location.reload();
      } else {
        const error = await response.json();
        alert(`Failed to import bookmarks: ${error.error}`);
      }
    } catch (error) {
      console.error('Import failed:', error);
      alert('Failed to import bookmarks - invalid file format');
    }
    
    // Reset file input
    event.target.value = '';
  };

  const getCategoryStats = () => {
    const stats = categories.map(category => ({
      ...category,
      count: bookmarks.filter(b => b.category === category.id).length
    }));
    return stats;
  };

  const totalBookmarks = bookmarks.length;
  const categoryStats = getCategoryStats();

  return (
    <>
      <Head>
        <title>Bookmarks - MyHomeApp</title>
        <meta name="description" content="Manage your bookmarks" />
      </Head>

      <div>
        {/* Loading State */}
        {isLoading ? (
          <div key="loading" style={{ textAlign: 'center', padding: '3rem' }}>
            <p>Loading bookmarks...</p>
          </div>
        ) : (
          <div key="loaded">
            {/* Stats */}
            <div className={styles.bookmarkStats}>
              <div className={styles.statCard}>
                <div className={styles.statNumber}>{totalBookmarks}</div>
                <div className={styles.statLabel}>Total Bookmarks</div>
              </div>
              {categoryStats.map(category => (
                <div key={category.id} className={styles.statCard}>
                  <div className={styles.statNumber} style={{ color: category.color }}>
                    {category.count}
                  </div>
                  <div className={styles.statLabel}>{category.icon} {category.name}</div>
                </div>
              ))}
            </div>

            {/* Controls */}
            <div className={styles.bookmarkControls}>
              <input
                type="text"
                placeholder="Search bookmarks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={styles.searchInput}
              />
              
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className={styles.categoryFilter}
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.icon} {category.name}
                  </option>
                ))}
              </select>

              <button onClick={handleAddBookmark} className="btn btn-primary">
            + Add Bookmark
          </button>

          <button onClick={handleExport} className="btn btn-secondary">
            📁 Export
          </button>

          <label className="btn btn-secondary" style={{ cursor: 'pointer' }} title="Import bookmarks from Chrome HTML export or JSON file">
            📁 Import
            <input
              type="file"
              accept=".json,.html,.htm"
              onChange={handleImport}
              style={{ display: 'none' }}
            />
          </label>
        </div>

            {/* Bookmarks Grid */}
            {filteredBookmarks.length > 0 ? (
              <div className={styles.bookmarkGrid}>
                {filteredBookmarks.map(bookmark => (
                  <BookmarkCard
                    key={bookmark.id}
                    bookmark={bookmark}
                    categories={categories}
                    onEdit={handleEditBookmark}
                    onDelete={handleDeleteBookmark}
                  />
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <h3>
                  {searchTerm || selectedCategory 
                    ? 'No bookmarks found' 
                    : 'No bookmarks yet'
                  }
                </h3>
                <p>
                  {searchTerm || selectedCategory
                    ? 'Try adjusting your search or filter'
                    : 'Add your first bookmark to get started'
                  }
                </p>
                {!searchTerm && !selectedCategory && (
                  <button onClick={handleAddBookmark} className="btn btn-primary" style={{ marginTop: '1rem' }}>
                    Add Your First Bookmark
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Bookmark Form Modal */}
        {showForm && (
          <BookmarkForm
            bookmark={editingBookmark}
            categories={categories}
            onSave={handleSaveBookmark}
            onCancel={handleCancelForm}
          />
        )}
      </div>
    </>
  );
}
