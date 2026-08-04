# n8n 2.11.0 custom image with two patches baked in:
#
# PATCH 1: GRANT_TOKEN_TTL 15s -> 86400s (24h)
#   File: dist/task-runners/task-broker/auth/task-broker-auth.service.js
#   Bug:  TTL de grant token 15s insuficiente — el runner expira antes de arrancar
#
# PATCH 2: OFFER_VALID_TIME_MS 5000ms -> 60000ms (60s)
#   File: node_modules/.pnpm/@n8n+task-runner@.../node_modules/@n8n/task-runner/dist/task-runner.js
#   Bug:  Bajo carga, el runner no acepta offers en 5s → "Offer expired" → retries
#
# Ambos archivos se extraen del base image al host (via docker cp) y se incluyen
# en el build context. Esta imagen es autocontenida — no depende de volúmenes
# montados en runtime.
#
# El path pnpm del task-runner es estable para una versión dada de n8n. Si
# actualizás n8n, hay que re-extraer task-runner.js del nuevo base image.

# --- stage-0: solo para extraer archivos del base image ---
FROM n8nio/n8n:2.11.0 AS base

# --- stage-1: parchar con imagen alpine que tiene sed y busybox ---
FROM alpine:3.19 AS patcher
WORKDIR /tmp/n8n

# === PATCH 1: GRANT_TOKEN_TTL ===
COPY task-broker-auth.service.js ./task-broker-auth.service.js
RUN sed -i 's/15 \* constants_1\.Time\.seconds\.toMilliseconds/86400 * constants_1.Time.seconds.toMilliseconds/' task-broker-auth.service.js
RUN grep '86400.*constants_1' task-broker-auth.service.js \
    && echo "[fabrica] PATCH 1 GRANT_TOKEN_TTL applied successfully" \
    || { echo "[fabrica] ERROR: PATCH 1 verification failed"; cat task-broker-auth.service.js | grep -E 'GRANT|constants_1'; exit 1; }
RUN printf '\n// patched-by-fabrica: GRANT_TOKEN_TTL\n' >> task-broker-auth.service.js

# === PATCH 2: OFFER_VALID_TIME_MS ===
COPY task-runner.js ./task-runner.js
RUN sed -i 's/^const OFFER_VALID_TIME_MS = 5000;$/const OFFER_VALID_TIME_MS = 60000;/' task-runner.js
RUN grep 'OFFER_VALID_TIME_MS = 60000' task-runner.js \
    && echo "[fabrica] PATCH 2 OFFER_VALID_TIME_MS applied successfully" \
    || { echo "[fabrica] ERROR: PATCH 2 verification failed"; cat task-runner.js | grep -E 'OFFER_VALID'; exit 1; }
RUN printf '\n// patched-by-fabrica: OFFER_VALID_TIME_MS\n' >> task-runner.js

# --- stage-2: imagen final ---
FROM n8nio/n8n:2.11.0

# PATCH 1 — task-broker-auth.service.js (broker side)
ARG BROKER_FILE="dist/task-runners/task-broker/auth/task-broker-auth.service.js"
ARG BROKER_PATH="/usr/local/lib/node_modules/n8n/${BROKER_FILE}"
COPY --from=patcher /tmp/n8n/task-broker-auth.service.js "${BROKER_PATH}"

# PATCH 2 — task-runner.js (runner side, lives inside pnpm store).
# Path pnpm estable para n8n 2.11.0. Si se actualiza n8n, re-extraer con:
#   docker run --rm n8nio/n8n:NEW_VERSION sh -c \
#     'find /usr/local/lib/node_modules/n8n/node_modules/.pnpm -name task-runner.js'
ARG RUNNER_FILE="node_modules/.pnpm/@n8n+task-runner@file+packages+@n8n+task-runner_@opentelemetry+api@1.9.0_@opentelemetry+abc4e288c7f66f0b9b114d073d3c169d/node_modules/@n8n/task-runner/dist/task-runner.js"
ARG RUNNER_PATH="/usr/local/lib/node_modules/n8n/${RUNNER_FILE}"
COPY --from=patcher /tmp/n8n/task-runner.js "${RUNNER_PATH}"


