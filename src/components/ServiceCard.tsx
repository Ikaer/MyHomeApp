import { ServiceLink } from '@/types';

interface ServiceCardProps {
  service: ServiceLink;
}

export default function ServiceCard({ service }: ServiceCardProps) {
  return (
    <div className="card">
      <a 
        href={service.url} 
        target="_blank" 
        rel="noopener noreferrer"
        className="card-link"
      >
        <span className="card-icon">{service.icon}</span>
        <h3 className="card-title">{service.name}</h3>
        <p className="card-description">{service.description}</p>
        <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
          <span className="btn btn-primary">
            Open Service →
          </span>
        </div>
      </a>
    </div>
  );
}
