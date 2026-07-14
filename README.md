# StudyBox AI

StudyBox AI는 질문의 맥락, 학생의 답변 수준, 학습 목적에 맞춰 설명 방식을 바꾸는 학습 서비스 MVP입니다. 공개 소개 화면부터 가입·로그인, 대화 기록이 남는 학습 작업 공간까지 하나의 저장소에서 실행할 수 있습니다. 기본 AI 제공자는 `mock`이므로 API 키나 로컬 데이터베이스 없이도 전체 사용자 흐름을 검증할 수 있습니다.

## 구성

```text
apps/
├─ api/                 Express API, 인증, 메모리/PostgreSQL 저장소, AI 어댑터
└─ web/                 React + Vite 사용자 화면
packages/
└─ shared/              공통 학습 설정·대화 타입
infra/
├─ nginx/               HTTP 및 TLS Nginx 설정
├─ backup.sh            PostgreSQL 백업
└─ restore.sh           PostgreSQL 복구
docker-compose.yml      API, 웹, PostgreSQL 운영 구성
```

## 제공 기능

- 아이디·비밀번호 가입과 로그인, 본명·학교명·학년·반·번호 프로필 수집, 로그아웃, 계정 삭제
- 초대 코드 없는 베타 가입
- 사용자별 대화 생성·조회·제목 수정·삭제와 선택 가능한 메모리/영구 저장
- 다섯 학습 모드, 여섯 학년별 답변 수준, 세 답변 길이 설정
- 계정당 기본 일 50회 AI 답변 제한과 단기 요청 제한
- Argon2id 비밀번호 해시, 만료 DB 세션, `HttpOnly`·`Secure`·`SameSite` 쿠키
- 모의 AI와 OpenAI 호환 AI 엔드포인트를 교체할 수 있는 `ChatProvider` 인터페이스
- 상태 점검, 구조화 로그, Docker Compose, Nginx, CI 및 수동 배포 워크플로

파일 업로드, 사진 분석, 소셜 로그인, 관리자 웹 UI는 첫 MVP 범위에 포함하지 않습니다.

## 화면과 사용자 흐름

1. 공개 홈에서 StudyBox AI의 학습 방식과 실제 답변 화면을 확인합니다.
2. 답변 모드, 중학교 1학년부터 고등학교 3학년까지의 답변 수준, 답변 길이를 선택합니다.
3. 가입 또는 로그인 후 별도의 학습 작업 공간에서 질문을 시작합니다.
4. 대화 기록과 설정을 유지한 채 같은 주제를 이어서 공부합니다.

공개 화면은 화이트·블랙·블루 색상과 실제 제품 UI 미리보기를 중심으로 구성했습니다. 과한 3D 효과 없이 가벼운 스크롤 진입 모션만 사용하며, `prefers-reduced-motion` 환경에서는 콘텐츠가 즉시 표시됩니다. 320px 모바일부터 넓은 데스크톱까지 주요 프레임과 입력창이 잘리지 않도록 반응형 비율을 분리했습니다.

## 빠른 시작

빠른 로컬 체험에는 Node.js 20.18 이상만 필요합니다. 이 모드의 계정과 대화는 API 서버를 재시작하면 초기화됩니다.

1. 의존성을 설치합니다.

   ```powershell
   npm ci
   ```

2. 개발 서버를 시작하고 `http://localhost:5173`을 엽니다. 개발 환경의 기본 `STORAGE_MODE`는 `memory`입니다.

   ```powershell
   npm run dev
   ```

   기본 포트는 웹 `5173`, API `3001`입니다. 포트가 이미 사용 중이면 실행 스크립트가 사용 가능한 포트를 안내합니다.

PostgreSQL로 영구 저장하려면 `.env.example`을 `.env`로 복사하고 `STORAGE_MODE=postgres`를 설정한 뒤 Docker 데이터베이스와 마이그레이션을 실행하세요.

## 검사 명령

```powershell
npm run typecheck
npm test
npm run build
```

검사에는 공통 설정 검증과 모의 AI 응답 형식 검증이 포함됩니다. 실제 PostgreSQL·SMTP·브라우저 통합 흐름은 배포 후보 환경에서 수동으로도 확인해야 합니다.

## 운영 배포

이 프로젝트는 GitHub Container Registry(ghcr.io)를 통해 미리 빌드된 Docker 이미지를 배포합니다. CI가 `main` 브랜치에 push할 때마다 `ghcr.io/7yvexon/studybox-ai/api`와 `ghcr.io/7yvexon/studybox-ai/web` 이미지를 `:main`, `:<commit-sha>`, `:latest` 태그로 게시합니다.

### 서버 준비

1. Ubuntu VPS에 Docker Compose와 TLS 인증서를 준비합니다. Git이나 Node.js는 불필요합니다.
2. 서버에 Compose 파일과 `.env`를 배치합니다.
   - `docker-compose.yml`, `docker-compose.production.yml`, `infra/nginx/tls.conf`(도메인에 맞게 수정), `.env`
   - `.env.example`을 복사한 `.env`에 운영 도메인, 긴 DB 비밀번호, 관리자 아이디 목록을 입력합니다. `ADMIN_USER_IDS`에 쉼표로 구분한 아이디를 등록하고, `ADMIN_REGISTRATION_TOKEN`에 관리자 등록용 긴 무작위 토큰을 설정합니다. 해당 아이디로 가입할 때 이 토큰을 함께 제출해야만 관리자 역할이 부여됩니다. `.env`는 저장소에 커밋하지 않습니다.
