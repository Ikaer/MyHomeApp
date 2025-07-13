/**
 * Application and service related interfaces
 */

export interface SubApp {
  id: string;
  name: string;
  description: string;
  icon: string;
  route: string;
  enabled: boolean;
}

export interface ServiceLink {
  id: string;
  name: string;
  url: string;
  icon: string;
  description: string;
  category?: string;
  status?: 'online' | 'offline' | 'unknown';
}

export interface AppConfig {
  services: ServiceLink[];
  dataPath: string;
  version: string;
  theme?: 'light' | 'dark' | 'auto';
}
