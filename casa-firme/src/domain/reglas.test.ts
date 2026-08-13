import { describe, expect, it } from 'vitest'
import { calcularDiagnostico, clasificarHabitabilidad, severidadDeRespuesta } from './reglas'
import { buscarPregunta } from './checklist'
import type { Respuestas } from '../lib/tipos'

/** Base minima: casa de un piso en ladrillo sin confinar, sin danos. */
const BASE: Respuestas = {
  peligro_colapso: 'no',
  peligro_inclinacion: false,
  peligro_servicios: ['ninguno'],
  peligro_vecino: false,
  material_muros: ['ladrillo_confinado'],
  numero_pisos: 1,
  material_cubierta: 'guadua',
  material_teja: 'zinc',
  medida_area: 60,
}

describe('severidad de una respuesta', () => {
  it('toma la severidad de la opción elegida', () => {
    const p = buscarPregunta('mamp_grietas_diagonales')!
    expect(severidadDeRespuesta(p, 'ninguna').severidad).toBe(0)
    expect(severidadDeRespuesta(p, 'media').severidad).toBe(2)
    expect(severidadDeRespuesta(p, 'ancha').severidad).toBe(3)
  })

  it('marca bandera roja en las opciones críticas', () => {
    const p = buscarPregunta('mamp_grietas_diagonales')!
    expect(severidadDeRespuesta(p, 'desplazada').banderaRoja).toBe(true)
    expect(severidadDeRespuesta(p, 'media').banderaRoja).toBe(false)
  })

  it('en preguntas de varias opciones se queda con la peor', () => {
    const p = buscarPregunta('bah_estructura')!
    expect(severidadDeRespuesta(p, ['humedad', 'pudricion']).severidad).toBe(4)
  })

  it('convierte números con la escala de tramos', () => {
    const p = buscarPregunta('mamp_desplome')!
    expect(severidadDeRespuesta(p, 0.5).severidad).toBe(0)
    expect(severidadDeRespuesta(p, 3).severidad).toBe(2)
    expect(severidadDeRespuesta(p, 6).severidad).toBe(3)
    expect(severidadDeRespuesta(p, 20).banderaRoja).toBe(true)
  })

  it('no puntúa lo que está sin contestar', () => {
    const p = buscarPregunta('mamp_grietas_diagonales')!
    expect(severidadDeRespuesta(p, null).severidad).toBe(0)
    expect(severidadDeRespuesta(p, undefined).severidad).toBe(0)
  })
})

describe('diagnóstico de la vivienda', () => {
  it('una casa sin daños queda en verde', () => {
    const d = calcularDiagnostico(BASE)
    expect(d.severidadGlobal).toBe(0)
    expect(d.habitabilidadSugerida).toBe('verde')
    expect(d.banderasRojas).toHaveLength(0)
  })

  it('una bandera roja manda la casa a rojo aunque el resto esté sano', () => {
    const d = calcularDiagnostico({ ...BASE, grietas_suelo: 'anchas' })
    expect(d.habitabilidadSugerida).toBe('rojo')
    expect(d.banderasRojas.length).toBeGreaterThan(0)
  })

  it('grietas anchas en los muros dan daño fuerte, no destrucción', () => {
    const d = calcularDiagnostico({
      ...BASE,
      material_muros: ['ladrillo_sin_confinar'],
      mamp_grietas_diagonales: 'ancha',
      mamp_extension_diagonales: 'pocos',
      mamp_grietas_esquina: 'media',
    })
    expect(d.severidadGlobal).toBe(3)
    expect(d.habitabilidadSugerida).toBe('amarillo')
  })

  it('solo se llega a daño muy grave si se observó algo de grado 4', () => {
    const d = calcularDiagnostico({
      ...BASE,
      mamp_grietas_diagonales: 'muy_ancha',
    })
    expect(d.severidadGlobal).toBe(4)
    expect(d.habitabilidadSugerida).toBe('rojo')
  })

  it('el daño repartido en varias partes sube un grado', () => {
    const soloMuros = calcularDiagnostico({ ...BASE, mamp_grietas_diagonales: 'media' })
    const murosYCubierta = calcularDiagnostico({
      ...BASE,
      mamp_grietas_diagonales: 'media',
      cub_tejas: 'bastantes',
    })
    expect(soloMuros.severidadGlobal).toBe(2)
    expect(murosYCubierta.severidadGlobal).toBe(3)
  })

  it('un daño solo en elementos no estructurales no pasa de moderado', () => {
    const d = calcularDiagnostico({ ...BASE, ne_elementos: ['tanque', 'poste'] })
    expect(d.severidadGlobal).toBeLessThanOrEqual(2)
    expect(d.habitabilidadSugerida).not.toBe('rojo')
  })

  it('lista lo que falta por contestar', () => {
    const d = calcularDiagnostico({ material_muros: ['bahareque_encementado'], numero_pisos: 1 })
    expect(d.preguntasPendientes.length).toBeGreaterThan(0)
    expect(d.completitud).toBeLessThan(100)
  })

  it('no cuenta las preguntas de secciones que no aplican', () => {
    const conBahareque = calcularDiagnostico({ ...BASE, material_muros: ['bahareque_encementado'] })
    const soloLadrillo = calcularDiagnostico(BASE)
    const pendientesBahareque = conBahareque.preguntasPendientes.join(' ')
    expect(pendientesBahareque).not.toContain('ladrillo')
    expect(soloLadrillo.preguntasPendientes.join(' ')).not.toContain('bahareque')
  })
})

describe('clasificación de habitabilidad', () => {
  it('sigue el semáforo esperado', () => {
    expect(clasificarHabitabilidad(0, false)).toBe('verde')
    expect(clasificarHabitabilidad(1, false)).toBe('verde')
    expect(clasificarHabitabilidad(2, false)).toBe('amarillo')
    expect(clasificarHabitabilidad(3, false)).toBe('amarillo')
    expect(clasificarHabitabilidad(4, false)).toBe('rojo')
    expect(clasificarHabitabilidad(0, true)).toBe('rojo')
  })
})
