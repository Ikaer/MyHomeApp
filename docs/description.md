# MyHomeApp

## Overview
A unified dashboard application for personal home server management, providing access to multiple sub-applications through a single interface.

## Purpose
Create a centralized web application hosted on Synology NAS (via Portainer/Docker) that consolidates various personal tools and services into one cohesive platform. The app will serve as a hub for:
- Anime list management (MyAnimeList integration)
- File system exploration
- Bookmark management
- Quick access to other self-hosted services (Portainer, DSM, Sonarr, etc.)
- Extensible architecture for future sub-applications

## Technical Stack
- **Frontend**: Next.js with React
- **Styling**: Custom CSS with modern features
- **Theme**: Dark theme only
- **Target Display**: TV browser (4K) - no mobile responsiveness needed
- **Deployment**: Docker container via Portainer
- **Data Storage**: JSON files (file-based database)
- **Hosting**: Synology NAS

## Architecture & Structure
### Application Structure
- Root-level main dashboard displaying available sub-applications
- Each sub-app organized in dedicated subfolders matching URL structure
- Consistent navigation system across all sub-applications
- Shared components and utilities

### Navigation Flow
1. Main dashboard lists all available sub-applications
2. Click on sub-app redirects to dedicated route/page
3. Each sub-app includes navigation menu with:
   - Return to home dashboard
   - Quick access to other sub-applications

## Data Management
### Storage Strategy
- JSON file-based database system
- Data directory: `/volume4/root4/AppData/MyHomeApp/database`
- Each sub-application maintains its own data folder
- Structure: `/volume4/root4/AppData/MyHomeApp/database/[subapp_name]/data.json`
- Automatic directory creation as needed

## Planned Sub-Applications

### 1. Anime List Manager
- **Purpose**: Track anime watching progress
- **Integration**: MyAnimeList API (placeholder implementation initially)
- **Features**: 
  - View/update watch status
  - Personal ratings and notes
  - Discover new anime
- **Note**: API integration to be implemented in later phase

### 2. File Explorer
- **Purpose**: Browse and manage NAS files
- **Scope**: Access to NAS volumes (volume1, volume2, etc.)
- **Permissions**: Read-only access initially
- **Features**:
  - Directory navigation across all NAS volumes
  - File preview capabilities for all file types
  - File information display (size, date, etc.)

### 3. Bookmark Manager
- **Purpose**: Organize and access bookmarks
- **Features**:
  - Categorized bookmark storage
  - Quick search functionality
  - Import/export capabilities

### 4. Service Dashboard
- **Purpose**: Quick access to other self-hosted services
- **Services List**:
  - DSM: http://syno:5000
  - Portainer: http://syno:9000/
  - Sonarr: http://syno:8989/
  - QbitTorrent: http://syno:8088/
  - Jackett: http://syno:9117/
- **Features**:
  - Simple service list with direct links
  - Service icons and descriptions
  - Quick access grid layout

## Deployment Requirements

### Docker Configuration
- **Base image**: Node.js runtime
- **Port**: 12344 (host) → 3000 (container)
- **Volume mounts**:
  - `/volume4/root4/AppData/MyHomeApp/database` → `/app/data`
  - `/volume4/root4/AppData/MyHomeApp/config` → `/app/config`
  - NAS volumes for file explorer → `/nas` (read-only)

### Environment Configuration
- Configuration file path: `/app/config/app.json`
- Service URLs (predefined):
  - DSM: http://syno:5000
  - Portainer: http://syno:9000/
  - Sonarr: http://syno:8989/
  - QbitTorrent: http://syno:8088/
  - Jackett: http://syno:9117/
- MyAnimeList API configuration (placeholder)

## Security Considerations
- Internal network access only (behind NAS firewall)
- Personal use only - no authentication mechanism required
- Data validation for JSON file operations
- Secure API key storage

## Development Phases

### Phase 1: Core Infrastructure
- Next.js project setup
- Basic routing and navigation
- JSON file data layer
- Docker containerization

### Phase 2: Initial Sub-Apps
- Service dashboard
- Basic bookmark manager

### Phase 3: Advanced Features
- Anime list manager with MyAnimeList integration
- File explorer with NAS integration

### Phase 4: Enhancements
- UI/UX improvements
- Performance optimizations
- Additional sub-applications as needed

## Configuration Management
- Environment variables for deployment settings
- JSON configuration file for app-specific settings
- Runtime configuration updates without restart

## Future Extensibility
- Plugin-like architecture for easy sub-app addition
- Shared component library
- Consistent theming system
- API framework for sub-app communication