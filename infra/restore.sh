#!/usr/bin/env sh
set -eu

backup_file=${1:?Backup file path is required}
: "${DATABASE_URL:?DATABASE_URL is required}"
gzip -dc "$backup_file" | psql --dbname="$DATABASE_URL" --set=ON_ERROR_STOP=1
