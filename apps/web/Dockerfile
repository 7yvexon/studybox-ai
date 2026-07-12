FROM node:22-bookworm-slim AS build
WORKDIR /workspace
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci
COPY tsconfig.base.json ./
COPY apps/web apps/web
COPY packages/shared packages/shared
COPY css css
RUN npm run build --workspace=@studybox/shared && npm run build --workspace=@studybox/web

FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY infra/nginx/http.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/apps/web/dist /usr/share/nginx/html
EXPOSE 8080
