#!/usr/bin/env bash
# Run once at the start of a session, from the repo root:  bash tools/fusions/set_repo_path.sh
# The wave script and the authors' brief name the repo folder; this points them at where it really is.
set -e
ROOT="$(pwd)"
[ -f tools/fusions/chunks.json ] || { echo "run from the repo root"; exit 1; }
sed -i "s#REPO_ROOT#${ROOT}#g" tools/fusions/wave.workflow.js tools/fusions/AUTHORING.md
echo "repo path set to ${ROOT}"
