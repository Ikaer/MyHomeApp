import Head from 'next/head';
import { GetServerSideProps } from 'next';
import ServiceCard from '@/components/services/ServiceCard';
import { ServiceLink } from '@/types';
import { getAppConfig } from '@/lib/data';

interface ServicesProps {
  services: ServiceLink[];
}

export default function Services({ services }: ServicesProps) {
  return (
    <>
      <Head>
        <title>Services - MyHomeApp</title>
        <meta name="description" content="Quick access to all your services" />
      </Head>

      <div>
        <div className="card-grid">
          {services.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  try {
    const config = getAppConfig();
    
    return {
      props: {
        services: config.services,
      },
    };
  } catch (error) {
    console.error('Error loading services:', error);
    return {
      props: {
        services: [],
      },
    };
  }
};
