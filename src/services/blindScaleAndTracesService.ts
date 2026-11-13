import { createHash } from 'crypto';
import { WEB_DOMAIN_CONSTANTS, WebUserRole } from '@/types/adminDomain';

export interface ScaleReceptionInput {
  parcelId: string;
  producerId: string;
  areaHectares: number;
  previousCumulativeDryKg: number;
  deliveredDryEquivalentKg: number;
  readPointId: string;
  isBlockedByCustf: boolean;
  eventTimeIso?: string;
}

export interface EpcisEventPayload {
  '@context': 'https://ref.gs1.org/standards/epcis/2.0.0/epcis-context.jsonld';
  type: 'ObjectEvent';
  eventTime: string;
  bizStep: 'receiving';
  disposition: 'in_progress';
  readPoint: { id: string };
  parcelId: string;
  producerId: string;
  deliveredDryEquivalentKg: number;
  payloadSha256: string;
}

export interface AdminReceptionAuditView {
  status: 'REGISTERED';
  parcelId: string;
  producerId: string;
  deliveredDryEquivalentKg: number;
  newCumulativeDryKg: number;
  cumulativeKgPerHa: number;
  triggeredYieldCapAlert: boolean;
  epcisEvent: EpcisEventPayload;
}

export interface BlindOperatorReceiptView {
  status: 'REGISTERED';
  parcelId: string;
  producerId: string;
  deliveredDryEquivalentKg: number;
  epcisEvent: EpcisEventPayload;
}

export function computeWebSha256(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

/**
 * HU-06 & HU-07: Registra recepción en centro de acopio con operación "ciega" en báscula
 * para el operador (rol 'acopiador') y alerta silenciosa si supera 650 kg/ha en Tabasco.
 */
export function processScaleReceptionByRole(
  input: ScaleReceptionInput,
  role: WebUserRole,
): AdminReceptionAuditView | BlindOperatorReceiptView {
  if (input.isBlockedByCustf) {
    throw new Error(
      'HU-05: Recepción rechazada. Productor bloqueado por falta de permiso CUSTF (SEMARNAT).',
    );
  }

  if (input.areaHectares <= 0 || input.deliveredDryEquivalentKg <= 0) {
    throw new Error('HU-06: El área del polígono y los kg entregados deben ser mayores a cero.');
  }

  const newCumulativeDryKg = Number(
    (input.previousCumulativeDryKg + input.deliveredDryEquivalentKg).toFixed(2),
  );
  const cumulativeKgPerHa = Number((newCumulativeDryKg / input.areaHectares).toFixed(2));
  const triggeredYieldCapAlert =
    cumulativeKgPerHa > WEB_DOMAIN_CONSTANTS.TABASCO_YIELD_CAP_MAX_KG_HA;

  const eventTime = input.eventTimeIso ?? new Date().toISOString();
  const canonical = JSON.stringify({
    context: 'https://ref.gs1.org/standards/epcis/2.0.0/epcis-context.jsonld',
    type: 'ObjectEvent',
    eventTime,
    readPointId: input.readPointId,
    parcelId: input.parcelId,
    producerId: input.producerId,
    deliveredDryEquivalentKg: input.deliveredDryEquivalentKg,
  });

  const epcisEvent: EpcisEventPayload = {
    '@context': 'https://ref.gs1.org/standards/epcis/2.0.0/epcis-context.jsonld',
    type: 'ObjectEvent',
    eventTime,
    bizStep: 'receiving',
    disposition: 'in_progress',
    readPoint: { id: input.readPointId },
    parcelId: input.parcelId,
    producerId: input.producerId,
    deliveredDryEquivalentKg: input.deliveredDryEquivalentKg,
    payloadSha256: computeWebSha256(canonical),
  };

  if (role === 'admin_astra' || role === 'auditor_sustentabilidad') {
    return {
      status: 'REGISTERED',
      parcelId: input.parcelId,
      producerId: input.producerId,
      deliveredDryEquivalentKg: input.deliveredDryEquivalentKg,
      newCumulativeDryKg,
      cumulativeKgPerHa,
      triggeredYieldCapAlert,
      epcisEvent,
    };
  }

  return {
    status: 'REGISTERED',
    parcelId: input.parcelId,
    producerId: input.producerId,
    deliveredDryEquivalentKg: input.deliveredDryEquivalentKg,
    epcisEvent,
  };
}
