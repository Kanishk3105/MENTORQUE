FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies first so this layer is cached unless package.json changes
# NOTE: `prisma` (the CLI, used below and at container start for db push) is
# a devDependency, so this intentionally does NOT use --omit=dev.
COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY src ./src

ENV NODE_ENV=production
EXPOSE 5001

# Run as a non-root user for defense in depth
RUN addgroup -S app && adduser -S app -G app && chown -R app:app /app
USER app

# Push the schema (idempotent) then seed (upsert-based, also idempotent)
# then start the server. Using `db push` rather than a separate migration
# step keeps the container self-contained for this assignment; swap to
# `prisma migrate deploy` for a tracked-migration production setup.
CMD sh -c "npx prisma db push --skip-generate && npm run db:seed && node src/index.js"
