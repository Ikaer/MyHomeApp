import { SubApp } from '@/types';

interface SubAppCardProps {
  subApp: SubApp;
}

export default function SubAppCard({ subApp }: SubAppCardProps) {
  const getStatusInfo = () => {
    if (!subApp.enabled) {
      return {
        className: 'status-coming-soon',
        text: 'Coming Soon'
      };
    }
    return {
      className: 'status-enabled',
      text: 'Available'
    };
  };

  const status = getStatusInfo();

  if (!subApp.enabled) {
    return (
      <div className="card">
        <span className="card-icon">{subApp.icon}</span>
        <h3 className="card-title">{subApp.name}</h3>
        <p className="card-description">{subApp.description}</p>
        <span className={`status ${status.className}`}>
          {status.text}
        </span>
      </div>
    );
  }

  return (
    <div className="card">
      <a href={subApp.route} className="card-link">
        <span className="card-icon">{subApp.icon}</span>
        <h3 className="card-title">{subApp.name}</h3>
        <p className="card-description">{subApp.description}</p>
        <span className={`status ${status.className}`}>
          {status.text}
        </span>
      </a>
    </div>
  );
}
