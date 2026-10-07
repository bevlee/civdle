#!/usr/bin/env bash
# Scaffold the civdle-style deploy setup into the current repo:
#   skaffold.yaml, k8s/ (prod) and, unless --no-dev, k8s-dev/ (skaffold dev).
# With --static it also writes the nginx Dockerfile, Dockerfile.dev and
# nginx.conf for a Vite/SvelteKit static build. Existing files are never
# overwritten unless --force is given.
#
# Usage: scaffold.sh <app> [options]
#   --host HOST         prod hostname         (default: <app>.bevsoft.com)
#   --dev-host HOST     dev hostname          (default: <app>-dev.bevsoft.com)
#   --registry REG      image registry/user   (default: docker.io/bevdev1)
#   --port N            prod container port   (default: 8080)
#   --uid N             prod container uid    (default: 101, nginx-unprivileged)
#   --dev-port N        dev container port    (default: 5173, Vite)
#   --dev-uid N         dev container uid     (default: 1000, node image)
#   --no-dev            skip k8s-dev/ and the skaffold dev profile
#   --static            also write Dockerfile, Dockerfile.dev, nginx.conf
#   --force             overwrite existing files
set -euo pipefail

usage() { sed -n '2,/^set -euo/p' "$0" | sed '$d; s/^# \{0,1\}//'; exit "${1:-0}"; }

[[ $# -ge 1 && $1 != -* ]] || usage 1
APP=$1; shift
[[ $APP =~ ^[a-z0-9]([-a-z0-9]*[a-z0-9])?$ ]] || { echo "app name must be a DNS label: $APP" >&2; exit 1; }

HOST="$APP.bevsoft.com"
DEV_HOST="$APP-dev.bevsoft.com"
REGISTRY="docker.io/bevdev1"
PORT=8080 UID_=101 DEV_PORT=5173 DEV_UID=1000
DEV=1 STATIC=0 FORCE=0
while [[ $# -gt 0 ]]; do
  case $1 in
    --host) HOST=$2; shift 2 ;;
    --dev-host) DEV_HOST=$2; shift 2 ;;
    --registry) REGISTRY=$2; shift 2 ;;
    --port) PORT=$2; shift 2 ;;
    --uid) UID_=$2; shift 2 ;;
    --dev-port) DEV_PORT=$2; shift 2 ;;
    --dev-uid) DEV_UID=$2; shift 2 ;;
    --no-dev) DEV=0; shift ;;
    --static) STATIC=1; shift ;;
    --force) FORCE=1; shift ;;
    -h|--help) usage ;;
    *) echo "unknown option: $1" >&2; usage 1 ;;
  esac
done

IMAGE="$REGISTRY/$APP"
NS=$APP
DEV_NS=$APP-dev

# write <path>: stdin -> path, skipping existing files unless --force.
write() {
  if [[ -e $1 && $FORCE -eq 0 ]]; then
    echo "skip   $1 (exists; --force to overwrite)"
    cat >/dev/null
    return
  fi
  mkdir -p "$(dirname "$1")"
  cat >"$1"
  echo "wrote  $1"
}

# ---------------------------------------------------------------- skaffold
{
cat <<EOF
apiVersion: skaffold/v4beta14
kind: Config
metadata:
  name: $APP
build:
  # \`git describe --tags\`: v0.2.0 on a tagged commit, v0.2.0-3-gabc1234 three
  # commits later, with -dirty for uncommitted changes.
  tagPolicy:
    gitCommit:
      variant: Tags
  artifacts:
    - image: $IMAGE
      docker:
        dockerfile: Dockerfile
deploy:
  kubectl:
    defaultNamespace: $NS
manifests:
  kustomize:
    paths:
      - k8s
EOF
if [[ $DEV -eq 1 ]]; then
cat <<EOF

profiles:
  # \`skaffold dev\` turns this on automatically; \`skaffold run\` stays on the
  # production image above. Runs the dev server in $DEV_NS at
  # https://$DEV_HOST, syncing edits into the pod for hot reload.
  - name: dev
    activation:
      - command: dev
    build:
      tagPolicy:
        envTemplate:
          template: dev
      artifacts:
        - image: $IMAGE
          docker:
            dockerfile: Dockerfile.dev
          # Source and static assets are copied into the running pod; anything
          # else (package.json, config files) triggers a full image rebuild.
          sync:
            manual:
              - src: "src/**"
                dest: .
              - src: "static/**"
                dest: .
    manifests:
      kustomize:
        paths:
          - k8s-dev
    deploy:
      kubectl:
        defaultNamespace: $DEV_NS
EOF
fi
} | write skaffold.yaml

# ---------------------------------------------------------------- k8s (prod)
write k8s/kustomization.yaml <<EOF
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

