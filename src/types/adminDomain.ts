export type WebUserRole = 'acopiador' | 'auditor_sustentabilidad' | 'admin_astra';

export const WEB_DOMAIN_CONSTANTS = {
  EUDR_MANDATORY_POLYGON_THRESHOLD_HA: 4.0,
  EUDR_CUTOFF_DATE_ISO: '2020-12-31',
  EUDR_LEGAL_DISCLAIMER:
    'Esta validación constituye una preevaluación automatizada basada en capas satelitales JRC 2020 y no representa una certificación legal vinculante.',
  TABASCO_YIELD_CAP_MIN_KG_HA: 450,
  TABASCO_YIELD_CAP_MAX_KG_HA: 650,
  CARBON_SMALLHOLDER_MAX_HA: 5.0,
} as const;
