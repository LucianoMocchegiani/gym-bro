# Cloudflare R2 — Costos

> Última actualización: Ago 2026  
> Fuente: https://developers.cloudflare.com/r2/pricing/

## Free tier (mensual)

| Concepto | Límite gratis |
|----------|---------------|
| Storage | 10 GB-mes |
| Escrituras (Class A) | 1 millón/mes |
| Lecturas (Class B) | 10 millones/mes |
| Egress (transferencia a internet) | **Siempre gratis** |
| Deletes | **Siempre gratis** |

## Después del free tier

| Concepto | Precio |
|----------|--------|
| Storage Standard | $0.015/GB-mes |
| Storage Infrequent Access | $0.01/GB-mes |
| Class A (escrituras: PutObject, CopyObject, ListObjects, etc.) | $4.50/millón |
| Class B (lecturas: GetObject, HeadObject, etc.) | $0.36/millón |
| Egress | **$0** |
| Data Retrieval (Infrequent Access) | $0.01/GB |

## Operaciones gratis

- `DeleteObject`
- `DeleteBucket`
- `AbortMultipartUpload`

## Ejemplo práctico — GymBro

**Suposiciones:**
- 100 gyms activos
- Cada gym: ~20 imágenes (servicios + packs) × 100KB = 2MB
- 500 afiliados con avatar = 500 × 50KB = 25MB
- Total almacenamiento: ~45MB (muy bajo)

| Concepto | Uso mensual | Free tier | Costo |
|----------|-------------|-----------|-------|
| Storage | 0.045 GB | 10 GB | $0 |
| Escrituras | ~2,500 (uploads iniciales) | 1M | $0 |
| Lecturas | ~50,000 (imágenes en forms/lists) | 10M | $0 |
| **Total** | | | **$0** |

**Conclusión:** Para el volumen de GymBro, el free tier es más que suficiente. No se esperan costos hasta que la plataforma crezca significativamente (>1000 gyms o >10GB de imágenes).

## Notas

- R2 redondea hacia arriba: 1.1 GB = 2 GB facturados
- El free tier solo aplica a Standard storage (no Infrequent Access)
- Las lecturas de imágenes en la web admin son Class B (barato)
- Las subidas de imágenes son Class A (más caro pero gratis hasta 1M/mes)
