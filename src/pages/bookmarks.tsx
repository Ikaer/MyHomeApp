import Head from 'next/head';

export default function Bookmarks() {
  return (
    <>
      <Head>
        <title>Bookmarks - MyHomeApp</title>
        <meta name="description" content="Manage your bookmarks" />
      </Head>

      <div>
        <h1 className="page-title">Bookmarks</h1>
        <p className="page-subtitle">
          Bookmark manager coming in Phase 2
        </p>

        <div className="card">
          <span className="card-icon">🔖</span>
          <h3 className="card-title">Bookmark Manager</h3>
          <p className="card-description">
            This feature will be implemented in Phase 2 of development. 
            It will include categorized bookmark storage, quick search functionality, 
            and import/export capabilities.
          </p>
          <span className="status status-coming-soon">
            Phase 2 Feature
          </span>
        </div>
      </div>
    </>
  );
}