# Single entry point for Skaffold, which rewrites the image to the tag it
# built. The namespace is declared first for first installs.
resources:
  - namespace.yaml
  - service.yaml
  - deployment.yaml
  - certificate.yaml
  - ingress.yaml
EOF

write k8s/namespace.yaml <<EOF
apiVersion: v1
kind: Namespace
metadata:
  name: $NS
  labels:
    app: $APP
EOF

write k8s/service.yaml <<EOF
apiVersion: v1
kind: Service
metadata:
  name: $APP
  namespace: $NS
  labels:
    app: $APP
spec:
  selector:
    app: $APP
  ports:
    - name: http
      port: 80
      targetPort: $PORT
      protocol: TCP
      appProtocol: http
EOF

write k8s/deployment.yaml <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: $APP
  namespace: $NS
  labels:
    app: $APP
spec:
  replicas: 1
  revisionHistoryLimit: 3
  progressDeadlineSeconds: 300
  selector:
    matchLabels:
      app: $APP
  template:
    metadata:
      labels:
        app: $APP
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: $UID_
        runAsGroup: $UID_
        seccompProfile:
          type: RuntimeDefault
      containers:
        - name: $APP
          # Bare artifact name so Skaffold rewrites it to the tag it builds.
          image: $IMAGE
          imagePullPolicy: IfNotPresent
          ports:
            - name: http
              containerPort: $PORT
              protocol: TCP
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop:
                - ALL
          resources:
            requests:
              cpu: 10m
              memory: 16Mi
            limits:
              cpu: 200m
              memory: 64Mi
          readinessProbe:
            httpGet:
              path: /
              port: http
            periodSeconds: 5
            failureThreshold: 3
          livenessProbe:
            httpGet:
              path: /
              port: http
            periodSeconds: 15
            failureThreshold: 3
          volumeMounts:
            # Writable scratch space under a read-only root (nginx pid/temp files).
            - name: tmp
              mountPath: /tmp
      volumes:
        - name: tmp
          emptyDir:
            sizeLimit: 64Mi
EOF

write k8s/certificate.yaml <<EOF
# Single-host cert: letsencrypt-prod solves http01, which can't issue wildcards.
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: $APP
  namespace: $NS
spec:
  commonName: $HOST
  dnsNames:
    - $HOST
  issuerRef:
    kind: ClusterIssuer
    name: letsencrypt-prod
  secretName: $APP-tls
EOF

write k8s/ingress.yaml <<EOF
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: $APP-ingress
  namespace: $NS
  labels:
    app: $APP
spec:
  ingressClassName: traefik
  tls:
    - hosts:
        - $HOST
      secretName: $APP-tls
  rules:
    - host: $HOST
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: $APP
                port:
                  number: 80
EOF

# ---------------------------------------------------------------- k8s-dev
if [[ $DEV -eq 1 ]]; then
write k8s-dev/kustomization.yaml <<EOF
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

# Dev stack for \`skaffold dev\` (the dev profile in skaffold.yaml): the dev
# server at $DEV_HOST, in its own namespace.
resources:
  - namespace.yaml
  - service.yaml
  - deployment.yaml
  - certificate.yaml
  - middleware.yaml
  - ingress.yaml
EOF

write k8s-dev/namespace.yaml <<EOF
apiVersion: v1
kind: Namespace
metadata:
  name: $DEV_NS
  labels:
    app: $APP
EOF

write k8s-dev/service.yaml <<EOF
apiVersion: v1
kind: Service
metadata:
  name: $APP
  namespace: $DEV_NS
  labels:
    app: $APP
spec:
  selector:
    app: $APP
  ports:
    - name: http
      port: 80
      targetPort: $DEV_PORT
      protocol: TCP
      appProtocol: http
EOF

write k8s-dev/deployment.yaml <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: $APP
  namespace: $DEV_NS
  labels:
    app: $APP
spec:
  replicas: 1
  revisionHistoryLimit: 1
  # Recreate so a redeploy never leaves two dev servers behind the ingress.
  strategy:
    type: Recreate
  selector:
    matchLabels:
      app: $APP
  template:
    metadata:
      labels:
        app: $APP
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: $DEV_UID
        runAsGroup: $DEV_UID
        seccompProfile:
          type: RuntimeDefault
      containers:
        - name: $APP
          # Bare artifact name so Skaffold rewrites it to the tag it builds.
          image: $IMAGE
          # The :dev tag is reused, so always pull.
          imagePullPolicy: Always
          ports:
            - name: http
              containerPort: $DEV_PORT
              protocol: TCP
          securityContext:
            allowPrivilegeEscalation: false
            # The dev server writes caches and Skaffold syncs source files in,
            # so the root filesystem stays writable in dev.
            readOnlyRootFilesystem: false
            capabilities:
              drop:
                - ALL
          resources:
            requests:
              cpu: 100m
              memory: 256Mi
            limits:
              cpu: "1"
              memory: 1Gi
          # Dev servers compile on the first request, so give it time before probing.
          readinessProbe:
            httpGet:
              path: /
              port: http
            initialDelaySeconds: 5
            periodSeconds: 5
            timeoutSeconds: 10
            failureThreshold: 6
