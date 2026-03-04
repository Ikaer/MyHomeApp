# Step 1: Create Migration Branch & Deploy Side-by-Side

**Branch**: `migration/monorepo` (created in this step)  
**Checkpoint**: Legacy app on `main` and an identical clone on `migration/monorepo` are both running in Portainer on different ports, with separate data directories. Zero code changes.

---

## Goal

Set up the safety net before touching any code. Create the migration branch, prepare isolated data directories on the NAS, adjust only the docker-compose for new ports/paths/container names, and deploy a second Portainer stack. Both stacks run the same app — the only difference is ports and data paths.

---

## Tasks

### 1.1 — Create the migration branch

```bash
git checkout main
git pull
git checkout -b migration/monorepo
git push -u origin migration/monorepo
```

### 1.2 — Create v2 data directories on the NAS

SSH into the NAS and copy the current data so the new stack starts with real data to validate against:

```bash
# On the NAS (SSH or terminal)
cp -r /volume4/root4/AppData/MyHomeApp /volume4/root4/AppData/MyHomeApp-v2
```

This creates:
```
/volume4/root4/AppData/MyHomeApp-v2/
├── database/
│   ├── anime/
│   ├── savings/
│   ├── rag/
│   └── config/
├── config/
├── logs/
└── qdrant/
```

### 1.3 — Create a v2 docker-compose file

Create `docker-compose.v2.yml` at the repo root — identical to `docker-compose.yml` but with different ports, container names, and data paths:

```yaml
version: '3.8'

services:
  myhomeapp:
    image: myhomeapp-v2:${BUILD_VERSION:-latest}
    build: 
      context: .
      args:
        - BUILD_DATE=2026-03-04-v2
    ports:
      - "12350:3000"                    # Changed from 12344
    volumes:
      - /volume4/root4/AppData/MyHomeApp-v2/database:/app/data    # v2 data
      - /volume4/root4/AppData/MyHomeApp-v2/config:/app/config
      - /volume4/root4/AppData/MyHomeApp-v2/logs:/app/logs
      - /volume1:/nas/volume1:ro
      - /volume2:/nas/volume2:ro
      - /volume3:/nas/volume3:ro
      - /volume4:/nas/volume4:ro
      - /volume5:/nas/volume5:ro
    environment:
      - NODE_ENV=production
      - DATA_PATH=/app/data
      - CONFIG_PATH=/app/config
      - LOGS_PATH=/app/logs
      - CRON_SECRET=mysecretcronjobkey
      - QDRANT_URL=http://qdrant-v2:6333
      - OLLAMA_URL=http://192.168.1.19:11434
    restart: unless-stopped
    container_name: myhomeapp-v2          # Changed
    user: "0:0"

  qdrant-v2:
    image: qdrant/qdrant:latest
    container_name: myhomeapp-v2-qdrant   # Changed
    ports:
      - "6334:6333"                       # Changed from 6333
    volumes:
      - /volume4/root4/AppData/MyHomeApp-v2/qdrant:/qdrant/storage  # v2 data
    restart: unless-stopped

  cron:
    image: alpine:latest
    depends_on:
      - myhomeapp
    command: >
      sh -c "apk add --no-cache curl && printf '0 2 * * * curl -X POST -H \"Authorization: Bearer mysecretcronjobkey\" -H \"Content-Type: application/json\" -d \"{\\\"origin\\\":\\\"docker cron job v2\\\"}\" http://myhomeapp:3000/api/actions/perform-automated-tasks\n' > /etc/crontabs/root && crond -f -d 8"
    restart: unless-stopped
    container_name: myhomeapp-v2-cron     # Changed
```

### 1.4 — Commit and push

```bash
git add docker-compose.v2.yml
git commit -m "migration(step-1): add v2 docker-compose for side-by-side deployment"
git push
```

### 1.5 — Deploy v2 stack in Portainer

In Portainer, create a **new stack**:

| Setting | Value |
|---------|-------|
| Stack name | `myhomeapp-v2` |
| Build method | Repository |
| Repository URL | `https://github.com/Ikaer/MyHomeApp` |
| Repository reference | `refs/heads/migration/monorepo` |
| Compose path | `docker-compose.v2.yml` |

Click **Deploy the stack** and wait for the build.

### 1.6 — Validate both stacks

**Legacy stack** (unchanged):
- [ ] `http://<NAS-IP>:12344` — dashboard loads
- [ ] Anime page works
- [ ] Savings page works
- [ ] RAG page works (if it was working before)

**v2 stack** (clone):
- [ ] `http://<NAS-IP>:12350` — dashboard loads
- [ ] Anime page works, shows same data as legacy (copied database)
- [ ] Savings page works, shows same data
- [ ] RAG page works
- [ ] Qdrant accessible on port `6334`

### 1.7 — Verify data isolation

Make a small change in the v2 stack (e.g., hide an anime, record a balance) and verify it does **NOT** appear in the legacy stack. This confirms the data directories are truly separate.

---

## What Changes (and what doesn't)

| Changed | Not Changed |
|---------|-------------|
| New `docker-compose.v2.yml` file | Zero source code changes |
| New branch `migration/monorepo` | `main` branch untouched |
| New data dirs on NAS (`MyHomeApp-v2/`) | Legacy data dirs unchanged |
| New Portainer stack (`myhomeapp-v2`) | Legacy stack unchanged |

---

## Port Plan (reference)

| Service | Legacy Stack | v2 Stack |
|---------|-------------|----------|
| App | `12344:3000` | `12350:3000` |
| Qdrant | `6333:6333` | `6334:6333` |

---

## Checkpoint Validation

- [ ] Branch `migration/monorepo` exists and is pushed
- [ ] `MyHomeApp-v2/` data directories exist on NAS with copied data
- [ ] `docker-compose.v2.yml` committed and pushed
- [ ] Legacy stack still works on `:12344`
- [ ] v2 stack works on `:12350`
- [ ] Data isolation confirmed (changes in v2 don't appear in legacy)
- [ ] Tag: `git tag migration-step-1-validated`

---

## Rollback

If anything goes wrong: delete the `myhomeapp-v2` stack in Portainer, delete the `MyHomeApp-v2/` directories on the NAS. Legacy is untouched.
