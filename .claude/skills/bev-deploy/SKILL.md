---
name: bev-deploy
description: Set up or release a project with the civdle deploy style — Docker image to docker.io/bevdev1/APP, Skaffold + Kustomize to its own APP namespace (and APP-dev for `skaffold dev`), Traefik ingress at APP.bevsoft.com with a cert-manager cert, released by pushing a git tag and running `skaffold run` from a laptop. Use when asked to deploy, scaffold k8s/skaffold, add a dev environment, or cut a release for a bevsoft project.
---

# bev-deploy

One app = one image = one namespace. No CI deploy; releases go out from a
laptop with Skaffold, and the image tag comes from the git tag.

## Conventions

| Thing | Prod | Dev (`skaffold dev`) |
|---|---|---|
| Image | `docker.io/bevdev1/<app>:<git describe --tags>` | `docker.io/bevdev1/<app>:dev` |
| Namespace | `<app>` | `<app>-dev` |
| Host | `https://<app>.bevsoft.com` | `https://<app>-dev.bevsoft.com` |
| Manifests | `k8s/` (Kustomize) | `k8s-dev/` (Kustomize) |
| Dockerfile | `Dockerfile` | `Dockerfile.dev` (dev server + file sync) |
| TLS | cert-manager `Certificate`, ClusterIssuer `letsencrypt-prod`, single host | same, single host |
| Ingress | `ingressClassName: traefik`, Service port 80 → container `http` port | plus Traefik `compress` middleware |

Every resource is named `<app>` and labelled `app: <app>`; the namespace
itself is a manifest in the kustomization so first installs work.

Pods: non-root, `seccompProfile: RuntimeDefault`, all capabilities dropped,
no privilege escalation. Prod has a read-only root with an `emptyDir` on
`/tmp`; dev keeps the root writable (caches + Skaffold sync) and uses the
`Recreate` strategy.

Deployment `image:` is the **bare** artifact name (`docker.io/bevdev1/<app>`)
so Skaffold substitutes the tag it built. Don't put a tag there.

Tag policy is `gitCommit: {variant: Tags}`: `v0.4.0` on a tagged commit,
`v0.4.0-3-gabc1234` after, `-dirty` with uncommitted changes.

## Scaffolding a new project

`<skill-dir>` is the directory this SKILL.md was loaded from; the scripts sit beside it.

From the new repo's root:

```bash
bash <skill-dir>/scaffold.sh <app> [--static] [--no-dev] \
  [--host H] [--dev-host H] [--port N] [--uid N] [--dev-port N] [--dev-uid N] [--force]
```

- `--static`: Vite/SvelteKit static site → also writes the two-stage
  node→nginx-unprivileged `Dockerfile`, a Vite `Dockerfile.dev`, `nginx.conf`.
  This is exactly civdle's setup.
- Anything else (a Node/Go/Python server): omit `--static`, set `--port` and
  `--uid` to what the image runs as, then write the `Dockerfile` by hand. The
  image must run as that non-root uid, listen on that port, serve `GET /` with
  200 (it's the probe path; change it in `k8s/deployment.yaml` otherwise) and
  only write under `/tmp`. Revisit the resource limits (64Mi is sized for nginx).
- The dev profile syncs `src/**` and `static/**`; edit `skaffold.yaml` if the
  project's layout differs, or pass `--no-dev`.
- Existing files are skipped, never overwritten, unless `--force`.

After scaffolding, verify before the first release:

```bash
kubectl kustomize k8s >/dev/null && kubectl kustomize k8s-dev >/dev/null
skaffold diagnose
docker build -t test . && docker run --rm -p 8080:<port> --read-only --tmpfs /tmp -u <uid> test
```

Then add a Deployment section to the README like civdle's.

## Releasing

```bash
bash <skill-dir>/release.sh v0.5.0
```

which does, after checking the tree is clean and HEAD is pushed:

```bash
git tag -a v0.5.0 -m v0.5.0
git push origin v0.5.0
skaffold run
kubectl -n <app> rollout status deployment/<app> --timeout=5m
```

Rollback: `git checkout v0.4.0 && skaffold run` (or `kubectl -n <app> rollout undo deployment/<app>`).

## Prerequisites (once per laptop / cluster)

- `docker login` to Docker Hub as `bevdev1`; `kubectl` context pointing at the cluster.
- The Docker Hub repo must be **public** — manifests have no `imagePullSecrets`.
- Cluster already has Traefik, cert-manager and the `letsencrypt-prod` ClusterIssuer (http01).
- DNS for each new host points at Traefik before the first deploy, or http01 fails.
