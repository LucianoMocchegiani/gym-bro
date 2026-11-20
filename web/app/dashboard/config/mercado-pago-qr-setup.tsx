'use client';

import { FormEvent, useEffect, useState } from 'react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ApiClientError } from '@/lib/api/client';
import {
  createMercadoPagoQrSetup,
  getMercadoPagoQrSetup,
  MercadoPagoQrSetupStatus,
} from '@/lib/api/mercadopago';

export function MercadoPagoQrSetup() {
  const [setup, setSetup] = useState<MercadoPagoQrSetupStatus | null>(null);
  const [streetName, setStreetName] = useState('');
  const [streetNumber, setStreetNumber] = useState('');
  const [cityName, setCityName] = useState('');
  const [stateName, setStateName] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void getMercadoPagoQrSetup()
      .then((result) => {
        if (!cancelled) setSetup(result);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof ApiClientError
              ? err.message
              : 'No se pudo cargar la configuración QR.',
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function submit(event: FormEvent) {
    event.preventDefault();
    setConfirm(true);
  }

  async function createSetup() {
    setBusy(true);
    setError(null);
    try {
      setSetup(
        await createMercadoPagoQrSetup({
          streetName: streetName.trim(),
          streetNumber: streetNumber.trim(),
          cityName: cityName.trim(),
          stateName: stateName.trim(),
          latitude: Number(latitude),
          longitude: Number(longitude),
        }),
      );
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudo crear la sucursal y caja QR.',
      );
    } finally {
      setBusy(false);
      setConfirm(false);
    }
  }

  return (
    <section aria-labelledby="mp-qr-title" style={{ marginTop: '1rem' }}>
      <h3 id="mp-qr-title">QR dinámico en Caja</h3>
      <p className="muted small">
        Crea una sucursal y una caja en la cuenta conectada de Mercado Pago.
        Usá la dirección real y coordenadas precisas: Mercado Pago las utiliza
        para cálculos impositivos. Esta configuración crea recursos en MP y no
        se puede editar desde Faciliter.
      </p>
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      {!setup ? (
        <p className="muted small">Cargando configuración QR…</p>
      ) : setup.configured ? (
        <p className="ok-msg">
          Sucursal y caja QR configuradas · sucursal {setup.storeId} · caja{' '}
          {setup.posId}
        </p>
      ) : (
        <>
          {setup.storeId ? (
            <p className="muted small">
              La sucursal {setup.storeId} ya existe en Mercado Pago. El reintento
              reutiliza esa sucursal y solo crea la caja.
            </p>
          ) : null}
          <form className="admin-form" onSubmit={submit} style={{ marginTop: '1rem' }}>
            <label>
              Nombre de la calle
              <input
                value={streetName}
                onChange={(e) => setStreetName(e.target.value)}
                maxLength={120}
                required
              />
            </label>
            <label>
              Altura
              <input
                value={streetNumber}
                onChange={(e) => setStreetNumber(e.target.value)}
                maxLength={20}
                required
              />
            </label>
            <label>
              Ciudad
              <input
                value={cityName}
                onChange={(e) => setCityName(e.target.value)}
                maxLength={100}
                required
              />
            </label>
            <label>
              Provincia
              <input
                value={stateName}
                onChange={(e) => setStateName(e.target.value)}
                maxLength={100}
                required
              />
            </label>
            <label>
              Latitud
              <input
                type="number"
                step="any"
                min="-90"
                max="90"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                required
              />
            </label>
            <label>
              Longitud
              <input
                type="number"
                step="any"
                min="-180"
                max="180"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                required
              />
            </label>
            <div className="form-actions">
              <button type="submit" className="primary" disabled={busy}>
                {busy ? 'Creando…' : 'Crear sucursal y caja QR'}
              </button>
            </div>
          </form>
        </>
      )}
      <ConfirmDialog
        open={confirm}
        title="Crear sucursal y caja QR"
        description="Se crearán una sucursal y una caja en la cuenta conectada de Mercado Pago. Verificá que la dirección y las coordenadas sean correctas antes de continuar."
        confirmLabel="Crear"
        busy={busy}
        onConfirm={() => void createSetup()}
        onCancel={() => setConfirm(false)}
      />
    </section>
  );
}
