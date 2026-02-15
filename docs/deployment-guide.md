# MyHomeApp - Portainer Deployment Guide

## Prerequisites

1. **Portainer** is running o## File Structure on NAS

After deployment, your NAS should have:

```
/volume4/root4/AppData/MyHomeApp/
├── database/              # Auto-created by app
│   ├── anime/           # Anime data
│   └── savings/         # Savings data
├── config/               # Auto-created by app
│   └── app.json         # Auto-generated config
└── logs/                 # Application logs
    └── app.log          # Detailed application logs
```

## Troubleshooting

### Check Application Logs
```bash
# View latest logs
tail -f /volume4/root4/AppData/MyHomeApp/logs/app.log

# View all logs
cat /volume4/root4/AppData/MyHomeApp/logs/app.log
``` NAS
2. **Data directories** exist on your NAS:
   ```bash
   mkdir -p /volume4/root4/AppData/MyHomeApp/database
   mkdir -p /volume4/root4/AppData/MyHomeApp/config
   mkdir -p /volume4/root4/AppData/MyHomeApp/logs
   ```

## Deployment Steps

### Step 1: Prepare the Code

1. Push your code to a private GitHub repository
2. Make sure the repository contains all the files we just created

### Step 2: Deploy via Portainer

#### Option A: Using Portainer Stacks (Recommended)

1. Log into **Portainer** (http://syno:9000/)
2. Go to **Stacks** → **Add Stack**
3. Name: `myhomeapp`
4. Choose **Git Repository** method
5. Repository URL: `https://github.com/Ikaer/MyHomeApp` (your repo)
6. Branch: `main`
7. Compose path: `docker-compose.yml`
8. Click **Deploy the Stack**

#### Option B: Manual Docker Compose

1. SSH into your Synology NAS
2. Clone the repository:
   ```bash
   git clone https://github.com/Ikaer/MyHomeApp.git /volume1/docker/myhomeapp
   cd /volume1/docker/myhomeapp
   ```
3. Deploy:
   ```bash
   docker-compose up -d
   ```

### Step 3: Verify Deployment

1. Check container status in Portainer
2. View logs to ensure no errors
3. Access the application: **http://syno:12344**

## Expected Result

You should see:
- ✅ **Dashboard page** with 2 sub-app cards
- ✅ **Anime page** with your anime data
- ✅ **Savings page** with your financial data
- ✅ **Dark theme** optimized for TV viewing
- ✅ **Navigation** working between pages

## Troubleshooting

### Container won't start
```bash
# Check container logs
docker logs myhomeapp

# Common issues:
# 1. Port 12344 already in use
# 2. Data directories don't exist
# 3. Permission issues
```

### Build fails
```bash
# If using Git repository method, check:
# 1. Repository is accessible
# 2. Branch name is correct
# 3. docker-compose.yml exists in root
```

### Can't access the app
```bash
# Check if container is running
docker ps | grep myhomeapp

# Check port mapping
docker port myhomeapp

# Test from NAS directly
curl http://localhost:12344
```

## File Structure on NAS

After deployment, your NAS should have:

```
/volume4/root4/AppData/MyHomeApp/
├── database/              # Auto-created by app
│   ├── anime/           # Anime data
│   └── savings/         # Savings data
└── config/               # Auto-created by app
    └── app.json         # Auto-generated config
```

## Next Steps

Once Phase 1 is working:
1. ✅ Verify all navigation works
2. ✅ Check that data directories are created
3. 🚀 Ready for the next phase

## Useful Commands

```bash
# View logs
docker logs myhomeapp -f

# Restart container
docker restart myhomeapp

# Update from Git (if using Portainer stacks)
# Just click "Update" in Portainer UI

# Manual update
docker-compose pull && docker-compose up -d
```
