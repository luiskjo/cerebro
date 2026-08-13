import { describe, expect, it } from 'vitest'
import { calcularDiagnostico } from './reglas'
import { generarPlan, consolidarMateriales } from './plan'
import { CATALOGO, RENDIMIENTOS, sugerirReparaciones, buscarReparacion } from './reparaciones'
import type { Respuestas, Vivienda } from '../lib/tipos'

function vivienda(respuestas: Respuestas, revisionFirmada?: string[]): Vivienda {
  const ahora = new Date().toISOString()
  return {
    id: 'v1',
    estado: 'evaluacion_enviada',
    identificacion: {
      codigo: 'CF-0001',
      municipio: 'Jamundí',
      veredaBarrio: '',
      direccion: 'x',
      responsableNombre: '',
      responsableTelefono: '',
      personas: 4,
      personasVulnerables: 1,
      voluntarioNombre: 'Ana',
      voluntarioTelefono: '',
      fecha: ahora.slice(0, 10),
    },
    respuestas,
    notas: {},
    fotos: [],
    seccionesCompletas: [],
    creadaEn: ahora,
    actualizadaEn: ahora,
    revision: revisionFirmada && {
      profesionalNombre: 'Ing. Pérez',
      profesionalMatricula: '123',
      fecha: ahora.slice(0, 10),
      habitabilidadFinal: 'amarillo',
      justificacion: '',
      requiereVisitaProfesional: false,
      requiereEstudioDetallado: false,
      observaciones: '',
      reparacionesAprobadas: revisionFirmada,
      reparacionesDescartadas: [],
      recomendacionesAdicionales: [],
      firmada: true,
    },
  }
}

const CASA_DANADA: Respuestas = {
  peligro_colapso: 'no',
  peligro_inclinacion: false,
  peligro_servicios: ['ninguno'],
  peligro_vecino: false,
  material_muros: ['ladrillo_sin_confinar'],
  numero_pisos: 1,
  material_cubierta: 'guadua',
  material_teja: 'barro',
  medida_area: 60,
  mamp_grietas_diagonales: 'ancha',
  mamp_medida_grietas: 20,
  mamp_medida_area_danada: 30,
  mamp_viga_amarre: 'no',
  cub_tejas: 'bastantes',
  cub_medida_tejas_faltantes: 90,
}

