# ssi-quark (clon local — no versionado en GymBro)

Cloná acá los repos oficiales de Quark usados por el spike de acceso:

```bash
# desde la raíz del monorepo GymBro
mkdir -p ssi-quark
cd ssi-quark

git clone <url-oficial>/quarkid-identity-core.git
git clone <url-oficial>/quark-issuer-service.git
git clone <url-oficial>/quark-verifier-service.git
# opcionales: quark-wallet, quarkid-identity-core-dart
```

El `docker-compose.yml` construye issuer/verifier con:

- context: raíz del monorepo (`.`)
- Dockerfiles: `docker/quark-issuer.Dockerfile` / `docker/quark-verifier.Dockerfile`

**No** se incluye RabbitMQ ni VDR en Compose: la mensajería Quark es best-effort y no bloquea el alta de issuer/verifier.

Este directorio está en `.gitignore` salvo este `README.md`.
