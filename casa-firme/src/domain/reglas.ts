import type {
  Componente,
  Diagnostico,
  Habitabilidad,
  Pregunta,
  Respuestas,
  ResultadoComponente,
  Severidad,
} from '../lib/tipos'
import { preguntasVisibles, seccionesVisibles } from './checklist'

/**
 * Convierte las respuestas en una severidad por pregunta.
 *
 * - Preguntas de opcion: la severidad de la opcion elegida (la mayor, si es multiple).
 * - Preguntas numericas con escala: el primer tramo cuyo tope no se supera.
 * - si_no: "si" vale 2 por defecto; son preguntas de alerta, no de medida fina.
 */
export function severidadDeRespuesta(
  pregunta: Pregunta,
  valor: unknown,
): { severidad: Severidad; banderaRoja: boolean; etiqueta?: string } {
  if (valor === undefined || valor === null || valor === '') {
    return { severidad: 0, banderaRoja: false }
  }

  if (pregunta.tipo === 'si_no') {
    return { severidad: valor === true ? 2 : 0, banderaRoja: false, etiqueta: valor === true ? 'Sí' : 'No' }
  }

  if (pregunta.tipo === 'numero') {
    const n = typeof valor === 'number' ? valor : Number(valor)
    if (!Number.isFinite(n) || !pregunta.escala) return { severidad: 0, banderaRoja: false }
    for (const tramo of pregunta.escala) {
      if (n <= tramo.hasta) {
        return {
          severidad: tramo.severidad,
          banderaRoja: Boolean(tramo.banderaRoja),
          etiqueta: `${n} ${pregunta.unidad ?? ''}`.trim(),
        }
      }
    }
    const ultimo = pregunta.escala[pregunta.escala.length - 1]
    return { severidad: ultimo.severidad, banderaRoja: Boolean(ultimo.banderaRoja) }
  }

  if (!pregunta.opciones) return { severidad: 0, banderaRoja: false }

  const elegidos = Array.isArray(valor) ? valor.map(String) : [String(valor)]
  let severidad: Severidad = 0
  let banderaRoja = false
  let etiqueta: string | undefined
  for (const v of elegidos) {
    const opcion = pregunta.opciones.find((o) => o.valor === v)
    if (!opcion) continue
    if (opcion.severidad > severidad) {
      severidad = opcion.severidad
      etiqueta = opcion.etiqueta
    }
    if (opcion.banderaRoja) banderaRoja = true
  }
  return { severidad, banderaRoja, etiqueta }
}

const ORDEN_COMPONENTES: Componente[] = [
  'terreno',
  'cimentacion',
  'muros',
  'entrepiso',
  'cubierta',
  'noEstructural',
  'redes',
]

