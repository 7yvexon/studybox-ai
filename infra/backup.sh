#!/usr/bin/env sh
set -eu

backup_dir=${BACKUP_DIR:-./backups}
timestamp=$(date -u +%Y%m%dT%H%M%SZ)
: "${DATABASE_URL:?DATABASE_URL is required}"
mkdir -p "$backup_dir"
pg_dump --dbname="$DATABASE_URL" --no-owner --no-privileges | gzip > "$backup_dir/studybox-$timestamp.sql.gz"
find "$backup_dir" -type f -name 'studybox-*.sql.gz' -mtime +14 -delete
