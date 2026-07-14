#!/usr/bin/env sh
set -eu

release_dir=${1:?Release directory is required}
app_root=${APP_ROOT:-/srv/studybox-ai}
app_user=${APP_USER:-studybox}
environment_file=${ENVIRONMENT_FILE:-/etc/studybox-ai/api.env}
current_link="$app_root/current"
next_link="$app_root/current.next"

case "$release_dir" in
  "$app_root"/releases/*) ;;
  *)
    echo "Release directory must be inside $app_root/releases" >&2
    exit 1
    ;;
esac

test -f "$release_dir/package.json"
test -f "$environment_file"

chown -R "$app_user:$app_user" "$release_dir"

runuser -u "$app_user" -- sh -c '
  set -a
  . "$1"
  set +a
  cd "$2"
  npm ci
  npm run build
  node apps/api/dist/cli/migrate.js
' sh "$environment_file" "$release_dir"

previous_release=""
if test -L "$current_link"; then
  previous_release=$(readlink -f "$current_link" || true)
fi

rm -f "$next_link"
ln -s "$release_dir" "$next_link"
mv -Tf "$next_link" "$current_link"
systemctl restart studybox-api.service

attempt=0
until curl --fail --silent --show-error http://127.0.0.1:3001/api/ready >/dev/null; do
  attempt=$((attempt + 1))
  if test "$attempt" -ge 15; then
    if test -n "$previous_release" && test -d "$previous_release"; then
      rm -f "$next_link"
      ln -s "$previous_release" "$next_link"
      mv -Tf "$next_link" "$current_link"
      systemctl restart studybox-api.service
    fi
    echo "New release did not become ready" >&2
    exit 1
  fi
  sleep 2
done
