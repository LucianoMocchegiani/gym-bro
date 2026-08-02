# Build Quark issuer para Compose GymBro.
# Context: raíz del monorepo (.).
FROM node:20-alpine AS builder
WORKDIR /build

COPY ssi-quark/quarkid-identity-core /build/packages/identity-core
WORKDIR /build/packages/identity-core
RUN npm install && npm run build

WORKDIR /build/quark-issuer-service/source
COPY ssi-quark/quark-issuer-service/source/package*.json ./
COPY ssi-quark/quark-issuer-service/source/tsconfig.json ./
COPY ssi-quark/quark-issuer-service/source/src ./src
# Credo son peerDeps de identity-core; hay que instalarlos en el servicio.
# skipLibCheck evita choque de @types/pg entre identity-core y el servicio.
RUN npm ci \
  && npm install --no-save \
    @credo-ts/core@0.7.0 \
    @credo-ts/didcomm@0.7.0 \
    @credo-ts/node@0.7.0 \
    @credo-ts/openid4vc@0.7.0 \
    @credo-ts/tenants@0.7.0 \
    express@^4.18.0 \
  && rm -rf /build/packages/identity-core/node_modules/@types/pg \
  && npm run build

FROM node:20-alpine AS runner
WORKDIR /build/quark-issuer-service/source
COPY --from=builder /build/packages/identity-core /build/packages/identity-core
COPY ssi-quark/quark-issuer-service/source/package*.json ./
RUN npm ci --omit=dev \
  && npm install --omit=dev --no-save \
    @credo-ts/core@0.7.0 \
    @credo-ts/didcomm@0.7.0 \
    @credo-ts/node@0.7.0 \
    @credo-ts/openid4vc@0.7.0 \
    @credo-ts/tenants@0.7.0 \
    express@^4.18.0
COPY --from=builder /build/quark-issuer-service/source/dist ./dist
EXPOSE 9001
CMD ["node", "dist/main.js"]
