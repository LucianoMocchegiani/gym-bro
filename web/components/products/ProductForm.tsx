'use client';

import { useState, type FormEvent } from 'react';
import { ImageUpload } from '@/components/ImageUpload';
import { ApiClientError } from '@/lib/api/client';
import {
  createProduct,
  updateProduct,
  uploadProductImage,
  type ProductDetail,
} from '@/lib/api/products';

export function ProductForm({
  product,
  onSuccess,
  onCancel,
}: {
  product?: ProductDetail;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(product?.name ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [price, setPrice] = useState(product ? String(product.price) : '');
  const [imageUrl, setImageUrl] = useState<string | null>(
    product?.imageUrl ?? null,
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [active, setActive] = useState(product?.active ?? true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const finalImageUrl = imageFile
        ? await uploadProductImage(imageFile)
        : imageUrl;
      const input = {
        name: name.trim(),
        description: description.trim() || null,
        price: Number(price),
        imageUrl: finalImageUrl,
      };
      if (product) {
        await updateProduct(product.id, { ...input, active });
      } else {
        await createProduct(input);
      }
      onSuccess();
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudo guardar el producto.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="admin-form" onSubmit={(event) => void submit(event)}>
      <label>
        Nombre
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          minLength={2}
          maxLength={120}
        />
      </label>
      <label>
        Descripción
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          maxLength={1000}
        />
      </label>
      <ImageUpload
        value={imageUrl}
        onFileSelect={setImageFile}
        onClear={() => {
          setImageUrl(null);
          setImageFile(null);
        }}
        label="Imagen del producto"
      />
      <label>
        Precio (ARS)
        <input
          type="number"
          min={0}
          step={1}
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          required
        />
      </label>
      {product ? (
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={active}
            onChange={(event) => setActive(event.target.checked)}
          />
          Producto activo
        </label>
      ) : null}
      <p className="muted small">
        El stock inicial es 0. Cargá existencias desde el historial de stock.
      </p>
      {error ? <p className="error">{error}</p> : null}
      <div className="form-actions">
        <button type="button" className="btn ghost" onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className="primary" disabled={busy}>
          {busy ? 'Guardando…' : product ? 'Guardar cambios' : 'Crear producto'}
        </button>
      </div>
    </form>
  );
}
