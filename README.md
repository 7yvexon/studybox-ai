# StudyBox AI

StudyBox AI는 학습 목적에 맞춰 답변 방식을 바꾸는 초대 코드 기반 학습 서비스의 실사용 MVP 뼈대입니다. 현재 기본 AI 제공자는 `mock`이며, API 키 없이도 회원가입·대화 저장·사용량 제한·화면 흐름을 검증할 수 있습니다.

## 구성

```text
apps/
├─ api/                 Express API, 인증, PostgreSQL 저장소, AI 어댑터
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
- 한 번만 사용할 수 있는 초대 코드 베타 가입
- 사용자별 대화 생성·조회·제목 수정·삭제와 영구 저장
- 다섯 학습 모드, 세 학습 수준, 세 답변 길이 설정
- 계정당 기본 일 50회 AI 답변 제한과 단기 요청 제한
- Argon2id 비밀번호 해시, 만료 DB 세션, `HttpOnly`·`Secure`·`SameSite` 쿠키
- 모의 AI와 OpenAI 호환 AI 엔드포인트를 교체할 수 있는 `ChatProvider` 인터페이스
- 상태 점검, 구조화 로그, Docker Compose, Nginx, CI 및 수동 배포 워크플로

파일 업로드, 사진 분석, 소셜 로그인, 관리자 웹 UI는 첫 MVP 범위에 포함하지 않습니다.

## 빠른 시작

Node.js 20.18 이상, Docker Desktop 또는 Docker Engine이 필요합니다.

1. 환경 파일을 만들고 값을 바꿉니다.

   ```powershell
   Copy-Item .env.example .env
   ```

   로컬에서 API 키 없이 테스트하려면 `APP_ORIGIN=http://localhost:5173`, `AI_PROVIDER=mock`으로 두세요. `POSTGRES_PASSWORD`는 반드시 긴 영문·숫자 임의 문자열로 교체하세요.

2. 개발용 데이터베이스만 시작합니다.

   ```powershell
   docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d database
   ```

3. 의존성 설치, DB 마이그레이션, 초대 코드 발급을 실행합니다.

   ```powershell
   npm ci
   npm run db:migrate
   npm run invite:create -- school-beta-2026
   ```

4. 개발 서버를 시작하고 `http://localhost:5173`을 엽니다.

   ```powershell
   npm run dev
   ```

## 검사 명령

```powershell
npm run typecheck
npm test
npm run build
```

검사에는 공통 설정 검증과 모의 AI 응답 형식 검증이 포함됩니다. 실제 PostgreSQL·SMTP·브라우저 통합 흐름은 배포 후보 환경에서 수동으로도 확인해야 합니다.

## 운영 배포

1. Ubuntu VPS에 Docker Compose와 TLS 인증서가 준비된 상태에서 저장소를 배치합니다.
2. `.env.example`을 복사한 `.env`에 운영 도메인, 긴 DB 비밀번호, 관리자 아이디 목록을 입력합니다. `ADMIN_USER_IDS`에 쉼표로 구분한 아이디를 등록한 뒤 해당 아이디로 가입하면 관리자 역할이 부여됩니다. `.env`는 저장소에 커밋하지 않습니다.
3. 첫 HTTP 배포를 실행합니다.

   ```bash
   docker compose up -d --build
   ```

4. 도메인 인증서를 발급한 뒤 `infra/nginx/tls.conf.example`을 `infra/nginx/tls.conf`로 복사해 실제 도메인으로 바꿉니다. 다음 구성으로 HTTPS를 적용합니다.

   ```bash
   docker compose -f docker-compose.yml -f docker-compose.production.yml up -d --build
   ```

PostgreSQL은 Compose 내부 네트워크에만 있고 호스트 포트를 열지 않습니다. `/api/health`는 프로세스 상태, `/api/ready`는 DB 연결 상태를 반환합니다.

GitHub Actions의 `CI`는 타입 검사·테스트·빌드·두 Docker 이미지 빌드를 검증합니다. `Deploy` 워크플로는 수동 실행만 가능하며 `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_PATH`, `DEPLOY_SSH_KEY` 환경 시크릿이 준비된 GitHub `production` 환경에서 실행합니다.

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
AI_API_KEY=provider-secret
```

API 키는 `.env` 또는 배포 플랫폼의 시크릿에만 저장하고, 브라우저 환경변수·React 번들·저장소에는 넣지 않습니다. 제공자가 Chat Completions 호환이 아니면 `apps/api/src/ai`에 `ChatProvider` 구현을 추가합니다.

## 배포 전 확인

- HTTPS, `APP_ORIGIN`, 관리자 아이디 목록, 데이터베이스 백업 경로를 실제 값으로 설정한다.
- 초대 코드 생성·아이디 가입·로그인·대화·삭제·계정 탈퇴를 확인한다.
- 두 사용자 계정으로 서로의 대화 URL에 접근할 수 없는지 확인한다.
- 일 50회 한도와 모의 제공자 오류·실제 제공자 시간 초과를 확인한다.
- 모바일 폭, 키보드 전용 조작, 감소된 모션 설정, 브라우저 콘솔 오류를 확인한다.
