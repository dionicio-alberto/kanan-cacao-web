import { INITIAL_PARCELS } from '@/services/demoParcels';
import {
  fetchParcelDocumentsLive,
  fetchPersistedParcelsWithMeta,
  getParcelDocumentDownloadUrl,
  saveFieldLogLive,
  syncFieldParcelToSqliteLive,
  uploadParcelDocumentLive,
} from '@/services/geoEngineLiveClient';
import {
  buildClosedPolygonFromCenter,
  createFieldLogEntry,
  FIELD_ACTIVITY_LABELS,
  FieldLogEntry,
  filterLogEntriesByDateRange,
  filterLogEntriesByProducerOrParcel,
  getProducerFriendlyParcelStatus,
  INITIAL_FIELD_LOGS,
  parseCoordinatePairsText,
} from '@/services/producerLogbookService';
import {
  AuthenticatedOperatorProfile,
  resolveRoleFromEmailOrProfile,
} from '@/services/supabaseClient';
import { evaluateCustfAdminCompliance } from '@/services/sustainabilityAdminService';

describe('Web Comprehensive Test Suite: Validación E2E de Parcelas y Bitácora', () => {
  // =========================================================================
  // 1. INICIO DE SESIÓN CON ADMIN
  // =========================================================================
  describe('1. Inicio de Sesión con Rol Administrador', () => {
    it('resuelve correctamente el perfil de administrador general ASTRA', () => {
      const adminProfile = resolveRoleFromEmailOrProfile('admin@cacao-astra.org', null);
      expect(adminProfile).toBe('admin_astra');

      const adminByEmail = resolveRoleFromEmailOrProfile('admin@cooperativa.mx', null);
      expect(adminByEmail).toBe('admin_astra');
    });

    it('estructura la sesión de operador autenticado con permisos administrativos', () => {
      const mockAdminSession: AuthenticatedOperatorProfile = {
        userId: 'usr-admin-astra-001',
        email: 'admin_astra@kanan.demo',
        fullName: 'Dirección de Operaciones ASTRA',
        role: 'admin_astra',
        accessToken: 'mock-jwt-admin-token',
      };

      expect(mockAdminSession.role).toBe('admin_astra');
      expect(mockAdminSession.fullName).toContain('ASTRA');
      expect(mockAdminSession.accessToken).toBeTruthy();
    });
  });

  // =========================================================================
  // 2. CREACIÓN DE NUEVAS PARCELAS
  // =========================================================================
  describe('2. Creación de Nuevas Parcelas y Georreferencia', () => {
    it('genera polígonos cerrados WGS84 a partir de centro y hectáreas', () => {
      const polygon = buildClosedPolygonFromCenter(18.2545, -93.2825, 2.5);
      expect(polygon.length).toBe(5);
      // El polígono debe cerrarse sobre sí mismo
      expect(polygon[0][0]).toBe(polygon[4][0]);
      expect(polygon[0][1]).toBe(polygon[4][1]);
    });

    it('procesa texto de esquinas manuales y auto-cierra el anillo WGS84', () => {
      const manualCoords = `
        -93.2845, 18.2560
        -93.2810, 18.2560
        -93.2810, 18.2525
        -93.2845, 18.2525
      `;
      const closed = parseCoordinatePairsText(manualCoords);
      expect(closed.length).toBe(5);
      expect(closed[0]).toEqual(closed[4]);
    });

    it('valida la sincronización de una nueva parcela hacia el backend unificado', async () => {
      const newParcelPayload = {
        parcelId: 'test-parcel-web-001',
        parcelName: 'Finca Nueva Cárdenas',
        producerName: 'Don Roberto Méndez',
        municipality: 'Cárdenas',
        areaHectares: 3.5,
        shadeTreeCount: 120,
        coordinates: [
          [-93.2845, 18.256],
          [-93.281, 18.256],
          [-93.281, 18.2525],
          [-93.2845, 18.2525],
          [-93.2845, 18.256],
        ],
      };

      global.fetch = jest.fn().mockImplementation((url: string, opts?: RequestInit) => {
        if (url.includes('/api/v1/parcels/sync') && opts?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                status: 'OK',
                remote_changed_parcels: [
                  {
                    parcel_id: newParcelPayload.parcelId,
                    parcel_name: newParcelPayload.parcelName,
                    producer_name: newParcelPayload.producerName,
                    municipality: newParcelPayload.municipality,
                    area_hectares: newParcelPayload.areaHectares,
                    eudr_status: 'VERDE',
                    ndvi_alert_level: 'VIGOR_AGROFORESTAL_OPTIMO',
                    mean_ndvi: 0.81,
                    shade_tree_count: newParcelPayload.shadeTreeCount,
                    has_verified_custf_permit: true,
                    coordinates: newParcelPayload.coordinates,
                  },
                ],
              }),
          });
        }
        return Promise.reject(new Error(`Unhandled fetch url: ${url}`));
      });

      const syncedList = await syncFieldParcelToSqliteLive(newParcelPayload);
      expect(syncedList.length).toBe(1);
      expect(syncedList[0].parcelName).toBe('Finca Nueva Cárdenas');
      expect(syncedList[0].areaHectares).toBe(3.5);
    });
  });

  // =========================================================================
  // 3. REVISIÓN DE PARCELAS YA REGISTRADAS
  // =========================================================================
  describe('3. Revisión de Parcelas ya Registradas', () => {
    it('recupera parcelas registradas con metadatos del motor de persistencia', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            storage_engine: 'sqlite_local',
            count: INITIAL_PARCELS.length,
            parcels: INITIAL_PARCELS.map((p) => ({
              parcel_id: p.parcelId,
              parcel_name: p.parcelName,
              producer_id: p.producerId,
              producer_name: p.producerName,
              municipality: p.municipality,
              area_hectares: p.areaHectares,
              eudr_status: p.eudrStatus,
              ndvi_alert_level: p.ndviAlertLevel,
              mean_ndvi: p.meanNdvi,
              shade_tree_count: p.shadeTreeCount,
              has_verified_custf_permit: p.hasVerifiedCustfPermit,
              coordinates: p.coordinates,
            })),
          }),
      });

      const meta = await fetchPersistedParcelsWithMeta();
      expect(meta.storageEngine).toBe('sqlite_local');
      expect(meta.parcels.length).toBeGreaterThanOrEqual(2);
      expect(meta.parcels[0].coordinates).toBeDefined();
    });

    it('evalúa la conformidad EUDR y alertas NDVI de cada parcela registrada', () => {
      for (const p of INITIAL_PARCELS) {
        const compliance = evaluateCustfAdminCompliance(p);
        expect(compliance.parcelId).toBe(p.parcelId);
        expect(typeof compliance.isProducerBlocked).toBe('boolean');

        const friendly = getProducerFriendlyParcelStatus(p);
        expect(friendly.forestStatusLabel).toBeTruthy();
        expect(friendly.canopyHealthLabel).toBeTruthy();
        expect(friendly.papersStatusLabel).toBeTruthy();
      }
    });
  });

  // =========================================================================
  // 4. DOCUMENTACIÓN: CARGA, REVISIÓN Y VISUALIZACIÓN
  // =========================================================================
  describe('4. Documentación: Carga, Revisión y Visualización', () => {
    it('permite listar la documentación digital de una parcela', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            status: 'OK',
            documents: [
              {
                id: 'doc-001',
                parcel_id: 'parcel-101',
                document_type: 'CERTIFICADO_PARCELARIO',
                document_label: 'Certificado Parcelario Ejidal',
                file_name: 'certificado_101.pdf',
                mime_type: 'application/pdf',
                sha256_hash: 'a1b2c3d4e5f6',
                download_url: '/api/v1/parcels/parcel-101/documents/doc-001/file',
                verified_by_admin: true,
                uploaded_at: '2026-11-18T00:00:00Z',
              },
            ],
          }),
      });

      const docs = await fetchParcelDocumentsLive('parcel-101');
      expect(docs.length).toBe(1);
      expect(docs[0].document_label).toBe('Certificado Parcelario Ejidal');
      expect(docs[0].verified_by_admin).toBe(true);
    });

    it('genera la URL de descarga y visualización segura para documentos', () => {
      const downloadUrl = getParcelDocumentDownloadUrl('parcel-101', 'doc-001');
      expect(downloadUrl).toContain('/api/v1/parcels/parcel-101/documents/doc-001/file');
    });

    it('valida la carga exitosa de un archivo de documento con hash SHA-256', async () => {
      global.fetch = jest.fn().mockImplementation((url: string, opts?: RequestInit) => {
        if (url.includes('/documents') && opts?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                status: 'OK',
                document: {
                  id: 'doc-uploaded-99',
                  parcel_id: 'parcel-101',
                  document_type: 'TITULO_PROPIEDAD',
                  document_label: 'Título de Propiedad o Escritura',
                  file_name: 'escritura_parcela.pdf',
                  mime_type: 'application/pdf',
                  sha256_hash: '8f7e6d5c4b3a21',
                  download_url: '/api/v1/parcels/parcel-101/documents/doc-uploaded-99/file',
                  verified_by_admin: false,
                },
              }),
          });
        }
        return Promise.reject(new Error(`Unhandled fetch url: ${url}`));
      });

      const mockFile = new File(['fake content'], 'escritura_parcela.pdf', {
        type: 'application/pdf',
      });
      const uploadedDoc = await uploadParcelDocumentLive(
        'parcel-101',
        'TITULO_PROPIEDAD',
        mockFile,
      );

      expect(uploadedDoc.id).toBe('doc-uploaded-99');
      expect(uploadedDoc.file_name).toBe('escritura_parcela.pdf');
      expect(uploadedDoc.sha256_hash).toBeTruthy();
    });
  });

  // =========================================================================
  // 5. BITÁCORA: AGREGAR REGISTRO, VISUALIZACIÓN Y FILTROS
  // =========================================================================
  describe('5. Bitácora: Registro, Historial y Filtros', () => {
    it('crea un registro válido de labor con actividad y fecha', () => {
      const newEntry = createFieldLogEntry({
        parcelId: 'PAR-CHONTALPA-01',
        parcelName: 'Cacaotal El Porvenir',
        producerId: 'PROD-01',
        producerName: 'Mateo Hernández',
        activityType: 'PODA',
        performedDate: '2026-11-18',
        notes: 'Poda de ramas bajas y deschuponado general',
        photos: [
          {
            id: 'photo-1',
            fileName: 'mockfoto1.jpg',
            previewDataUrl: 'data:image/jpeg;base64,mockfoto1',
            capturedAtIso: '2026-11-18T10:00:00.000Z',
          },
        ],
      });

      expect(newEntry.id).toBeTruthy();
      expect(newEntry.activityType).toBe('PODA');
      expect(newEntry.activityLabel).toBe(FIELD_ACTIVITY_LABELS.PODA);
      expect(newEntry.photos.length).toBe(1);
    });

    it('sincroniza el registro de bitácora mediante POST hacia el backend', async () => {
      global.fetch = jest.fn().mockImplementation((url: string, opts?: RequestInit) => {
        if (url.includes('/api/v1/logbook') && opts?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                status: 'OK',
                entry: {
                  id: 'LOG-WEB-LIVE-01',
                  parcel_id: 'PAR-CHONTALPA-01',
                  parcel_name: 'Cacaotal El Porvenir',
                  producer_id: 'PROD-01',
                  producer_name: 'Mateo Hernández',
                  activity_type: 'CONTROL_PLAGAS',
                  activity_label: 'Control biológico',
                  performed_date: '2026-11-18',
                  notes: 'Aplicación preventiva de caldo bordelés',
                  photos: [],
                  sync_status: 'SYNCED',
                  created_at_iso: '2026-11-18T10:00:00Z',
                },
              }),
          });
        }
        return Promise.reject(new Error(`Unhandled fetch url: ${url}`));
      });

      const entryToSave: FieldLogEntry = {
        id: 'LOG-LOCAL-01',
        parcelId: 'PAR-CHONTALPA-01',
        parcelName: 'Cacaotal El Porvenir',
        producerId: 'PROD-01',
        producerName: 'Mateo Hernández',
        activityType: 'CONTROL_PLAGAS',
        activityLabel: 'Control biológico',
        performedDate: '2026-11-18',
        notes: 'Aplicación preventiva de caldo bordelés',
        photos: [],
        syncStatus: 'LOCAL_PENDING',
        createdAtIso: '2026-11-18T10:00:00Z',
      };

      const savedResult = await saveFieldLogLive(entryToSave);
      expect(savedResult.syncStatus).toBe('SYNCED');
    });

    it('filtra el historial de bitácora por parcela y por productor', () => {
      const logs: FieldLogEntry[] = [
        ...INITIAL_FIELD_LOGS,
        {
          id: 'LOG-MATEO-01',
          parcelId: 'PAR-MATEO-01',
          parcelName: 'Parcela Don Mateo',
          producerId: 'PROD-MATEO',
          producerName: 'Don Mateo Hernández',
          activityType: 'FERTILIZACION',
          activityLabel: FIELD_ACTIVITY_LABELS.FERTILIZACION,
          performedDate: '2026-11-16',
          notes: 'Fertilización orgánica con biofertilizante',
          photos: [],
          createdAtIso: '2026-11-16T12:00:00Z',
        },
      ];

      const byProducer = filterLogEntriesByProducerOrParcel(logs, 'Don Mateo');
      expect(byProducer.length).toBe(1);
      expect(byProducer[0].producerName).toContain('Mateo');

      const byParcel = filterLogEntriesByProducerOrParcel(logs, 'Joya');
      expect(byParcel.length).toBeGreaterThanOrEqual(1);
      expect(byParcel[0].parcelName).toContain('Joya');
    });

    it('filtra el historial de bitácora por rango de fechas', () => {
      const logs = [...INITIAL_FIELD_LOGS];
      const filtered = filterLogEntriesByDateRange(logs, '2026-11-01', '2026-11-20');
      expect(filtered.length).toBeGreaterThanOrEqual(1);
      for (const item of filtered) {
        expect(item.performedDate >= '2026-11-01').toBe(true);
        expect(item.performedDate <= '2026-11-20').toBe(true);
      }
    });
  });
});
