import { WEB_DOMAIN_CONSTANTS } from '@/types/adminDomain';

export type EudrStatus = 'VERDE' | 'ROJO' | 'PENDIENTE_REVISION';
export type NdviAlertLevel =
  'VIGOR_AGROFORESTAL_OPTIMO' | 'ESTRES_HIDRICO_TEMPRANO' | 'FOCO_PLAGA_FUNGICA_ALERTA';

export interface HistoricalParcelSnapshot {
  period_key: string;
  label: string;
  months_ago: number;
  wayback_release?: string;
  render_zoom?: number;
  image_width?: number;
  image_height?: number;
  capture_source?: string;
  pixel_cloud_checked?: boolean;
  high_res_verified?: boolean;
  sharpness_g1?: number;
  resolution_label?: string;
  cloud_cover_pct?: number;
  cloud_attempts_used?: number;
  cloud_fallback_least_cloudy?: boolean;
  captured_date_iso: string;
  extent_bbox: [number, number, number, number];
  direct_ortho_url: string;
  cached_image_url?: string | null;
  server_cached_image_path: string;
}

export interface RegistrationDateAuditEntry {
  previous_date_iso: string;
  new_date_iso: string;
  changed_by: string;
  changed_by_role: string;
  changed_at_iso: string;
  confirmation_text: string;
}

export interface ParcelLegalDocument {
  id: string;
  parcel_id: string;
  document_type: 'CERTIFICADO_PARCELARIO' | 'TITULO_PROPIEDAD' | 'CUSTF_SEMARNAT' | string;
  document_label: string;
  file_name: string;
  sha256_hash: string;
  verified_by_admin: boolean;
  uploaded_at?: string | null;
  download_url?: string | null;
}

export interface ParcelAdminOverview {
  parcelId: string;
  parcelName?: string;
  producerId: string;
  producerName: string;
  municipality: string;
  areaHectares: number;
  eudrStatus: EudrStatus;
  ndviAlertLevel: NdviAlertLevel;
  meanNdvi: number;
  shadeTreeCount: number;
  acahualRemovalPost2020: boolean;
  hasVerifiedCustfPermit: boolean;
  coordinates?: number[][];
  extentBbox?: [number, number, number, number];
  registeredAtIso?: string;
  registrationAuditLog?: RegistrationDateAuditEntry[];
  documents?: ParcelLegalDocument[];
  historicalSnapshots?: HistoricalParcelSnapshot[];
}

export interface CustfAdminAuditSummary {
  parcelId: string;
  producerId: string;
  isProducerBlocked: boolean;
  blockReason: string | null;
}

export interface WebCarbonClusterResult {
  clusterId: string;
  clusterName: string;
  acceptedParcelIds: string[];
  rejectedParcelIds: string[];
  totalHectares: number;
  totalShadeTrees: number;
  meetsMinimumVolume: boolean;
  eudrLegalDisclaimer: string;
}

/**
 * HU-05: Evalúa el bloqueo automático del productor cuando existe remoción
 * de acahuales post-2020 sin permiso CUSTF de SEMARNAT verificado por ASTRA.
 */
export function evaluateCustfAdminCompliance(parcel: ParcelAdminOverview): CustfAdminAuditSummary {
  const isProducerBlocked = parcel.acahualRemovalPost2020 && !parcel.hasVerifiedCustfPermit;

  return {
    parcelId: parcel.parcelId,
    producerId: parcel.producerId,
    isProducerBlocked,
    blockReason: isProducerBlocked
      ? 'HU-05: Productor bloqueado automáticamente por remoción de acahuales post-2020 sin CUSTF de SEMARNAT.'
      : null,
  };
}

/**
 * HU-03 & HU-09: Consolida minifundios (< 5 ha) con estatus EUDR VERDE y sombra
 * agroforestal registrada para alcanzar el volumen mínimo de bonos de carbono.
 */
export function consolidateCarbonClusterWeb(params: {
  clusterId: string;
  clusterName: string;
  parcels: ParcelAdminOverview[];
  minimumRequiredHectares?: number;
}): WebCarbonClusterResult {
  const minHa = params.minimumRequiredHectares ?? 50.0;
  const acceptedParcelIds: string[] = [];
  const rejectedParcelIds: string[] = [];
  let totalHa = 0;
  let totalShadeTrees = 0;

  for (const p of params.parcels) {
    const custfCheck = evaluateCustfAdminCompliance(p);
    const isSmallholder = p.areaHectares < WEB_DOMAIN_CONSTANTS.CARBON_SMALLHOLDER_MAX_HA;
    const isEligible =
      isSmallholder &&
      p.eudrStatus === 'VERDE' &&
      p.shadeTreeCount > 0 &&
      !custfCheck.isProducerBlocked;

    if (isEligible) {
      acceptedParcelIds.push(p.parcelId);
      totalHa += p.areaHectares;
      totalShadeTrees += p.shadeTreeCount;
    } else {
      rejectedParcelIds.push(p.parcelId);
    }
  }

  const roundedHa = Number(totalHa.toFixed(4));

  return {
    clusterId: params.clusterId,
    clusterName: params.clusterName,
    acceptedParcelIds,
    rejectedParcelIds,
    totalHectares: roundedHa,
    totalShadeTrees,
    meetsMinimumVolume: roundedHa >= minHa,
    eudrLegalDisclaimer: WEB_DOMAIN_CONSTANTS.EUDR_LEGAL_DISCLAIMER,
  };
}
