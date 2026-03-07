import { AppProps } from 'next/app';
import { Layout } from '@myhomeapp/shared/components';
import '@myhomeapp/shared/styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <Layout>
      <Component {...pageProps} />
    </Layout>
  );
}
