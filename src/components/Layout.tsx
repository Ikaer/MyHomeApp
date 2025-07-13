import Link from 'next/link';
import { useRouter } from 'next/router';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const router = useRouter();

  const isActive = (path: string) => {
    if (path === '/') {
      return router.pathname === '/';
    }
    return router.pathname.startsWith(path);
  };

  return (
    <div>
      <header className="header">
        <div className="container">
          <div className="header-content">
            <Link href="/" className="logo">
              MyHomeApp
            </Link>
            <nav className="nav">
              <Link 
                href="/" 
                className={`nav-link ${isActive('/') ? 'active' : ''}`}
              >
                Dashboard
              </Link>
              <Link 
                href="/services" 
                className={`nav-link ${isActive('/services') ? 'active' : ''}`}
              >
                Services
              </Link>
              <Link 
                href="/bookmarks" 
                className={`nav-link ${isActive('/bookmarks') ? 'active' : ''}`}
              >
                Bookmarks
              </Link>
            </nav>
          </div>
        </div>
      </header>
      <main className="main">
        <div className="container">
          {children}
        </div>
      </main>
    </div>
  );
}
