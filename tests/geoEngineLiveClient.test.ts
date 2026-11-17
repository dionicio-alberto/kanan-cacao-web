import { PRESET_POLYGONS, projectCoordinatesToSvgPoints } from '@/services/geoEngineLiveClient';

describe('Bolt 3 — Cliente en vivo del Geo-Engine y proyección SVG', () => {
  it('proyecta coordenadas WGS84 dentro del lienzo SVG respetando el margen', () => {
    const points = projectCoordinatesToSvgPoints(
      PRESET_POLYGONS.CLEAN_COMALCALCO.coordinates,
      320,
      200,
      24,
    )
      .split(' ')
      .map((p) => p.split(',').map(Number));

    expect(points).toHaveLength(4);
    for (const [x, y] of points) {
      expect(x).toBeGreaterThanOrEqual(24);
      expect(x).toBeLessThanOrEqual(296);
      expect(y).toBeGreaterThanOrEqual(24);
      expect(y).toBeLessThanOrEqual(176);
    }
  });

  it('el preset con auto-intersección viene sin cerrar para demostrar el linter', () => {
    const coords = PRESET_POLYGONS.SELF_INTERSECTING_BOWTIE.coordinates;
    expect(coords[0]).not.toEqual(coords[coords.length - 1]);
  });

  it('devuelve cadena vacía si no hay coordenadas', () => {
    expect(projectCoordinatesToSvgPoints([])).toBe('');
  });
});

