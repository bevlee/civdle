# Civdle

SvelteKit app, fully client-side (game state lives in localStorage), built with
`adapter-static` and served by nginx at https://civdle.bevsoft.com.

Current version: **v0.4.0**

## Development

```bash
npm install
npm run dev
npm test
```

## Deployment

Skaffold builds the image (`docker.io/bevdev1/civdle`), pushes it, and applies
the Kustomize manifests in `k8s/` (namespace, deployment, service, cert-manager
certificate and Traefik ingress) to the `civdle` namespace.

To release, tag the commit and deploy it from your machine:

```bash
git tag v0.4.0
git push origin v0.4.0
skaffold run
kubectl -n civdle rollout status deployment/civdle --timeout=5m
```

The image tag follows `git describe --tags`: `v0.4.0` on a tagged commit,
`v0.4.0-3-gabc1234` three commits later, plus `-dirty` for uncommitted changes.
