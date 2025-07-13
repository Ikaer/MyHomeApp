import Head from 'next/head';
import { GetServerSideProps } from 'next';
import SubAppCard from '@/components/SubAppCard';
import { SubApp } from '@/types';
import { getSubApps, initializeDataDirectories } from '@/lib/data';

interface HomeProps {
  subApps: SubApp[];
}

export default function Home({ subApps }: HomeProps) {
  return (
    <>
      <Head>
        <title>MyHomeApp - Dashboard</title>
        <meta name="description" content="Personal home server dashboard" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div>
        <h1 className="page-title">MyHomeApp</h1>
        <p className="page-subtitle">
          Your personal home server dashboard
        </p>

        <div className="card-grid">
          {subApps.map((subApp) => (
            <SubAppCard key={subApp.id} subApp={subApp} />
          ))}
        </div>
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  try {
    // Initialize data directories on first run
    initializeDataDirectories();
    
    const subApps = getSubApps();
    
    return {
      props: {
        subApps,
      },
    };
  } catch (error) {
    console.error('Error loading dashboard data:', error);
    return {
      props: {
        subApps: [],
      },
    };
  }
};
