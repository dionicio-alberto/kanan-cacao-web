export type WebUserRole =
  | 'acopiador'
  | 'auditor_sustentabilidad'
  | 'admin_astra'
  | 'tecnico_campo'
  | 'productor'
  | (string & {});

export interface RolePermissionSet {
  can_view_parcels: boolean;
  can_create_parcels: boolean;
  can_edit_logbook: boolean;
  can_register_harvest: boolean;
  can_view_carbon: boolean;
  can_edit_regdate: boolean;
  can_manage_roles: boolean;
  can_configure_logbook: boolean;
}

export interface LogbookFeatureToggles {
  version: number;
  enable_photos: boolean;
  enable_inputs_used: boolean;
  enable_doses: boolean;
  enable_labor_and_costs: boolean;
  enable_weather_conditions: boolean;
  enable_satellite_comparison: boolean;
  enable_eudr_flags: boolean;
  enable_custom_fields: boolean;
  allow_producer_custom_tags: boolean;
  min_required_photos: number;
  updated_at_iso?: string;
  updated_by?: string;
}

export interface LogbookActivityCatalogItem {
  activity_key: string;
  name: string;
  category: string;
  icon: string;
  description: string;
  default_fields: string[];
  requires_inputs: boolean;
  requires_dose: boolean;
  is_active: boolean;
  is_archived: boolean;
  sort_order: number;
  created_at_iso?: string;
  updated_at_iso?: string;
}

export interface LogbookInputCatalogItem {
  input_key: string;
  name: string;
  type: string;
  default_unit: string;
  is_organic_certified: boolean;
  is_active: boolean;
  is_archived: boolean;
  sort_order: number;
}

export interface LogbookCustomFieldItem {
  field_key: string;
  activity_key?: string | null;
  label: string;
  field_type: string;
  options: string[];
  required: boolean;
  is_active: boolean;
  is_archived: boolean;
  sort_order: number;
}

export interface LogbookFullConfigBundle {
  config: LogbookFeatureToggles;
  activities: LogbookActivityCatalogItem[];
  inputs: LogbookInputCatalogItem[];
  custom_fields: LogbookCustomFieldItem[];
}

export interface EditableRoleDefinition {
  role_key: string;
  display_name: string;
  description: string;
  is_system: boolean;
  permissions: RolePermissionSet;
  updated_at_iso?: string;
  updated_by?: string;
}

export interface AdminManagedProfile {
  user_id: string;
  email: string;
  full_name: string;
  role: string;
  role_display_name: string;
  cooperative_name: string;
  updated_at_iso?: string;
}

export const WEB_DOMAIN_CONSTANTS = {
  EUDR_MANDATORY_POLYGON_THRESHOLD_HA: 4.0,
  EUDR_CUTOFF_DATE_ISO: '2020-12-31',
  EUDR_LEGAL_DISCLAIMER:
    'Esta validación constituye una preevaluación automatizada basada en capas satelitales JRC 2020 y no representa una certificación legal vinculante.',
  TABASCO_YIELD_CAP_MIN_KG_HA: 450,
  TABASCO_YIELD_CAP_MAX_KG_HA: 650,
  CARBON_SMALLHOLDER_MAX_HA: 5.0,
} as const;
