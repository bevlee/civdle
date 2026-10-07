#!/usr/bin/env bash
# Tag-and-deploy, the civdle way: tag the commit, push the tag, `skaffold run`,
# wait for the rollout. Run from the repo root on a clean, pushed checkout.
#
# Usage: release.sh <version>      e.g. release.sh v0.5.0
#   Reads the app name (= namespace = deployment) from skaffold.yaml metadata.name.
#   Refuses a dirty tree, an existing tag, or a HEAD that isn't on the remote,
#   so the image is never tagged -dirty or built from unpushed code.
set -euo pipefail

VERSION=${1:?usage: release.sh vX.Y.Z}
[[ $VERSION =~ ^v[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?$ ]] || { echo "version must look like v1.2.3: $VERSION" >&2; exit 1; }
[[ -f skaffold.yaml ]] || { echo "run from the repo root (no skaffold.yaml here)" >&2; exit 1; }

APP=$(awk '/^metadata:/{m=1; next} m && /^[[:space:]]+name:/{print $2; exit}' skaffold.yaml)
[[ -n $APP ]] || { echo "no metadata.name in skaffold.yaml" >&2; exit 1; }

[[ -z $(git status --porcelain) ]] || { echo "working tree is dirty; commit or stash first" >&2; exit 1; }
git rev-parse -q --verify "refs/tags/$VERSION" >/dev/null && { echo "tag $VERSION already exists" >&2; exit 1; }

BRANCH=$(git rev-parse --abbrev-ref HEAD)
git fetch -q origin "$BRANCH"
[[ $(git rev-parse HEAD) == $(git rev-parse "origin/$BRANCH") ]] || { echo "HEAD differs from origin/$BRANCH; push or pull first" >&2; exit 1; }

echo "Releasing $APP $VERSION from $BRANCH @ $(git rev-parse --short HEAD) to context $(kubectl config current-context)"
read -r -p "Continue? [y/N] " ok
[[ $ok == [yY] ]] || exit 1

git tag -a "$VERSION" -m "$VERSION"
git push origin "$VERSION"
skaffold run
kubectl -n "$APP" rollout status "deployment/$APP" --timeout=5m
