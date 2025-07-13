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
}

export interface AppConfig {
  services: ServiceLink[];
  dataPath: string;
  version: string;
}

export interface Bookmark {
  id: string;
  title: string;
  url: string;
  description?: string;
  category: string;
  tags: string[];
  path?: string; // Chrome bookmark folder path (e.g., "Bookmarks Bar/Work/Tools")
  favicon?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BookmarkCategory {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
}
