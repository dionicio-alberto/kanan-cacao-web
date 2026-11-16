'use client';

import React, { useState } from 'react';
import { processScaleReceptionByRole } from '@/services/blindScaleAndTracesService';
import {
  getProducerFriendlyParcelStatus,
  HarvestAcopioEntry,
} from '@/services/producerLogbookService';
import { ParcelAdminOverview } from '@/services/sustainabilityAdminService';
import { NATURISTA_WEB_THEME as T } from '@/theme/naturistaWebTheme';
import { WEB_DOMAIN_CONSTANTS, WebUserRole } from '@/types/adminDomain';

interface HarvestAndAcopioModuleProps {
  activeRole: WebUserRole;
  parcels: ParcelAdminOverview[];
  selectedParcel: ParcelAdminOverview;
  onSelectParcel: (parcelId: string) => void;
  harvestEntries: HarvestAcopioEntry[];
  onAddHarvestEntry: (entry: HarvestAcopioEntry) => void;
}

export default function HarvestAndAcopioModule({
  activeRole,
  parcels,
  selectedParcel,
  onSelectParcel,
  harvestEntries,
  onAddHarvestEntry,
}: HarvestAndAcopioModuleProps) {
  // Estado para registro de corte y beneficio en parcela
  const [harvestDate, setHarvestDate] = useState('2026-11-15');
  const [podCount, setPodCount] = useState('1400');
  const [wetWeightKg, setWetWeightKg] = useState('520');
  const [fermentationMethod, setFermentationMethod] = useState<'CAJONES_MADERA' | 'COSTALES'>(
    'CAJONES_MADERA',
  );
  const [fermentationDays, setFermentationDays] = useState('6');
  const [dryingDays, setDryingDays] = useState('5');
  const [harvestSavedMsg, setHarvestSavedMsg] = useState<string | null>(null);

  // Estado para mesa de acopio (báscula)
  const [previousKg, setPreviousKg] = useState(300);
  const [deliveryKg, setDeliveryKg] = useState(220);
  const [humidityPct, setHumidityPct] = useState('7.2');
  const [qualityGrade, setQualityGrade] = useState('Cacao Criollo Fino Seleccionado');
  const [scaleError, setScaleError] = useState<string | null>(null);
  const [scaleResult, setScaleResult] = useState<Record<string, unknown> | null>(null);
  const [showReceiptDetail, setShowReceiptDetail] = useState(false);

  const isBlindOperator = activeRole === 'acopiador';
  const friendlyStatus = getProducerFriendlyParcelStatus(selectedParcel);
  const projectedTotalKg = previousKg + deliveryKg;
  const projectedKgPerHa = Number((projectedTotalKg / selectedParcel.areaHectares).toFixed(1));
  const exceedsExpectedRange = projectedKgPerHa > WEB_DOMAIN_CONSTANTS.TABASCO_YIELD_CAP_MAX_KG_HA;

  const handleSaveHarvest = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setHarvestSavedMsg(null);
    const pods = Math.max(1, Number(podCount) || 1);
    const wetKg = Math.max(1, Number(wetWeightKg) || 1);
    const fermDays = Math.max(0, Number(fermentationDays) || 0);
    const dryDays = Math.max(0, Number(dryingDays) || 0);

    onAddHarvestEntry({
      id: `COS-${Date.now()}`,
      parcelId: selectedParcel.parcelId,
      parcelName: selectedParcel.parcelName || selectedParcel.producerName,
      harvestDate,
      podCount: pods,
      wetWeightKg: wetKg,
      fermentationMethod,
      fermentationDays: fermDays,
      dryingDays: dryDays,
    });
    setHarvestSavedMsg(
      `Corte de ${pods} mazorcas (${wetKg} kg en baba) registrado para ${selectedParcel.parcelName || selectedParcel.producerName}.`,
    );
  };

  const handleRegisterAcopio = () => {
    setScaleError(null);
    setScaleResult(null);
    if (!friendlyStatus.papersAreClear) {
      setScaleError(
        'Entrega detenida por revisión: falta confirmar la constancia ambiental del terreno en la pestaña Parcelas y Georreferencia antes de registrar en báscula.',
      );
      return;
    }
    try {
      const receipt = processScaleReceptionByRole(
        {
          parcelId: selectedParcel.parcelId,
          producerId: selectedParcel.producerId,
          areaHectares: selectedParcel.areaHectares,
          previousCumulativeDryKg: previousKg,
          deliveredDryEquivalentKg: deliveryKg,
          readPointId: 'centro-acopio-chontalpa-01',
          isBlockedByCustf: false,
        },
        activeRole,
      );
      setScaleResult({
        ...receipt,
        qualityGrade,
        humidityPct,
      });

      const epcisObj = receipt.epcisEvent;
      onAddHarvestEntry({
        id: `ACO-${Date.now()}`,
        parcelId: selectedParcel.parcelId,
        parcelName: selectedParcel.parcelName || selectedParcel.producerName,
        harvestDate: new Date().toISOString().slice(0, 10),
        podCount: Math.round(deliveryKg * 5),
        wetWeightKg: Math.round(deliveryKg * 2.4),
        fermentationMethod: 'CAJONES_MADERA',
        fermentationDays: 6,
        dryingDays: 5,
        dryDeliveredKg: deliveryKg,
        deliveryFolio: `ACO-${epcisObj.payloadSha256.slice(0, 8).toUpperCase()}`,
      });
    } catch (err) {
      setScaleError(
        err instanceof Error
          ? err.message
          : 'No se pudo completar el registro en la mesa de acopio.',
      );
    }
  };

  return (
    <div style={{ display: 'grid', gap: 22 }}>
      <section
        aria-labelledby="harvest-section-title"
        style={{
          backgroundColor: T.colors.surfaceCard,
          border: `1.5px solid ${T.colors.borderSubtle}`,
          borderRadius: 14,
          padding: '22px 22px',
          display: 'grid',
          gap: 14,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 10,
          }}
        >
          <div>
            <h1
              id="harvest-section-title"
              style={{
                margin: 0,
                fontFamily: 'var(--font-serif)',
                fontSize: '1.5rem',
                color: T.colors.primaryGreen,
              }}
            >
              1. Cosecha, Fermentación y Secado en Finca
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: T.colors.textSecondary }}>
              Anota cuántas mazorcas se cortaron, los kilos en baba y los días de beneficio antes de
              llevar el cacao al centro de acopio.
            </p>
          </div>
        </div>

        {harvestSavedMsg ? (
          <div
            role="status"
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              backgroundColor: T.colors.statusGreenBg,
              color: T.colors.statusGreen,
              border: '1px solid #15803D',
              fontWeight: 700,
              fontSize: '0.86rem',
            }}
          >
            {harvestSavedMsg}
          </div>
        ) : null}

        <form onSubmit={handleSaveHarvest} style={{ display: 'grid', gap: 12 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
              gap: 12,
            }}
          >
            <div>
              <label
                htmlFor="harvest-parcel-select"
                style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700 }}
              >
                Parcela cosechada
              </label>
              <select
                id="harvest-parcel-select"
                value={selectedParcel.parcelId}
                onChange={(e) => onSelectParcel(e.target.value)}
                className="field-input"
              >
                {parcels.map((p) => (
                  <option key={p.parcelId} value={p.parcelId}>
                    {p.parcelName || p.producerName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="harvest-date-input"
                style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700 }}
              >
                Fecha del corte
              </label>
              <input
                id="harvest-date-input"
                type="date"
                required
                value={harvestDate}
                onChange={(e) => setHarvestDate(e.target.value)}
                className="field-input"
              />
            </div>

            <div>
              <label
                htmlFor="harvest-pods-input"
                style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700 }}
              >
                Mazorcas cortadas
              </label>
              <input
                id="harvest-pods-input"
                type="number"
                min="1"
                required
                value={podCount}
                onChange={(e) => setPodCount(e.target.value)}
                className="field-input"
              />
            </div>

            <div>
              <label
                htmlFor="harvest-wet-kg"
                style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700 }}
              >
                Peso en baba (kg frescos)
              </label>
              <input
                id="harvest-wet-kg"
                type="number"
                min="1"
                step="0.5"
                required
                value={wetWeightKg}
                onChange={(e) => setWetWeightKg(e.target.value)}
                className="field-input"
              />
            </div>

            <div>
              <label
                htmlFor="harvest-fermentation-method"
                style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700 }}
              >
                Método de fermentación
              </label>
              <select
                id="harvest-fermentation-method"
                value={fermentationMethod}
                onChange={(e) =>
                  setFermentationMethod(e.target.value as 'CAJONES_MADERA' | 'COSTALES')
                }
                className="field-input"
              >
                <option value="CAJONES_MADERA">Cajones de madera</option>
                <option value="COSTALES">Costales / sacos</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="harvest-ferm-days"
                style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700 }}
              >
                Días de fermentación / secado
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  id="harvest-ferm-days"
                  type="number"
                  min="0"
                  aria-label="Días de fermentación"
                  value={fermentationDays}
                  onChange={(e) => setFermentationDays(e.target.value)}
                  className="field-input"
                />
                <input
                  type="number"
                  min="0"
                  aria-label="Días de secado al sol"
                  value={dryingDays}
                  onChange={(e) => setDryingDays(e.target.value)}
                  className="field-input"
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn-cacao">
              Guardar corte de cosecha
            </button>
          </div>
        </form>
      </section>

      <section
        aria-labelledby="acopio-mesa-title"
        style={{
          backgroundColor: T.colors.surfaceCard,
          border: `2px solid ${T.colors.primaryGreen}`,
          borderRadius: 14,
          padding: '22px 22px',
          display: 'grid',
          gap: 16,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 10,
          }}
        >
          <div>
            <h2
              id="acopio-mesa-title"
              style={{
                margin: 0,
                fontFamily: 'var(--font-serif)',
                fontSize: '1.45rem',
                color: T.colors.primaryGreen,
              }}
            >
              2. Mesa de Acopio y Báscula de Recepción
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: T.colors.textSecondary }}>
              Registra la entrega de cacao seco con su grado de humedad, calidad y comprobante
              digital vinculado a tu parcela.
            </p>
          </div>

          <span
            style={{
              fontSize: '0.76rem',
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: 6,
              backgroundColor: isBlindOperator ? T.colors.softCacaoBg : T.colors.softGreenBg,
              color: isBlindOperator ? T.colors.earthCacao : T.colors.primaryGreen,
              border: `1px solid ${isBlindOperator ? T.colors.earthCacao : T.colors.primaryGreen}`,
            }}
          >
            {isBlindOperator ? 'Modo báscula de recepción' : 'Vista completa de entrega'}
          </span>
        </div>

        <div
          style={{
            backgroundColor: T.colors.surfaceElevated,
            border: `1px solid ${T.colors.borderSubtle}`,
            borderRadius: 10,
            padding: '12px 14px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <div>
            <div style={{ fontSize: '0.78rem', color: T.colors.textSecondary }}>
              Parcela que entrega hoy en mesa de acopio:
            </div>
            <strong style={{ fontSize: '1.02rem' }}>
              {selectedParcel.parcelName || selectedParcel.producerName} (
              {selectedParcel.municipality})
            </strong>
          </div>
          <span
            style={{
              backgroundColor: T.colors.softGreenBg,
              color: T.colors.primaryGreen,
              padding: '4px 10px',
              borderRadius: 6,
              fontWeight: 700,
              fontSize: '0.84rem',
            }}
          >
            Superficie: {selectedParcel.areaHectares} hectáreas
          </span>
        </div>

        {isBlindOperator ? (
          <div
            style={{
              backgroundColor: T.colors.softCacaoBg,
              border: `1.5px solid ${T.colors.earthCacao}`,
              borderRadius: 10,
              padding: '12px 14px',
              fontSize: '0.86rem',
            }}
          >
            <strong>Báscula transparente activa:</strong> El operador registra los kilos exactos
            recibidos hoy sin ver el límite acumulado previo de la temporada para cuidar la limpieza
            del acopio.
          </div>
        ) : (
          <div
            style={{
              backgroundColor: exceedsExpectedRange
                ? T.colors.statusRedBg
                : T.colors.surfaceElevated,
              border: `1px solid ${exceedsExpectedRange ? '#B91C1C' : T.colors.borderSubtle}`,
              borderRadius: 10,
              padding: '12px 14px',
              fontSize: '0.86rem',
            }}
          >
            <strong>Cosecha esperada en Tabasco (450 a 650 kg por hectárea):</strong> Con esta
            entrega sumas <strong>{projectedKgPerHa} kg/ha</strong> (
            {exceedsExpectedRange
              ? 'Supera lo esperado para el tamaño de la parcela; revisar origen'
              : 'Dentro de lo normal para la parcela'}
            ).
          </div>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: 12,
          }}
        >
          <div>
            <label
              htmlFor="acopio-prev-kg"
              style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700 }}
            >
              Kilos entregados anteriormente este año (kg)
            </label>
            <input
              id="acopio-prev-kg"
              type="number"
              min={0}
              value={previousKg}
              onChange={(e) => setPreviousKg(Number(e.target.value))}
              className="field-input"
            />
          </div>

          <div>
            <label
              htmlFor="acopio-delivery-kg"
              style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700 }}
            >
              Entrega actual en báscula (kg secos)
            </label>
            <input
              id="acopio-delivery-kg"
              type="number"
              min={1}
              value={deliveryKg}
              onChange={(e) => setDeliveryKg(Number(e.target.value))}
              className="field-input"
            />
          </div>

          <div>
            <label
              htmlFor="acopio-humidity"
              style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700 }}
            >
              Humedad del grano (%)
            </label>
            <input
              id="acopio-humidity"
              type="number"
              step="0.1"
              min="4"
              max="20"
              value={humidityPct}
              onChange={(e) => setHumidityPct(e.target.value)}
              className="field-input"
            />
          </div>

          <div>
            <label
              htmlFor="acopio-quality"
              style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700 }}
            >
              Calidad / clasificación en mesa
            </label>
            <select
              id="acopio-quality"
              value={qualityGrade}
              onChange={(e) => setQualityGrade(e.target.value)}
              className="field-input"
            >
              <option value="Cacao Criollo Fino Seleccionado">
                Cacao Criollo Fino Seleccionado
              </option>
              <option value="Cacao Fermentado Primera">Cacao Fermentado Primera</option>
              <option value="Cacao Seco Estándar">Cacao Seco Estándar</option>
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRegisterAcopio}
          className="btn-primary"
          style={{ width: '100%' }}
        >
          Registrar entrega en mesa de acopio y generar comprobante
        </button>

        {scaleError ? (
          <div
            role="alert"
            style={{
              padding: '12px 14px',
              borderRadius: 8,
              backgroundColor: T.colors.statusRedBg,
              color: T.colors.statusRed,
              border: '1.5px solid #B91C1C',
              fontSize: '0.86rem',
              fontWeight: 700,
            }}
          >
            {scaleError}
          </div>
        ) : null}

        {scaleResult ? (
          <div
            role="region"
            aria-label="Comprobante digital de entrega"
            style={{
              backgroundColor: T.colors.surfaceElevated,
              border: `2px solid ${T.colors.primaryGreen}`,
              borderRadius: 10,
              padding: 16,
              display: 'grid',
              gap: 10,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              <strong style={{ color: T.colors.primaryGreen, fontSize: '1rem' }}>
                ✅ Comprobante Digital de Entrega Registrado
              </strong>
              <button
                type="button"
                className="btn-control"
                onClick={() => setShowReceiptDetail((prev) => !prev)}
                style={{ fontSize: '0.78rem', padding: '5px 10px' }}
              >
                {showReceiptDetail ? 'Ocultar detalle técnico' : 'Ver detalle completo del ticket'}
              </button>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 10,
                fontSize: '0.84rem',
              }}
            >
              <div>
                <div style={{ color: T.colors.textSecondary }}>Parcela</div>
                <strong>{selectedParcel.parcelName || selectedParcel.producerName}</strong>
              </div>
              <div>
                <div style={{ color: T.colors.textSecondary }}>Peso recibido hoy</div>
                <strong>
                  {String(scaleResult.deliveredDryEquivalentKg ?? deliveryKg)} kg secos
                </strong>
              </div>
              <div>
                <div style={{ color: T.colors.textSecondary }}>Calidad y humedad</div>
                <strong>
                  {qualityGrade} ({humidityPct}%)
                </strong>
              </div>
              <div>
                <div style={{ color: T.colors.textSecondary }}>Folio de seguridad</div>
                <code style={{ fontWeight: 700 }}>
                  {String(
                    (scaleResult.epcisEvent as Record<string, unknown> | undefined)
                      ?.payloadSha256 ?? '',
                  )
                    .slice(0, 14)
                    .toUpperCase()}
                </code>
              </div>
            </div>

            {showReceiptDetail ? (
              <pre
                style={{
                  margin: 0,
                  padding: 12,
                  borderRadius: 8,
                  backgroundColor: '#141814',
                  color: '#E3F0E7',
                  fontSize: '0.74rem',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {JSON.stringify(scaleResult, null, 2)}
              </pre>
            ) : null}
          </div>
        ) : null}

        <div className="table-scroll-wrap">
          <table className="ledger-table">
            <thead>
              <tr>
                <th scope="col">Fecha</th>
                <th scope="col">Parcela</th>
                <th scope="col">Mazorcas / Peso baba</th>
                <th scope="col">Fermentación y secado</th>
                <th scope="col">Entrega en acopio</th>
              </tr>
            </thead>
            <tbody>
              {harvestEntries.map((item) => (
                <tr key={item.id}>
                  <td>{item.harvestDate}</td>
                  <td>
                    <strong>{item.parcelName}</strong>
                  </td>
                  <td>
                    {item.podCount} mazorcas · {item.wetWeightKg} kg baba
                  </td>
                  <td>
                    {item.fermentationMethod === 'CAJONES_MADERA' ? 'Cajones' : 'Costales'} (
                    {item.fermentationDays}d ferm. / {item.dryingDays}d secado)
                  </td>
                  <td>
                    {item.dryDeliveredKg ? (
                      <strong>
                        {item.dryDeliveredKg} kg secos ({item.deliveryFolio})
                      </strong>
                    ) : (
                      'En beneficio en finca'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
