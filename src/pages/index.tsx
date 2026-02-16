import Head from 'next/head';
import { GetServerSideProps } from 'next';
import SubAppCard from '@/components/SubAppCard';
import { CardGrid } from '@/components/shared';
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
        <CardGrid>
          {subApps.map((subApp) => (
            <SubAppCard key={subApp.id} subApp={subApp} />
          ))}
        </CardGrid>
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  try {
    console.log('Starting dashboard data loading...');
    
    // Initialize data directories on first run
    initializeDataDirectories();
    console.log('Data directories initialized successfully');
    
    const subApps = getSubApps();
    console.log(`Loaded ${subApps.length} sub-applications`);
    
    return {
      props: {
        subApps,
      },
    };
  } catch (error) {
    console.error('Error loading dashboard data:', error);
    
    // Return empty data instead of failing completely
    return {
      props: {
        subApps: [
          {
            id: 'error',
            name: 'Configuration Error',
            description: 'Check container logs for details',
            icon: '⚠️',
            route: '#',
            enabled: false
          }
        ],
      },
    };
  }
};
