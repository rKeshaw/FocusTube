# ============================================================
# FocusTube Backend — Dockerfile
# Bundles Node.js + yt-dlp + ffmpeg + Deno in one container.
# Multi-stage build keeps the final image lean.
# ============================================================

# ── Stage 1: Dependency installer ────────────────────────────
FROM node:20-slim AS deps

WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev


# ── Stage 2: Runtime image ────────────────────────────────────
FROM node:20-slim AS runtime

WORKDIR /app

# Install system dependencies
# python3 + pip are needed to install yt-dlp
# ffmpeg for audio/video processing
# curl for Deno install
# unzip is required by the Deno install script to extract the binary
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    curl \
    unzip \
    ca-certificates \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Install yt-dlp — pinned to a stable version for reproducibility
# Update this version periodically as yt-dlp releases fixes for YouTube changes
RUN pip3 install --break-system-packages yt-dlp

# Install Deno — required by yt-dlp to solve YouTube's JS bot challenges
RUN curl -fsSL https://deno.land/install.sh | sh
ENV DENO_PATH=/root/.deno/bin/deno
ENV PATH="${PATH}:/root/.deno/bin"

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source
COPY src ./src
COPY package.json ./

# Set binary paths explicitly (belt and suspenders)
ENV YTDLP_PATH=yt-dlp
ENV FFMPEG_PATH=ffmpeg

# Non-root user for security
RUN groupadd -r focustube && useradd -r -g focustube focustube
RUN chown -R focustube:focustube /app
# Give focustube user access to Deno binary
RUN chmod +x /root/.deno/bin/deno
USER focustube

EXPOSE 5000

CMD ["node", "src/server.js"]