describe('catálogo de reparaciones', () => {
  it('no tiene identificadores repetidos', () => {
    const ids = CATALOGO.map((r) => r.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('todas las reparaciones producen materiales y pasos utilizables', () => {
    for (const rep of CATALOGO) {
      const medida = rep.medir(CASA_DANADA)
      expect(medida.cantidad, rep.id).toBeGreaterThan(0)
      expect(rep.pasos.length, rep.id).toBeGreaterThan(0)
      for (const mat of rep.materiales(medida)) {
        expect(Number.isFinite(mat.cantidad), `${rep.id}/${mat.nombre}`).toBe(true)
        expect(mat.cantidad, `${rep.id}/${mat.nombre}`).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('propone lo que corresponde a los daños encontrados', () => {
    const d = calcularDiagnostico(CASA_DANADA)
    const ids = sugerirReparaciones(CASA_DANADA, d).map((r) => r.id)
    expect(ids).toContain('enchape_malla')
    expect(ids).toContain('viga_amarre')
    expect(ids).toContain('reponer_tejas')
    expect(ids).not.toContain('refuerzo_tapia')
  })

  it('una casa sana no dispara reparaciones estructurales', () => {
    const sana: Respuestas = {
      peligro_colapso: 'no',
      material_muros: ['ladrillo_confinado'],
      numero_pisos: 1,
      medida_area: 60,
      mamp_grietas_diagonales: 'ninguna',
      mamp_viga_amarre: 'si',
      cub_tejas: 'bien',
      material_cubierta: 'metalica',
    }
    const ids = sugerirReparaciones(sana, calcularDiagnostico(sana)).map((r) => r.id)
    expect(ids).not.toContain('enchape_malla')
    expect(ids).not.toContain('viga_amarre')
    expect(ids).not.toContain('evacuar_senalizar')
  })
})

describe('cantidades de material', () => {
  it('el enchape con malla sale del área medida en campo', () => {
    const rep = buscarReparacion('enchape_malla')!
    const materiales = rep.materiales({ cantidad: 100, unidad: 'm²' })
    const malla = materiales.find((m) => m.nombre.includes('Malla'))!
    // 100 m2 de muro con 15% de traslapo
    expect(malla.cantidad).toBeCloseTo(115, 0)

    const cemento = materiales.find((m) => m.nombre === 'Cemento gris')!
    // 100 m2 x 3 cm = 3 m3 de mortero 1:4 -> 3 x 8,5 bultos + 10% desperdicio
    const esperado = 3 * RENDIMIENTOS.cementoPorM3Mortero * 1.1
    expect(cemento.cantidad).toBeGreaterThanOrEqual(esperado)
    expect(cemento.cantidad).toBeLessThan(esperado + 1)
  })

  it('las tejas incluyen 10% de rotura', () => {
    const rep = buscarReparacion('reponer_tejas')!
    const tejas = rep.materiales({ cantidad: 100, unidad: 'tejas' }).find((m) => m.nombre === 'Teja de barro')!
    expect(tejas.cantidad).toBe(110)
  })

  it('suma los materiales repetidos de trabajos distintos', () => {
    const consolidado = consolidarMateriales([
      {
        reparacion: CATALOGO[0],
        medida: { cantidad: 1, unidad: 'x' },
        jornales: 0,
        materiales: [{ nombre: 'Cemento gris', unidad: 'bulto 50 kg', cantidad: 4 }],
      },
      {
        reparacion: CATALOGO[1],
        medida: { cantidad: 1, unidad: 'x' },
        jornales: 0,
        materiales: [
          { nombre: 'Cemento gris', unidad: 'bulto 50 kg', cantidad: 2.5 },
          { nombre: 'Arena', unidad: 'm³', cantidad: 1 },
        ],
      },
    ])
    expect(consolidado.find((m) => m.nombre === 'Cemento gris')!.cantidad).toBe(6.5)
    expect(consolidado).toHaveLength(2)
  })
})

describe('generación del plan', () => {
  it('ordena las etapas: primero seguridad', () => {
    const v = vivienda(CASA_DANADA)
    const plan = generarPlan(v, calcularDiagnostico(CASA_DANADA))
    expect(plan.etapas[0].prioridad).toBe(1)
    expect(plan.etapas.map((e) => e.prioridad)).toEqual([...plan.etapas.map((e) => e.prioridad)].sort())
  })

  it('advierte que es borrador mientras no esté firmado', () => {
    const plan = generarPlan(vivienda(CASA_DANADA), calcularDiagnostico(CASA_DANADA))
    expect(plan.advertencias.join(' ')).toContain('PROPUESTA')
  })

  it('cuando está firmado usa exactamente lo que aprobó el profesional', () => {
    const v = vivienda(CASA_DANADA, ['reponer_tejas'])
    const plan = generarPlan(v, calcularDiagnostico(CASA_DANADA))
    const ids = plan.etapas.flatMap((e) => e.items.map((i) => i.reparacion.id))
    expect(ids).toEqual(['reponer_tejas'])
    expect(plan.advertencias.join(' ')).not.toContain('PROPUESTA')
  })

  it('la lista de compras no repite materiales', () => {
    const plan = generarPlan(vivienda(CASA_DANADA), calcularDiagnostico(CASA_DANADA))
    const claves = plan.listaCompras.map((m) => `${m.nombre}|${m.unidad}`)
    expect(new Set(claves).size).toBe(claves.length)
    expect(plan.listaCompras.length).toBeGreaterThan(0)
  })

  it('estima jornales mayores que cero cuando hay obra', () => {
    const plan = generarPlan(vivienda(CASA_DANADA), calcularDiagnostico(CASA_DANADA))
    expect(plan.jornalesTotales).toBeGreaterThan(0)
  })
})
