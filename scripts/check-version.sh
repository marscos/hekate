#!/usr/bin/env bash
# Fails unless a release tag, package.json and src-tauri/Cargo.toml agree on
# the version. tauri.conf.json reads its version from package.json.
#
# Usage: scripts/check-version.sh v0.2.0
set -euo pipefail

tag="${1:-}"
if [[ -z "$tag" ]]; then
  echo "usage: $0 <tag>  (e.g. v0.2.0)" >&2
  exit 2
fi

root="$(cd "$(dirname "$0")/.." && pwd)"
tag_version="${tag#v}"
pkg_version="$(node -p "require('$root/package.json').version")"
cargo_version="$(awk '
  /^\[/ { in_pkg = ($0 == "[package]") }
  in_pkg && /^version[[:space:]]*=/ { gsub(/.*=[[:space:]]*"|".*/, ""); print; exit }
' "$root/src-tauri/Cargo.toml")"

if [[ "$tag_version" == "$pkg_version" && "$tag_version" == "$cargo_version" ]]; then
  echo "version $tag_version matches tag $tag"
  exit 0
fi

echo "version mismatch for tag $tag:" >&2
echo "  tag                  $tag_version" >&2
echo "  package.json         $pkg_version" >&2
echo "  src-tauri/Cargo.toml $cargo_version" >&2
exit 1
