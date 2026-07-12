FROM node:22-bookworm-slim AS build
WORKDIR /workspace
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci
COPY tsconfig.base.json ./
COPY apps/api apps/api
COPY packages/shared packages/shared
RUN npm run build --workspace=@studybox/shared && npm run build --workspace=@studybox/api

FROM node:22-bookworm-slim AS production
WORKDIR /workspace
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci --omit=dev --workspace=@studybox/api --include-workspace-root
COPY --from=build /workspace/apps/api/dist apps/api/dist
COPY --from=build /workspace/apps/api/src/db/migrations apps/api/dist/db/migrations
COPY --from=build /workspace/packages/shared/dist packages/shared/dist
WORKDIR /workspace/apps/api
RUN chown -R node:node /workspace
USER node
EXPOSE 3001
CMD ["sh", "-c", "node dist/cli/migrate.js && node dist/server.js"]
