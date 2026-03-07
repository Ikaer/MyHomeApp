import Head from 'next/head';
import { GetServerSideProps } from 'next';
import SubAppCard from '@/components/SubAppCard';
import { CardGrid } from '@myhomeapp/shared/components';
import { SubApp } from '@myhomeapp/shared/models';
import { getSubApps, initializeDataDirectories } from '@myhomeapp/shared/lib/data';

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
        <link rel="icon" href="/atom-favicon.svg" />
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
