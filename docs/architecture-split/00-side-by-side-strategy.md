# Side-by-Side Deployment Strategy

How to migrate safely without risking the production app.

---

## Principle

The legacy monolith stays deployed and untouched on `main`. All migration work happens on a **dedicated branch** deployed as a **separate Portainer stack**. Both run simultaneously on different ports. If migration fails at any point, we delete the new stack — zero impact.

---

## Branch Strategy

```
main                  ← Legacy app, never touched during migration
  │
  └── migration/monorepo   ← All migration work happens here
```

### Rules

1. **Never push migration changes to `main`** until the full migration is validated
2. The migration branch is long-lived — it accumulates all 7 steps
3. Each step gets its own commit(s) with a clear prefix: `migration(step-1): ...`
4. When a step is validated in Portainer, we tag it: `migration-step-1-validated`

---

## Portainer Setup

### Legacy stack (already exists)

| Setting | Value |
|---------|-------|
| Stack name | `myhomeapp` |
| Repository | `https://github.com/Ikaer/MyHomeApp` |
| Reference | `refs/heads/main` |
| Compose file | `docker-compose.yml` |
| Ports | `12344:3000` (app), `6333:6333` (qdrant) |

### New stack (created for migration)

| Setting | Value |
|---------|-------|
| Stack name | `myhomeapp-v2` |
| Repository | `https://github.com/Ikaer/MyHomeApp` |
| Reference | `refs/heads/migration/monorepo` |
| Compose file | depends on step (see below) |
| Ports | **Different from legacy** (see port plan) |

---

## Port Plan

Legacy and new stacks must not conflict. The new stack uses a different port range:

| Service | Legacy Port | New Stack Port |
|---------|-------------|----------------|
| Portal | — | `12350:3000` |
| Anime | (inside 12344) | `12351:3000` |
| Savings | (inside 12344) | `12352:3000` |
| RAG | (inside 12344) | `12353:3000` |
| Qdrant | `6333:6333` | `6334:6333` |

The legacy app on `:12344` and the new apps on `:12350-12353` coexist without conflict. Both access the **same NAS volumes** (read-only) so anime/savings data is the same.

### Data Isolation

**Critical**: the new stack must NOT write to the same data directories as the legacy stack, or both will corrupt shared JSON files.

| Service | Legacy Data Path | New Stack Data Path |
|---------|-----------------|---------------------|
| Anime | `/volume4/.../MyHomeApp/database/anime` | `/volume4/.../MyHomeApp-v2/database/anime` |
| Savings | `/volume4/.../MyHomeApp/database/savings` | `/volume4/.../MyHomeApp-v2/database/savings` |
| RAG | `/volume4/.../MyHomeApp/database/rag` | `/volume4/.../MyHomeApp-v2/database/rag` |
| Config | `/volume4/.../MyHomeApp/config` | `/volume4/.../MyHomeApp-v2/config` |
| Logs | `/volume4/.../MyHomeApp/logs` | `/volume4/.../MyHomeApp-v2/logs` |
| Qdrant | `/volume4/.../MyHomeApp/qdrant` | `/volume4/.../MyHomeApp-v2/qdrant` |

Before the first deployment, create the v2 data directories on the NAS and **copy** the current data into them so the new stack starts with real data to validate against.

```bash
# On the NAS (SSH)
cp -r /volume4/root4/AppData/MyHomeApp /volume4/root4/AppData/MyHomeApp-v2
```

---

## Deployment Checkpoints

Each migration step has a checkpoint where we deploy and validate before proceeding.

| Step | What to deploy | Compose file(s) | What to validate |
|------|---------------|-----------------|------------------|
| **1** | Branch + side-by-side Portainer stack | `docker-compose.v2.yml` (clone of legacy) | Both legacy and v2 stacks run independently, no interference |
| **2** | Shared package + monolith still works | `docker-compose.v2.yml` (same as step 1) | App builds and runs — all pages work |
| **3** | Anime split out | `docker-compose.anime.yml` | Anime page loads, API responds, cron runs |
| **4** | Savings split out | `docker-compose.savings.yml` | Savings page loads, all account types work, charts render |
| **5** | RAG split out | `docker-compose.rag.yml` | RAG page loads, ingest works, query works |
| **6** | Portal with rewrites | `docker-compose.yml` (portal) + all subapp composes | Navigation between all subapps works through portal |
| **7** | Cleanup complete | All compose files | Full regression — everything works as before |

### Validation Checklist (per step)

For each checkpoint, verify:

- [ ] Docker image builds successfully
- [ ] Container starts without crash loops
- [ ] Target pages load in browser
- [ ] API routes respond (test with requests.http)
- [ ] Data reads/writes work (create/edit an entry)
- [ ] Cron job triggers successfully (manual curl test)
- [ ] No console errors in browser

---

## Rollback Procedure

### If a step fails during development

Nothing is at risk — the legacy app runs on `main`, untouched. Options:

1. **Fix forward** — Debug and fix the issue on the migration branch
2. **Revert the step** — `git revert` the step's commits on the migration branch, redeploy
3. **Abandon** — Delete the `myhomeapp-v2` stack in Portainer, delete the migration branch. Legacy app is exactly as it was.

### If a step fails during Portainer deployment

1. Portainer will show the build error — the old containers keep running
2. Fix the code, push to `migration/monorepo`, click "Pull and redeploy" in Portainer
3. If unfixable, just delete the `myhomeapp-v2` stack

### After full migration is validated

1. Merge `migration/monorepo` → `main`
2. Update the legacy `myhomeapp` stack in Portainer to use the new compose files
3. Stop and delete the `myhomeapp-v2` test stack
4. Update ports back to the original range (12344 as portal entry point)
5. Delete v2 data directories after confirming everything works

---

## Portainer Multi-Compose Stacks

Portainer supports **one compose file per stack**. Since the monorepo produces multiple compose files (portal, anime, savings, rag), we have two options:

### Option A: One stack per compose file (recommended)

| Stack Name | Compose File | Branch |
|------------|-------------|--------|
| `myhomeapp-v2-portal` | `docker-compose.yml` | `refs/heads/migration/monorepo` |
| `myhomeapp-v2-anime` | `docker-compose.anime.yml` | `refs/heads/migration/monorepo` |
| `myhomeapp-v2-savings` | `docker-compose.savings.yml` | `refs/heads/migration/monorepo` |
| `myhomeapp-v2-rag` | `docker-compose.rag.yml` | `refs/heads/migration/monorepo` |

This is the natural fit — each subapp is independently deployable, which is the whole point of the split.

### Option B: Single merged compose file

Combine all services into one `docker-compose.yml` for the migration testing phase. Simpler to manage in Portainer but loses the independent deployment benefit.

**Recommendation**: Use Option A. It validates the real deployment model from the start.

---

## Timeline

```
Day 1   ─── Create migration/monorepo branch
            Step 1: Branch + side-by-side Portainer deployment
            Checkpoint: both stacks run independently
            
            Step 2: pnpm workspace + shared package
            Checkpoint: build still works
            
Day 2   ─── Step 3: Split anime
            Checkpoint: deploy anime stack, validate
            
Day 3   ─── Step 4: Split savings  
            Checkpoint: deploy savings stack, validate
            
Day 4   ─── Step 5: Split RAG
            Checkpoint: deploy RAG stack, validate
            
Day 5   ─── Step 6: Portal with rewrites
            Checkpoint: deploy portal, validate full navigation
            
Day 6   ─── Step 7: Cleanup + final validation
            Merge to main, swap stacks
```

Each "day" is a focused session — could be spread across actual days as needed.
