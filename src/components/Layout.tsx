import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { SubApp } from '@/types';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const router = useRouter();
  const [subApps, setSubApps] = useState<SubApp[]>([]);

  useEffect(() => {
    // Load subApps from API
    const loadSubApps = async () => {
      try {
        const response = await fetch('/api/subapps');
        if (response.ok) {
          const data = await response.json();
          setSubApps(data.subApps || []);
        }
      } catch (error) {
        console.error('Failed to load subapps:', error);
      }
    };
    
    loadSubApps();
  }, []);

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
              {subApps.map((subApp) => (
                <Link 
                  key={subApp.id}
                  href={subApp.route} 
                  className={`nav-link ${isActive(subApp.route) ? 'active' : ''}`}
                >
                  {subApp.name}
                </Link>
              ))}
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