EOF

write k8s-dev/certificate.yaml <<EOF
# Single-host cert, like prod: http01 can't issue wildcards, and a wildcard
# per dev namespace would also count against Let's Encrypt's duplicate-cert limit.
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: $APP-dev
  namespace: $DEV_NS
spec:
  commonName: $DEV_HOST
  dnsNames:
    - $DEV_HOST
  issuerRef:
    kind: ClusterIssuer
    name: letsencrypt-prod
  secretName: $APP-dev-tls
EOF

write k8s-dev/middleware.yaml <<EOF
# Dev servers send unbundled, uncompressed modules; gzip at Traefik cuts that a lot.
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: compress
  namespace: $DEV_NS
spec:
  compress: {}
EOF

write k8s-dev/ingress.yaml <<EOF
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: $APP-ingress
  namespace: $DEV_NS
  labels:
    app: $APP
  annotations:
    # <namespace>-<name>@kubernetescrd, see middleware.yaml.
    traefik.ingress.kubernetes.io/router.middlewares: $DEV_NS-compress@kubernetescrd
spec:
  ingressClassName: traefik
  tls:
    - hosts:
        - $DEV_HOST
      secretName: $APP-dev-tls
  rules:
    # HMR websockets share this host and port, which Traefik proxies as-is.
    - host: $DEV_HOST
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: $APP
                port:
                  number: 80
EOF
fi

# ---------------------------------------------------------------- static app
if [[ $STATIC -eq 1 ]]; then
write Dockerfile <<'EOF'
# --- build stage ---
FROM docker.io/node:26-bookworm-slim AS builder
WORKDIR /app

# Manifests before source: npm ci re-runs only when dependencies change.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# --- serve stage ---
# nginx-unprivileged runs as uid 101 on port 8080 and keeps its pid and temp
# files under /tmp, which lets the pod run with a read-only root.
FROM docker.io/nginxinc/nginx-unprivileged:1.29-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/build /usr/share/nginx/html

EXPOSE 8080
EOF

write Dockerfile.dev <<'EOF'
# Dev image for `skaffold dev`: runs the Vite dev server so edits under src/
# and static/ are synced into the pod and hot-reloaded, with no image rebuild.
FROM docker.io/node:26-bookworm-slim
WORKDIR /app

# Owned by the unprivileged node user so Skaffold's file sync and Vite's
# caches can write here.
RUN chown node:node /app
USER node

COPY --chown=node:node package.json package-lock.json ./
RUN npm ci

COPY --chown=node:node . .

EXPOSE 5173
CMD ["npx", "vite", "dev", "--host", "0.0.0.0", "--port", "5173", "--strictPort"]
EOF

write nginx.conf <<'EOF'
server {
    listen 8080;
    server_name _;
    root /usr/share/nginx/html;

    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;

    # Vite fingerprints everything under _app/immutable (SvelteKit) or assets/
    # (plain Vite), so those can be cached forever.
    location ~ ^/(_app/immutable|assets)/ {
        add_header Cache-Control "public, max-age=31536000, immutable";
        try_files $uri =404;
    }

    # The shell must always revalidate so a deploy is picked up on next load.
    location / {
        add_header Cache-Control "no-cache";
        try_files $uri $uri/ /index.html;
    }
}
EOF
fi

write .dockerignore <<'EOF'
node_modules
build
dist
.svelte-kit
.git
.gitignore
.github
Dockerfile
Dockerfile.dev
.dockerignore
k8s
k8s-dev
skaffold.yaml
.env
.env.*
!.env.example
.DS_Store
docs
.claude
*.tsbuildinfo
EOF

cat <<EOF

Scaffolded $APP:
  image      $IMAGE
  prod       https://$HOST  (namespace $NS)
EOF
[[ $DEV -eq 1 ]] && echo "  dev        https://$DEV_HOST  (namespace $DEV_NS)"
HOSTS=$HOST; [[ $DEV -eq 1 ]] && HOSTS="$HOST and $DEV_HOST"
cat <<EOF

Next:
  1. DNS: point $HOSTS at the cluster's Traefik.
  2. Make sure $IMAGE exists on Docker Hub and is public (no imagePullSecrets).
  3. Check: kubectl kustomize k8s >/dev/null && skaffold diagnose
  4. Release: tag + push, then skaffold run (see bev-deploy/release.sh).
EOF
[[ $STATIC -eq 0 ]] && echo "  !  No Dockerfile written: yours must listen on $PORT as uid $UID_ with a read-only root (only /tmp writable)."
exit 0
