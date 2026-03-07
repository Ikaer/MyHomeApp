import { AppProps } from 'next/app';
import '@myhomeapp/shared/styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