3. GHCR 이미지가 private인 경우 서버에서 GitHub 인증이 필요합니다. `read:packages` 권한이 있는 Personal Access Token으로 로그인합니다.

   ```bash
   echo "$GITHUB_TOKEN" | docker login ghcr.io -u 7yvexon --password-stdin
   ```

### 첫 배포 (HTTP)

```bash
IMAGE_TAG=latest docker compose up -d
```

### HTTPS 적용

도메인 인증서를 발급한 뒤 `infra/nginx/tls.conf.example`을 `infra/nginx/tls.conf`로 복사해 실제 도메인으로 바꿉니다.

```bash
IMAGE_TAG=latest docker compose -f docker-compose.yml -f docker-compose.production.yml up -d
```

### 배포 (GitHub Actions Deploy 워크플로)

CI가 `push-images` 잡을 통과한 커밋의 SHA를 `image_tag` 입력으로 지정해 수동 실행합니다. 서버에서 이미지를 pull하고 교체합니다.

이전 커밋의 SHA를 입력하면 즉시 롤백됩니다.

PostgreSQL은 Compose 내부 네트워크에만 있고 호스트 포트를 열지 않습니다. `/api/health`는 프로세스 상태, `/api/ready`는 DB 연결 상태를 반환합니다.

현재 인증 모델 전환 마이그레이션(`002_switch_to_username_auth.sql`)은 기존 이메일 계정 데이터를 새 학생 프로필 모델로 옮기지 않고 초기화합니다. 이미 사용자 데이터가 있는 운영 DB에는 그대로 적용하지 말고, 먼저 백업한 뒤 별도의 데이터 변환 마이그레이션을 준비하세요. 데이터가 없는 신규 배포에서는 Compose 시작 시 마이그레이션이 자동으로 실행됩니다.

GitHub Actions의 `CI`는 타입 검사·테스트·빌드·마이그레이션 검증·Docker 이미지 빌드 및 ghcr.io 게시를 수행합니다. `Deploy` 워크플로는 수동 실행만 가능하며 `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_PATH`, `DEPLOY_SSH_KEY` 환경 시크릿이 준비된 GitHub `production` 환경에서 실행합니다.

## 백업과 복구

VPS의 프로젝트 루트에서 매일 다음 명령을 실행하도록 스케줄링합니다.

```bash
BACKUP_DIR=/srv/studybox-backups sh infra/backup.sh
```

스크립트는 14일이 지난 로컬 백업을 삭제합니다. 원격 또는 암호화된 백업 저장소로 별도 복제해야 합니다. 복구 전에는 운영 DB를 별도 보존하고 다음 명령을 사용합니다.

```bash
sh infra/restore.sh /srv/studybox-backups/studybox-YYYYMMDDTHHMMSSZ.sql.gz
```

## 실제 AI 제공자 연결

기본값은 `AI_PROVIDER=mock`입니다. 실제 OpenAI 호환 제공자를 연결할 때만 다음 값을 운영 환경변수에 설정합니다.

```text
AI_PROVIDER=openai-compatible
AI_BASE_URL=https://provider.example.com/v1
AI_MODEL=provider-model-id
AI_FALLBACK_MODELS=first-fallback-model-id,second-fallback-model-id
AI_API_KEY=provider-secret
```

API 키는 `.env` 또는 배포 플랫폼의 시크릿에만 저장하고, 브라우저 환경변수·React 번들·저장소에는 넣지 않습니다. 제공자가 Chat Completions 호환이 아니면 `apps/api/src/ai`에 `ChatProvider` 구현을 추가합니다.

### OpenRouter 무료 우선 설정

OpenRouter는 OpenAI 호환 Chat Completions API를 제공하므로 별도 어댑터 없이 연결할 수 있습니다. `AI_MODEL`을 첫 번째 모델로 사용하고, `AI_FALLBACK_MODELS`의 모델을 왼쪽부터 순서대로 자동 폴백합니다.

```text
AI_PROVIDER=openai-compatible
AI_BASE_URL=https://openrouter.ai/api/v1
AI_MODEL=qwen/qwen3-next-80b-a3b-instruct:free
AI_FALLBACK_MODELS=google/gemma-4-31b-it:free,openai/gpt-oss-20b:free,qwen/qwen3.5-flash-02-23,deepseek/deepseek-v3.2
AI_API_KEY=OpenRouter에서 새로 발급한 키
```

무료 모델은 먼저 사용하고, 제공자 장애·일시적 거절·한도 초과 시에만 뒤의 모델로 전환됩니다. OpenRouter 요청당 폴백 모델은 최대 3개까지 허용하므로, 추가 모델은 앞선 모델이 모두 실패했을 때 서버가 다음 요청으로 시도합니다. OpenRouter 계정에 누적 $10 이상 결제한 경우 `:free` 모델은 계정 전체 기준으로 하루 최대 1,000회까지 사용할 수 있습니다. 유료 모델 비용을 제한하려면 OpenRouter에서 해당 키의 월 지출 한도를 $5로 설정하세요.

## 배포 전 확인

- HTTPS, `APP_ORIGIN`, 관리자 아이디 목록, 데이터베이스 백업 경로를 실제 값으로 설정한다.
- 아이디 가입·로그인·대화·삭제·계정 탈퇴를 확인한다.
- 두 사용자 계정으로 서로의 대화 URL에 접근할 수 없는지 확인한다.
- 일 50회 한도와 모의 제공자 오류·실제 제공자 시간 초과를 확인한다.
- 모바일 폭, 키보드 전용 조작, 감소된 모션 설정, 브라우저 콘솔 오류를 확인한다.
