import { describe, expect, it } from 'vitest'
import { fusionarVivienda } from './almacenamiento'
import type { Asignacion, Revision, Vivienda } from './tipos'

function vivienda(parcial: Partial<Vivienda> = {}): Vivienda {
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
      personas: 3,
      personasVulnerables: 0,
      voluntarioNombre: 'Ana',
      voluntarioTelefono: '',
      fecha: '2026-08-12',
    },
    respuestas: {},
    notas: {},
    fotos: [],
    seccionesCompletas: [],
    creadaEn: '2026-08-12T10:00:00.000Z',
    actualizadaEn: '2026-08-12T10:00:00.000Z',
    ...parcial,
  }
}

const asignacion = (quien: string, cuando: string): Asignacion => ({
  profesionalId: quien,
  profesionalNombre: quien,
  tomadaEn: cuando,
})

const revisionFirmada = (quien: string): Revision => ({
  profesionalNombre: quien,
  profesionalMatricula: '123',
  fecha: '2026-08-13',
  habitabilidadFinal: 'amarillo',
  justificacion: '',
  requiereVisitaProfesional: false,
  requiereEstudioDetallado: false,
  observaciones: '',
  reparacionesAprobadas: ['reponer_tejas'],
  reparacionesDescartadas: [],
  recomendacionesAdicionales: [],
  firmada: true,
})

describe('fusión de dos versiones de la misma vivienda', () => {
  it('por defecto gana la modificada más recientemente', () => {
    const vieja = vivienda({ actualizadaEn: '2026-08-12T10:00:00.000Z', notas: { a: 'vieja' } })
    const nueva = vivienda({ actualizadaEn: '2026-08-13T10:00:00.000Z', notas: { a: 'nueva' } })
    expect(fusionarVivienda(vieja, nueva).notas.a).toBe('nueva')
    expect(fusionarVivienda(nueva, vieja).notas.a).toBe('nueva')
  })

  it('si dos profesionales tomaron el mismo caso, gana quien lo tomó primero', () => {
    const primera = vivienda({
      actualizadaEn: '2026-08-13T09:00:00.000Z',
      asignacion: asignacion('ing-a', '2026-08-13T08:00:00.000Z'),
    })
    const segunda = vivienda({
      actualizadaEn: '2026-08-13T18:00:00.000Z',
      asignacion: asignacion('ing-b', '2026-08-13T12:00:00.000Z'),
    })
    // Aunque la de ing-b es la versión más reciente, no le quita el caso a ing-a.
    expect(fusionarVivienda(primera, segunda).asignacion?.profesionalId).toBe('ing-a')
    expect(fusionarVivienda(segunda, primera).asignacion?.profesionalId).toBe('ing-a')
  })

  it('conserva la asignación aunque el otro lado no la tenga', () => {
    const sinTomar = vivienda({ actualizadaEn: '2026-08-14T10:00:00.000Z' })
    const tomada = vivienda({
      actualizadaEn: '2026-08-13T10:00:00.000Z',
      asignacion: asignacion('ing-a', '2026-08-13T08:00:00.000Z'),
    })
    expect(fusionarVivienda(sinTomar, tomada).asignacion?.profesionalId).toBe('ing-a')
  })

  it('una revisión firmada nunca la pisa una versión sin firmar', () => {
    const firmada = vivienda({
      actualizadaEn: '2026-08-13T10:00:00.000Z',
      estado: 'revisada',
      revision: revisionFirmada('Ing. Pérez'),
    })
    const posteriorSinFirmar = vivienda({ actualizadaEn: '2026-08-14T10:00:00.000Z' })

    const resultado = fusionarVivienda(firmada, posteriorSinFirmar)
    expect(resultado.revision?.firmada).toBe(true)
    expect(resultado.revision?.profesionalNombre).toBe('Ing. Pérez')
    expect(resultado.estado).toBe('revisada')
  })

  it('entre dos firmadas se queda con la más reciente', () => {
    const a = vivienda({ actualizadaEn: '2026-08-13T10:00:00.000Z', revision: revisionFirmada('Ing. A') })
    const b = vivienda({ actualizadaEn: '2026-08-14T10:00:00.000Z', revision: revisionFirmada('Ing. B') })
    expect(fusionarVivienda(a, b).revision?.profesionalNombre).toBe('Ing. B')
  })

  it('es conmutativa: el orden de importación no cambia el resultado', () => {
    const a = vivienda({
      actualizadaEn: '2026-08-13T10:00:00.000Z',
      asignacion: asignacion('ing-a', '2026-08-13T08:00:00.000Z'),
      revision: revisionFirmada('Ing. A'),
      estado: 'revisada',
    })
    const b = vivienda({
      actualizadaEn: '2026-08-14T10:00:00.000Z',
      asignacion: asignacion('ing-b', '2026-08-13T12:00:00.000Z'),
    })
    expect(fusionarVivienda(a, b)).toEqual(fusionarVivienda(b, a))
  })
})
