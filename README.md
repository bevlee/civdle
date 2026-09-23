# Civdle

SvelteKit app, fully client-side (game state lives in localStorage), built with
`adapter-static` and served by nginx at https://civdle.bevsoft.com.

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

### Release from CI

Push a version tag and `.github/workflows/deploy.yml` tests, builds, pushes and
rolls out that tag:

```bash
git tag v0.1.0
git push origin v0.1.0
```

The workflow needs these repository secrets:

| Secret | Value |
| --- | --- |
| `DOCKERHUB_USERNAME` | `bevdev1` |
| `DOCKERHUB_TOKEN` | Docker Hub access token with write access |
| `OKE_CLUSTER_OCID` | OKE cluster OCID |
| `OCI_CLI_USER` | OCI user OCID |
| `OCI_CLI_TENANCY` | OCI tenancy OCID |
| `OCI_CLI_FINGERPRINT` | Fingerprint of the API signing key |
| `OCI_CLI_KEY_CONTENT` | PEM private key of the API signing key |

### Deploy from a laptop

```bash
skaffold run
kubectl -n civdle rollout status deployment/civdle --timeout=5m
```

The image tag follows `git describe --tags`: `v0.2.0` on a tagged commit,
`v0.2.0-3-gabc1234` three commits later, plus `-dirty` for uncommitted changes.
