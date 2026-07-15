# StudyBox AI

StudyBox AI는 질문의 맥락, 학생의 답변 수준, 학습 목적에 맞춰 설명 방식을 바꾸는 학습 서비스 MVP입니다. 공개 소개 화면, 가입·로그인, 대화 기록이 남는 학습 작업 공간을 하나의 저장소에서 제공합니다. 기본 AI 제공자는 `mock`이므로 API 키나 로컬 데이터베이스 없이도 사용자 흐름을 검증할 수 있습니다.

기본 개발·빌드 경로는 Codex Sites 호환 Vinext 앱입니다. 브라우저 화면은 React로 유지하고, API는 Cloudflare Worker 호환 방식으로 실행하며 사용자·세션·대화 데이터는 D1에 저장합니다. 기존 Express·PostgreSQL VPS 구성도 별도 명령으로 유지합니다.

## 구성

```text
apps/
├─ api/                 Express API, 인증, 메모리/PostgreSQL 저장소, AI 어댑터
└─ web/                 React + Vite 사용자 화면
app/                    Sites 페이지와 API 라우트
sites/                  Worker 호환 API, D1 저장소, 인증, AI 어댑터
db/                     D1 스키마
drizzle/                Sites가 적용하는 D1 마이그레이션
worker/                 Sites Worker 진입점
packages/
└─ shared/              공통 학습 설정·대화 타입
infra/
├─ deploy/              릴리스 활성화 스크립트
├─ nginx/               네이티브 Nginx 설정 예시
├─ systemd/             API 서비스 유닛
├─ backup.sh            PostgreSQL 백업
└─ restore.sh           PostgreSQL 복구
```

## 제공 기능

- 아이디·비밀번호 가입과 로그인, 학생 프로필 수집, 로그아웃, 계정 삭제
- 사용자별 대화 생성·조회·제목 수정·삭제와 선택 가능한 메모리/영구 저장
- 다섯 학습 모드, 학년별 답변 수준, 답변 길이 설정
- 계정별 AI 답변 제한, Argon2id 비밀번호 해시, 만료 DB 세션
- 모의 AI와 OpenAI 호환 AI 엔드포인트를 교체할 수 있는 `ChatProvider`
- 상태 점검, 구조화 로그, Nginx, systemd, CI 및 수동 배포 워크플로

## 빠른 시작

Node.js 22.13 이상이 필요합니다. 기본 명령은 로컬 D1 마이그레이션을 적용한 뒤 Sites 호환 개발 서버를 시작하며, 계정과 대화는 `.wrangler` 아래의 로컬 데이터베이스에 유지됩니다.

```powershell
npm ci
npm run dev
```

웹과 API는 `http://localhost:5173`에서 같은 출처로 실행됩니다. Sites 배포용 빌드는 다음 명령으로 검증합니다.

```powershell
npm run build
```

빌드 결과에는 Worker 진입점, 정적 자산, Sites 호스팅 설정, D1 마이그레이션이 함께 포함됩니다.

기존 VPS용 Express·PostgreSQL 구성을 실행하거나 빌드하려면 다음 명령을 사용합니다.

```powershell
npm run dev:vps
npm run build:vps
```

VPS 구성에서 PostgreSQL을 사용하려면 `.env.example`을 `.env`로 복사하고 `STORAGE_MODE=postgres`, `DATABASE_URL`을 설정한 뒤 다음 명령을 실행합니다.

```powershell
npm run db:migrate
```

## 검사 명령

```powershell
npm run typecheck
npm test
npm run build
```

## Ubuntu VPS 운영 배포

운영 서버는 Docker 없이 Node.js, PostgreSQL, Nginx, systemd를 직접 사용합니다. API는 루프백 주소에서만 수신하고 Nginx가 정적 웹과 `/api` 요청을 같은 도메인으로 제공합니다.

### 서버 초기 설정

Ubuntu 24.04 LTS 서버에 Node.js 22, npm, PostgreSQL 16, Nginx, Certbot, curl을 설치합니다. 방화벽은 SSH·HTTP·HTTPS만 열고 API 포트 `3001`은 열지 않습니다.

