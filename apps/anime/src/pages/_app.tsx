import { AppProps } from 'next/app';
import { Layout } from '@myhomeapp/shared/components';
import '@myhomeapp/shared/styles/globals.css';

// Patch fetch to auto-prepend basePath for all /api/ calls.
// Next.js basePath is NOT automatically prepended by the native fetch API.
if (typeof window !== 'undefined') {
  const basePath = (window as any).__NEXT_DATA__?.basePath || '';
  if (basePath) {
    const origFetch = window.fetch.bind(window);
    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      if (typeof input === 'string' && input.startsWith('/api/')) {
        return origFetch(basePath + input, init);
      }
      return origFetch(input, init);
    };
  }
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <Layout>
      <Component {...pageProps} />
    </Layout>
  );
}
