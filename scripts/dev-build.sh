#!/usr/bin/env bash
#
# Build dsh-composer-enhance.
#
# Why this script exists at all: the session workspace sits on a fuse.portal
# mount (/run/user/1000/doc/<id>/dsh) where the getcwd(2) path walk fails, so
# Node's process.cwd() throws ENOENT and pnpm/esbuild cannot run with the
# workspace as their working directory. The workspace stays the single source of
# truth; this script mirrors the sources into a real directory, builds there, and
# copies the artifacts back.
set -euo pipefail

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD="${DSHCE_BUILD:-$HOME/work/dshce-build}"

mkdir -p "$BUILD"
rm -rf "$BUILD/src" "$BUILD/scripts"
for item in src scripts package.json tsconfig.json cordis.patch.yml README.md .gitignore; do
	[ -e "$SRC/$item" ] && cp -R "$SRC/$item" "$BUILD/"
done

cd "$BUILD"
if [ ! -d node_modules ] || [ "${DSHCE_REINSTALL:-0}" = "1" ]; then
	pnpm install --no-frozen-lockfile
fi
pnpm run build

mkdir -p "$SRC/lib"
cp -R "$BUILD/lib/." "$SRC/lib/"
echo "artifacts synced: $SRC/lib"