export function calcularDiagnostico(respuestas: Respuestas): Diagnostico {
  const acumulado = new Map<Componente, { severidad: Severidad; hallazgos: string[]; conteoModerado: number }>()
  const banderasRojas: string[] = []
  const pendientes: string[] = []
  let visibles = 0
  let respondidas = 0

  for (const seccion of seccionesVisibles(respuestas)) {
    for (const pregunta of preguntasVisibles(seccion, respuestas)) {
      visibles += 1
      const valor = respuestas[pregunta.id]
      const contestada =
        valor !== undefined && valor !== null && valor !== '' && !(Array.isArray(valor) && valor.length === 0)
      if (contestada) respondidas += 1
      else if (pregunta.obligatoria) pendientes.push(`${seccion.titulo}: ${pregunta.titulo}`)

      if (!contestada || pregunta.soloMedicion || !pregunta.componente) continue

      const { severidad, banderaRoja, etiqueta } = severidadDeRespuesta(pregunta, valor)
      const previo = acumulado.get(pregunta.componente) ?? {
        severidad: 0 as Severidad,
        hallazgos: [],
        conteoModerado: 0,
      }
      if (severidad >= 1 && etiqueta) {
        previo.hallazgos.push(`${pregunta.titulo} → ${etiqueta}`)
      }
      if (severidad >= 2) previo.conteoModerado += 1
      if (severidad > previo.severidad) previo.severidad = severidad
      acumulado.set(pregunta.componente, previo)

      if (banderaRoja) {
        banderasRojas.push(`${pregunta.titulo}${etiqueta ? ` → ${etiqueta}` : ''}`)
      }
    }
  }

  const porComponente: ResultadoComponente[] = ORDEN_COMPONENTES.filter((c) => acumulado.has(c)).map((c) => {
    const dato = acumulado.get(c)!
    // Varios hallazgos moderados en un mismo componente suman un grado: tres
    // muros con grietas medias son peores que uno solo. El grado 4 se reserva
    // para lo que se observo directamente, nunca se llega ahi por acumulacion.
    let severidad = dato.severidad
    if (dato.conteoModerado >= 3 && severidad < 3) {
      severidad = (severidad + 1) as Severidad
    }
    return { componente: c, severidad, hallazgos: dato.hallazgos }
  })

  const severidadGlobal = combinarSeveridades(porComponente)
  const habitabilidadSugerida = clasificarHabitabilidad(severidadGlobal, banderasRojas.length > 0)

  return {
    severidadGlobal,
    habitabilidadSugerida,
    banderasRojas,
    porComponente,
    completitud: visibles === 0 ? 0 : Math.round((respondidas / visibles) * 100),
    preguntasPendientes: pendientes,
  }
}

const ESTRUCTURALES: Componente[] = ['terreno', 'cimentacion', 'muros', 'entrepiso', 'cubierta']

/**
 * El grado global lo manda el peor componente estructural. El dano repartido
 * por varias partes de la casa lo sube un grado, pero nunca hasta 4: ese grado
 * exige haber visto algo de grado 4 en un componente concreto.
 *
 * Un dano solo en elementos no estructurales o en redes no puede llevar la
 * casa mas alla de "dano moderado": es peligroso, pero no compromete la
 * estabilidad.
 */
function combinarSeveridades(porComponente: ResultadoComponente[]): Severidad {
  if (porComponente.length === 0) return 0

  const estructurales = porComponente.filter((c) => ESTRUCTURALES.includes(c.componente))
  const maxEstructural = Math.max(0, ...estructurales.map((c) => c.severidad))
  const maxOtros = Math.max(0, ...porComponente.filter((c) => !ESTRUCTURALES.includes(c.componente)).map((c) => c.severidad))

  if (maxEstructural === 0) return Math.min(2, maxOtros) as Severidad

  const componentesAfectados = estructurales.filter((c) => c.severidad >= 2).length
  const subeUnGrado = componentesAfectados >= 2 && maxEstructural < 3
  const global = subeUnGrado ? maxEstructural + 1 : maxEstructural

  return Math.max(0, Math.min(4, global)) as Severidad
}

export function clasificarHabitabilidad(severidad: Severidad, hayBanderaRoja: boolean): Habitabilidad {
  if (hayBanderaRoja || severidad >= 4) return 'rojo'
  if (severidad >= 2) return 'amarillo'
  return 'verde'
}

/** Texto corto para explicarle a la familia por que quedo en ese color. */
export function explicarSemaforo(d: Diagnostico): string {
  if (d.habitabilidadSugerida === 'rojo') {
    return d.banderasRojas.length > 0
      ? `Se encontró al menos una condición de peligro grave: ${d.banderasRojas[0]}.`
      : 'El nivel de daño encontrado es muy alto.'
  }
  if (d.habitabilidadSugerida === 'amarillo') {
    const peor = [...d.porComponente].sort((a, b) => b.severidad - a.severidad)[0]
    return peor
      ? `El daño más importante está en: ${peor.componente}. Requiere reparación antes de volver a usar la casa con normalidad.`
      : 'Hay daños moderados que deben repararse.'
  }
  return 'No se encontraron daños que comprometan la seguridad de la vivienda.'
}
