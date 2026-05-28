# ── Stage 1: Build the Vite frontend ────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Stage 2: Production image ────────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# Copy package files and install production deps only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built frontend and server source
COPY --from=builder /app/dist ./dist
COPY server/ ./server/

# SQLite data directory — mount a volume here for persistence
# e.g. docker run -v /your/host/path:/app/server/data ...
RUN mkdir -p /app/server/data

EXPOSE 3001

ENV NODE_ENV=production
ENV PORT=3001
# Override DATA_DIR if you mount the volume elsewhere
ENV DATA_DIR=/app/server/data

CMD ["node", "server/index.js"]