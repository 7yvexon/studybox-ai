#!/usr/bin/env sh
set -eu

backup_file=${1:?Backup file path is required}
gzip -dc "$backup_file" | docker compose exec -T database psql -U "${POSTGRES_USER:-studybox}" "${POSTGRES_DB:-studybox}"
