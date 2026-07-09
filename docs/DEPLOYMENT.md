# Deployment (VPS)

Pull-based, fully automated. Every image — interface **and** backend — is built in
GitHub Actions and published to GHCR. **The VPS builds nothing**; it only syncs
config from git and pulls the latest images. It polls on a timer, so pushes deploy
themselves, and you can still run the script by hand when you SSH in. Nothing
inbound is exposed and no deploy credentials live in GitHub.

## Images

| Service                        | Image                                                 | Built by                     |
| ------------------------------ | ----------------------------------------------------- | ---------------------------- |
| interface                      | `ghcr.io/cranberriez/discordclipsaver-interface`      | `interface-image.yml`        |
| bot-api                        | `ghcr.io/cranberriez/discordclipsaver-bot-api`        | `backend-images.yml`         |
| bot-discord                    | `ghcr.io/cranberriez/discordclipsaver-bot-discord`    | `backend-images.yml`         |
| worker + db-schema             | `ghcr.io/cranberriez/discordclipsaver-worker`         | `backend-images.yml`         |

`db-schema` reuses the `worker` image (same Dockerfile) and just overrides the
command, so only three backend images are built. Each build publishes `:latest`
plus an immutable `:sha-<commit>` tag for rollback.

## How it works

- Push a change under `interface/**` → `interface-image.yml` builds + pushes the
  interface image.
- Push a change under `python/**` (or `settings.default.jsonc`) → `backend-images.yml`
  builds + pushes the three backend images.
- The VPS timer runs `deploy.sh`, which `git pull`s config, `docker compose pull`s
  the app images, and `up -d` restarts only the containers whose image changed.
  If nothing changed, it's a no-op.

Because deploys use the exact image CI built, they're reproducible and inherently
CI-gated: a failed build publishes no image, so the VPS never picks up broken code.

## One-time setup

Assumes the repo is checked out on the VPS (default path `/opt/DiscordClipSaver`)
on the `master` branch. The VPS only needs the repo for config (`docker-compose-prod.yml`,
`settings.default.jsonc`) and your local `.env` / `.env.global` — no build toolchain.

### 1. Create the deploy script

```bash
cd /opt/DiscordClipSaver
cp deploy.example.sh deploy.sh
chmod +x deploy.sh
./deploy.sh            # test it once manually
```

### 2. GHCR access (only if the packages are private)

If pulling fails with an auth error, log in once with a Personal Access Token
scoped to `read:packages`. This credential stays on the VPS.

```bash
echo "$GHCR_PAT" | docker login ghcr.io -u cranberriez --password-stdin
```

### 3. Install the systemd units

```bash
sudo cp deploy/systemd/dcs-deploy.service /etc/systemd/system/
sudo cp deploy/systemd/dcs-deploy.timer   /etc/systemd/system/
sudo cp deploy/systemd/dcs-stack.service  /etc/systemd/system/
# Edit WorkingDirectory / ExecStart paths in each if your repo isn't at /opt/DiscordClipSaver
sudo systemctl daemon-reload
```

### 4. Enable auto-deploy (the poll)

```bash
sudo systemctl enable --now dcs-deploy.timer
journalctl -u dcs-deploy.service -f      # live deploy logs
systemctl list-timers dcs-deploy.timer   # next scheduled run
```

### 5. Enable crash / reboot recovery

```bash
sudo systemctl enable docker            # daemon starts on boot
sudo systemctl enable --now dcs-stack.service
```

Every long-running service in `docker-compose-prod.yml` already has
`restart: unless-stopped`, so container crashes self-heal. `dcs-stack.service`
covers the host-level case (reboot/crash) by bringing the full stack up on boot.

## Day-to-day

```bash
./deploy.sh                              # sync + pull + restart changed (what the timer runs)
journalctl -u dcs-deploy.service -n 50   # recent deploy history
docker compose -f docker-compose-prod.yml ps
```

## Rollback

`:latest` moves with each build, but every build also pushes an immutable
`sha-<commit>` tag. To roll a service back, pin it to a previous SHA (via a compose
override file) and restart it — e.g. the interface:

```bash
docker compose -f docker-compose-prod.yml pull \
  ghcr.io/cranberriez/discordclipsaver-interface:sha-<commit>
# point interface.image at that tag in an override, then:
docker compose -f docker-compose-prod.yml up -d interface
```

## Local development

`docker-compose.yml` (the dev compose) still uses `build:` for local iteration —
only `docker-compose-prod.yml` was switched to prebuilt images. Nothing changes
about how you run the stack locally.

## Housekeeping

Old image layers accumulate. Add a periodic prune (cron or a separate timer):

```bash
docker image prune -f
```
