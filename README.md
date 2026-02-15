# MyHomeApp

A unified dashboard application for personal home server management. This app is mostly developed around anime watching management with a few additional features, this is also a test for a full "vibe-coding" project with copilot.

## Development

1. Install dependencies:
```bash
npm install
```

2. Run development server:
```bash
npm run dev
```

3. Build for production:
```bash
npm run build
```

## Docker Deployment

### Option 1: Docker Compose (Recommended)

1. Make sure the data directories exist on your NAS:
```bash
mkdir -p /volume4/root4/AppData/MyHomeApp/database
mkdir -p /volume4/root4/AppData/MyHomeApp/config
```

2. Build and run:
```bash
docker-compose up -d
```

### Option 2: Manual Docker Build

1. Build the image:
```bash
docker build -t myhomeapp .
```

2. Run the container:
```bash
docker run -d \
  --name myhomeapp \
  -p 12344:3000 \
  -v /volume4/root4/AppData/MyHomeApp/database:/app/data \
  -v /volume4/root4/AppData/MyHomeApp/config:/app/config \
  -v /volume1:/nas/volume1:ro \
  -v /volume2:/nas/volume2:ro \
  -v /volume3:/nas/volume3:ro \
  -v /volume4:/nas/volume4:ro \
  -e NODE_ENV=production \
  -e DATA_PATH=/app/data \
  -e CONFIG_PATH=/app/config \
  --restart unless-stopped \
  myhomeapp
```

## Access

Once deployed, access the application at:
- **Local Network**: http://[NAS_IP]:12344
- **If using 'syno' hostname**: http://syno:12344

## Phase 1 Features

- ✅ Basic Next.js setup with TypeScript
- ✅ Dark theme optimized for TV/4K displays
- ✅ Main dashboard with sub-app cards
- ✅ Services page with quick links
- ✅ JSON-based data layer
- ✅ Docker containerization
- ✅ Proper volume mounts for data persistence

## Directory Structure

```
/volume4/root4/AppData/MyHomeApp/
├── database/           # JSON data files
│   ├── anime/         # Anime list data (Phase 3)
│   └── services/      # Service data
└── config/            # App configuration
    └── app.json       # Main config file
```

## Troubleshooting

### Container won't start
- Check that data directories exist and have proper permissions
- Verify port 12344 is not already in use
- Check Docker logs: `docker logs myhomeapp`

### Services not accessible
- Verify service URLs in the config
- Check network connectivity between containers
- Ensure services are running on specified ports
