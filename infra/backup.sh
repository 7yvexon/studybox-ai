#!/usr/bin/env sh
set -eu

backup_dir=${BACKUP_DIR:-./backups}
timestamp=$(date -u +%Y%m%dT%H%M%SZ)
mkdir -p "$backup_dir"
docker compose exec -T database pg_dump -U "${POSTGRES_USER:-studybox}" "${POSTGRES_DB:-studybox}" | gzip > "$backup_dir/studybox-$timestamp.sql.gz"
find "$backup_dir" -type f -name 'studybox-*.sql.gz' -mtime +14 -delete