```bash
sudo adduser --system --group --home /srv/studybox-ai studybox
sudo adduser deployer
sudo install -d -o deployer -g deployer /srv/studybox-ai/releases
sudo install -d -o studybox -g studybox /srv/studybox-backups
sudo install -d -m 750 -o root -g studybox /etc/studybox-ai
sudo install -d -m 755 /var/www/certbot
sudo chmod 755 /srv/studybox-ai
```

PostgreSQL에는 `studybox` 전용 사용자와 데이터베이스를 생성합니다. 비밀번호와 도메인을 실제 값으로 바꿉니다.

```bash
sudo -u postgres createuser --pwprompt studybox
sudo -u postgres createdb --owner=studybox studybox
```

`.env.example`을 바탕으로 `/etc/studybox-ai/api.env`를 만들고, `DATABASE_URL`, `APP_ORIGIN`, `ADMIN_REGISTRATION_TOKEN`, AI 키를 설정합니다. 이 파일은 저장소에 넣지 않습니다.

```bash
sudo install -m 640 -o root -g studybox /dev/null /etc/studybox-ai/api.env
sudoedit /etc/studybox-ai/api.env
```

저장소의 systemd·Nginx 템플릿을 VPS의 `/tmp`로 먼저 전송합니다. 이후 systemd 유닛을 설치하고 API 서비스와 백업 타이머를 활성화합니다. 첫 릴리스 전에는 `current` 디렉터리가 없으므로 API 서비스 시작은 첫 배포 이후에 수행합니다.

```bash
scp infra/systemd/studybox-api.service infra/systemd/studybox-backup.service infra/systemd/studybox-backup.timer infra/nginx/studybox.conf.example deployer@studybox.example.com:/tmp/
sudo cp /tmp/studybox-api.service /tmp/studybox-backup.service /tmp/studybox-backup.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable studybox-api.service
sudo systemctl enable --now studybox-backup.timer
```

`/tmp/studybox.conf.example`을 `/etc/nginx/sites-available/studybox.conf`로 복사해 도메인을 바꾸고 심볼릭 링크를 만듭니다. HTTP 설정을 적용한 뒤 인증서를 발급하고 Nginx를 다시 불러옵니다.

```bash
sudo cp /tmp/studybox.conf.example /etc/nginx/sites-available/studybox.conf
sudoedit /etc/nginx/sites-available/studybox.conf
sudo ln -s /etc/nginx/sites-available/studybox.conf /etc/nginx/sites-enabled/studybox.conf
sudo nginx -t && sudo systemctl reload nginx
sudo certbot certonly --webroot -w /var/www/certbot -d studybox.example.com
sudo nginx -t && sudo systemctl reload nginx
```

GitHub Actions가 SSH로 릴리스를 전송할 사용자에게는 배포 스크립트 실행 권한만 부여합니다. `deployer`와 경로는 실제 배포 계정 및 경로에 맞춰 바꿉니다.

```bash
echo 'deployer ALL=(root) NOPASSWD: /bin/sh /srv/studybox-ai/releases/*/infra/deploy/release.sh /srv/studybox-ai/releases/*' | sudo tee /etc/sudoers.d/studybox-deploy
sudo chmod 440 /etc/sudoers.d/studybox-deploy
sudo visudo -cf /etc/sudoers.d/studybox-deploy
```

### GitHub Actions 배포

`CI`는 타입 검사·테스트·빌드·PostgreSQL 마이그레이션 검증을 수행합니다. `Deploy`는 성공한 커밋 SHA를 입력받아 해당 소스를 VPS의 `/srv/studybox-ai/releases/<SHA>`로 전송합니다. 서버가 의존성 설치, 빌드, 마이그레이션을 모두 성공하면 `current` 링크를 새 릴리스로 바꾸고 API를 재시작합니다.

GitHub `production` 환경에 다음 시크릿을 등록합니다.

