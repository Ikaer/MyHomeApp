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
- Configurable data directory path
- Each sub-application maintains its own data folder
- Structure: `[config_data_path]/[subapp_name]/data.json`

## Planned Sub-Applications

### 1. Anime List Manager
- **Purpose**: Track anime watching progress
- **Integration**: MyAnimeList API
- **Features**: 
  - View/update watch status
  - Personal ratings and notes
  - Discover new anime

### 2. File Explorer
- **Purpose**: Browse and manage NAS files
- **Features**:
  - Directory navigation
  - File preview capabilities
  - Basic file operations

### 3. Bookmark Manager
- **Purpose**: Organize and access bookmarks
- **Features**:
  - Categorized bookmark storage
  - Quick search functionality
  - Import/export capabilities

### 4. Service Dashboard
- **Purpose**: Quick access to other self-hosted services
- **Features**:
  - Service status monitoring
  - Direct links to services (Portainer, DSM, Sonarr, etc.)
  - Service health checks

## Deployment Requirements

### Docker Configuration
- Base image: Node.js runtime
- Port mapping for web access
- Volume mounts for:
  - Configuration files
  - Data directory
  - Potential NAS file access

### Environment Configuration
- Data directory path
- Service URLs for dashboard
- API keys (MyAnimeList, etc.)

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