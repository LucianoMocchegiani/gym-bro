# Carpeta de documentos — Costos y límites

> Última actualización: Sep 2026  
> Precios R2: [r2-cloudflare.md](./r2-cloudflare.md)  
> Producto: RN-FOL · `docs/05-casos-de-uso/carpeta.md`

Límites **por carpeta** (un socio **o** un staff; no se mezclan).

| Límite | Valor | Dónde pesa |
|--------|--------|------------|
| Ítems (nota + PDF + imagen, juntos) | **10** | Postgres (filas) + R2 (solo FILE) |
| Peso por archivo | **5 MB** | R2 |
| Título de nota | 200 caracteres | Postgres |
| Cuerpo de nota (Markdown) | **20.000** caracteres | Postgres |

Al llegar a 10 hay que **borrar** para cargar otro. Ver se puede; no hay alta nueva.

Las fotos de ficha (`POST /upload`, 5 MB) **no** entran en estos 10 ítems. Keys públicas: `tenants/{tenantId}/members|staff|services|packs/…`.

## Qué cuesta de verdad

- **Notas:** texto en Postgres. Aun 20.000 caracteres × 10 notas es irrelevante frente a R2.
- **Files:** objeto en R2. Storage ~**USD 0,015 / GB-mes** (Standard, fuera del free tier de 10 GB).
- **Egress R2:** USD 0 (ver tabla de R2).
- **Descarga en la app/Admin:** el file sale por la **API** (JWT). El ancho de banda que puede doler es el del **VPS**, no la factura de Cloudflare.

## Escenario — gym de 200 socios

Supuestos (holgados, no realistas para todos):

- 6 files **al máximo** (5 MB cada uno)
- 2 notas (aunque el cuerpo esté en 20.000 caracteres)
- Solo socios; cada staff tendría **otra** carpeta de hasta 10 ítems

### Por socio

| Qué | Peso |
|-----|------|
| 6 × 5 MB | **30 MB** en R2 |
| 2 notas | ~40–80 KB en Postgres |
| **Total** | **~30 MB** |

### El gym (200 socios)

| Qué | Total |
|-----|--------|
| R2 | 200 × 30 MB = **~6 GB** |
| Notas en DB | **~10 MB** en el peor caso |

### Costo R2 (storage, orden de magnitud)

| | Cifra |
|--|--------|
| 6 GB × USD 0,015 / GB-mes | **~USD 0,09 / mes** el gym |
| Por socio (30 MB) | **~USD 0,0004 / mes** |

Lecturas Class B (GetObject): ~USD 0,36 / millón de ops. Miles de descargas siguen en centavos.

Con el **free tier** de 10 GB-mes de storage, **6 GB entra en $0** de almacenamiento (hasta que el resto del bucket —fotos de ficha, catálogo— sume más de 10 GB en toda la plataforma).

### Si el promedio de file no es 5 MB

Rutinas y estudios suelen pesar menos. Si cada file ronda **1 MB**:

- Por socio (6 files): **~6 MB**
- 200 socios: **~1,2 GB** R2

## Techo teórico (todos al máximo)

10 files × 5 MB = **50 MB / persona**. 200 socios = **10 GB** solo carpeta de afiliados (el borde del free tier de storage, sin contar fotos públicas ni staff).

## Conclusión

Con 10 ítems y 5 MB, el riesgo de plata en R2 es bajo. El escenario “6 files al tope + 2 notas × 200 socios” es **~6 GB** y **fracciones de dólar al mes** de storage; lo que hay que vigilar a escala es **tráfico del VPS** al abrir PDFs/imágenes.