- `DEPLOY_HOST`: VPS 호스트명 또는 IP
- `DEPLOY_USER`: SSH 배포 사용자
- `DEPLOY_PATH`: `/srv/studybox-ai`
- `DEPLOY_SSH_KEY`: 배포 사용자의 개인 SSH 키

GitHub Actions의 **Deploy** 워크플로에서 검증을 통과한 커밋 SHA를 `commit_sha`로 입력해 배포합니다. 이전 SHA를 입력하면 해당 릴리스를 새로 빌드해 롤백할 수 있습니다.

`/api/health`는 API 프로세스 상태를, `/api/ready`는 데이터베이스 연결 상태를 반환합니다.

현재 인증 모델 전환 마이그레이션(`002_switch_to_username_auth.sql`)은 기존 이메일 계정 데이터를 새 학생 프로필 모델로 옮기지 않고 초기화합니다. 기존 운영 데이터베이스에는 적용 전 백업과 별도 데이터 변환 마이그레이션이 필요합니다.

## Cloudflare Workers 운영 배포

Cloudflare 계정에 로그인한 뒤 D1 마이그레이션을 적용하고 Worker를 배포합니다.

```powershell
npm run db:cloudflare:migrate
npm run deploy:cloudflare
```

AI 키는 저장소나 `wrangler.jsonc`에 넣지 않고 Cloudflare Secret으로 등록합니다.

```powershell
npx wrangler secret put AI_API_KEY
```

### 운영 로그 조회

Worker는 HTTP 요청, API 오류, D1·AI 처리 실패, 브라우저 JavaScript 오류를 D1에 구조화해 1년간 보관합니다. 학습 질문과 AI 응답은 상세 로그에 포함되므로, 기본 조회에서는 숨기고 필요한 경우에만 `--include-content`를 사용합니다. 조회하는 컴퓨터는 해당 Cloudflare 계정에 로그인되어 있어야 합니다.

```powershell
npm run logs -- --since 24h --level error
npm run logs -- --event ai.reply_failed --since 7d
npm run logs -- --request-id <X-Request-Id 값>
npm run logs -- --since 1h --include-content
```

## 백업과 복구

설치한 `studybox-backup.timer`가 매일 03:15에 `DATABASE_URL`을 사용해 백업을 만듭니다. 타이머 상태와 실행 결과는 다음 명령으로 확인합니다.

```bash
systemctl list-timers studybox-backup.timer
journalctl -u studybox-backup.service
```

스크립트는 로컬 백업을 14일 보관합니다. 복구 전에는 현재 DB를 별도 백업한 뒤 실행합니다.

```bash
sudo -u studybox sh -c 'set -a; . /etc/studybox-ai/api.env; set +a; /bin/sh /srv/studybox-ai/current/infra/restore.sh /srv/studybox-backups/studybox-YYYYMMDDTHHMMSSZ.sql.gz'
```

## 실제 AI 제공자 연결

기본값은 `AI_PROVIDER=mock`입니다. 실제 OpenAI 호환 제공자를 연결할 때만 운영 환경 파일에 다음 값을 설정합니다.

```text
AI_PROVIDER=openai-compatible
AI_BASE_URL=https://provider.example.com/v1
AI_MODEL=provider-model-id
AI_FALLBACK_MODELS=first-fallback-model-id,second-fallback-model-id
AI_API_KEY=provider-secret
```

API 키는 `/etc/studybox-ai/api.env`에만 저장하고 브라우저 번들·저장소·GitHub Actions 로그에는 넣지 않습니다.

## 배포 전 확인

- HTTPS, `APP_ORIGIN`, `HOST=127.0.0.1`, 관리자 설정, DB 백업 경로를 확인한다.
- 아이디 가입·로그인·대화 생성·삭제·계정 탈퇴를 확인한다.
- 두 사용자 계정 사이에 대화 URL 접근이 차단되는지 확인한다.
- API 프로세스 중지 후 systemd 자동 재시작과 `/api/ready` 응답을 확인한다.
- 백업 파일을 별도 테스트 DB에 복원해 데이터 복구를 확인한다.