describe('Satélite Esri World Imagery y proyección ortogonal', () => {
  it('ajusta el bbox al aspect ratio 1.75 igual que ArcGIS World_Imagery', async () => {
    const {
      computePaddedGeoBbox,
      fitBboxToAspectRatio,
      buildSatelliteOrthoExportUrl,
      projectCoordinatesToOrthoSvgPoints,
    } = await import('@/services/geoEngineLiveClient');

    const squareCoords = [
      [-93.225, 18.215],
      [-93.221, 18.215],
      [-93.221, 18.211],
      [-93.225, 18.211],
      [-93.225, 18.215],
    ];
    const padded = computePaddedGeoBbox(squareCoords);
    expect(padded).toEqual([-93.2275, 18.2085, -93.2185, 18.2175]);

    const fitted = fitBboxToAspectRatio(padded, 420 / 240);
    expect(fitted[0]).toBeCloseTo(-93.230875, 5);
    expect(fitted[1]).toBe(18.2085);
    expect(fitted[2]).toBeCloseTo(-93.215125, 5);
    expect(fitted[3]).toBe(18.2175);

    const { orthoUrl, extentBbox } = buildSatelliteOrthoExportUrl(squareCoords);
    expect(orthoUrl).toContain('World_Imagery/MapServer/export');
    expect(orthoUrl).toContain('size=840,480');

    const svgPts = projectCoordinatesToOrthoSvgPoints(squareCoords, extentBbox, 420, 240);
    expect(svgPts).toHaveLength(5);
    expect(svgPts[0].x).toBeGreaterThan(0);
    expect(svgPts[0].x).toBeLessThan(420);
    expect(svgPts[0].y).toBeGreaterThan(0);
    expect(svgPts[0].y).toBeLessThan(240);
  });

  it('genera mosaico 6x5 con proyección y nitidez HD idéntica a cacao-track', async () => {
    const { computeCacaoTrackTileGrid, buildWaybackTileUrl } =
      await import('@/services/geoEngineLiveClient');
    const coords = [
      [-93.2845, 18.256],
      [-93.281, 18.256],
      [-93.281, 18.2525],
      [-93.2845, 18.2525],
    ];
    const grid = computeCacaoTrackTileGrid(coords, 6, 5);
    expect(grid.tiles).toHaveLength(30);
    expect(grid.zoom).toBeGreaterThanOrEqual(15);
    expect(grid.zoom).toBeLessThanOrEqual(17);
    expect(grid.viewBoxStr).toMatch(/^\d+\.\d \d+\.\d \d+\.\d \d+\.\d$/);
    expect(grid.projectedPts).toHaveLength(4);
    expect(grid.polygonPointsStr.split(' ')).toHaveLength(4);

    const liveUrl = buildWaybackTileUrl('live', 16, 100, 200);
    expect(liveUrl).toContain(
      'server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/16/200/100',
    );

    const waybackUrl = buildWaybackTileUrl('49059', 16, 100, 200);
    expect(waybackUrl).toContain(
      'wayback.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/WMTS/1.0.0/default028mm/MapServer/tile/49059/16/200/100',
    );
  });

  it('garantiza matemáticamente la resta temporal (año de registro - N años) y margen válido por parcela', async () => {
    const { matchWaybackCapturesToHorizons } = await import('@/services/geoEngineLiveClient');

    // =========================================================================
    // PARCELA 1: Registrada en Noviembre 2026 (ej. Terreno Carrizal - 09/11/2026)
    // =========================================================================
    const snaps2026 = matchWaybackCapturesToHorizons('2026-11-09T00:00:00Z');
    expect(snaps2026).toHaveLength(7);
    expect(new Set(snaps2026.map((s) => s.wayback_release)).size).toBe(7);

    // Validación estricta año por año de la resta matemática
    const expectedYears2026: Record<string, number> = {
      registro_actual: 2026,
      hace_6_meses: 2026,
      hace_1_anio: 2025,
      hace_2_anios: 2024,
      hace_3_anios: 2023,
      hace_4_anios: 2022,
      hace_5_anios: 2021,
    };

    for (const snap of snaps2026) {
      const expectedYr = expectedYears2026[snap.period_key];
      expect(snap.captured_year).toBe(expectedYr);
      expect(snap.target_year).toBe(expectedYr);
      expect(snap.is_exact_year).toBe(true);
      expect(snap.sensor).toBe('Maxar WorldView-3');
      expect(snap.resolution).toBe('0.30m Super-HD');
      expect(snap.margin_label).toContain('Dentro de margen');
    }

    // Validación específica del horizonte Hace 4 Años para registro en 2026
    const snap4y_2026 = snaps2026.find((s) => s.period_key === 'hace_4_anios')!;
    expect(snap4y_2026.captured_year).toBe(2022); // 2026 - 4 = 2022
    // La captura debe ser de otoño 2022 (septiembre, octubre o noviembre)
    const month4y_2026 = parseInt(snap4y_2026.captured_date_iso.split('-')[1], 10);
    expect([9, 10, 11, 12]).toContain(month4y_2026);
    expect(snap4y_2026.days_offset).toBeLessThanOrEqual(15);

    // =========================================================================
    // PARCELA 2: Registrada en Mayo 2025 (ej. Finca Bellavista - 15/05/2025)
    // Cada parcela tiene sus propias fotos calculadas de forma independiente
    // =========================================================================
    const snaps2025 = matchWaybackCapturesToHorizons('2025-05-15T00:00:00Z');
    expect(snaps2025).toHaveLength(7);
    expect(new Set(snaps2025.map((s) => s.wayback_release)).size).toBe(7);

    const expectedYears2025: Record<string, number> = {
      registro_actual: 2025,
      hace_6_meses: 2024,
      hace_1_anio: 2024,
      hace_2_anios: 2023,
      hace_3_anios: 2022,
      hace_4_anios: 2021, // 2025 - 4 = 2021
      hace_5_anios: 2020, // 2025 - 5 = 2020
    };

    for (const snap of snaps2025) {
      const expectedYr = expectedYears2025[snap.period_key];
      expect(snap.captured_year).toBe(expectedYr);
      expect(snap.is_exact_year).toBe(true);
    }

    // El año 4 de Parcela 2025 es 2021, NUNCA igual al año 4 de Parcela 2026 (2022)
    const snap4y_2025 = snaps2025.find((s) => s.period_key === 'hace_4_anios')!;
    expect(snap4y_2025.captured_year).toBe(2021);
    expect(snap4y_2025.wayback_release).not.toBe(snap4y_2026.wayback_release);

    // =========================================================================
    // PARCELA 3: Registrada en Marzo 2024 (ej. Carlos Chontal - 20/03/2024)
    // =========================================================================
    const snaps2024 = matchWaybackCapturesToHorizons('2024-03-20T00:00:00Z');
    const snap4y_2024 = snaps2024.find((s) => s.period_key === 'hace_4_anios')!;
    const snap5y_2024 = snaps2024.find((s) => s.period_key === 'hace_5_anios')!;

    expect(snap4y_2024.captured_year).toBe(2020); // 2024 - 4 = 2020
    expect(snap5y_2024.captured_year).toBe(2019); // 2024 - 5 = 2019
    expect(snap4y_2024.is_exact_year).toBe(true);
    expect(snap5y_2024.is_exact_year).toBe(true);

    // Confirmación de no coincidencia de corridas entre parcelas
    expect(snap4y_2024.wayback_release).not.toBe(snap4y_2026.wayback_release);
    expect(snap4y_2024.wayback_release).not.toBe(snap4y_2025.wayback_release);
  });
});
