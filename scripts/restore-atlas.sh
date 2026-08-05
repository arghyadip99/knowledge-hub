#!/usr/bin/env bash

set -euo pipefail

archive_path="/tmp/knowledge-hub-atlas-migration.archive.gz"
container_name="knowledge-hub-mongo-1"

if ! docker inspect "$container_name" >/dev/null 2>&1; then
  echo "Local MongoDB container '$container_name' is not running."
  exit 1
fi

read -r -s -p "Paste your MongoDB Atlas URI, then press Enter: " atlas_uri
echo

if [[ "$atlas_uri" != mongodb://* && "$atlas_uri" != mongodb+srv://* ]]; then
  echo "That does not look like a MongoDB connection string. Nothing was restored."
  exit 1
fi

docker exec -e ATLAS_URI="$atlas_uri" "$container_name" sh -lc \
  "mongorestore --uri=\"\$ATLAS_URI\" --archive=$archive_path --gzip"

echo "Atlas restore completed. Your Atlas URI was not saved."
