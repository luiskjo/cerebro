import type { Diagnostico, Vivienda } from '../lib/tipos'
import {
  buscarReparacion,
  sugerirReparaciones,
  type Material,
  type Prioridad,
  type Reparacion,
  type Medida,
} from './reparaciones'

export interface ItemPlan {
  reparacion: Reparacion
  medida: Medida
  materiales: Material[]
  jornales: number
}

export interface EtapaPlan {
  prioridad: Prioridad
  titulo: string
  descripcion: string
  items: ItemPlan[]
}

export interface Plan {
  etapas: EtapaPlan[]
  listaCompras: Material[]
  jornalesTotales: number
  advertencias: string[]
  generadoEn: string
}

const DESCRIPCION_ETAPA: Record<Prioridad, { titulo: string; descripcion: string }> = {
  1: {
    titulo: 'Etapa 1 — Poner la casa y a la gente fuera de peligro',
    descripcion:
      'Esto se hace primero, siempre, antes de comprar un solo bulto de cemento. No repara la casa: evita que alguien se lastime y que el daño siga creciendo.',
  },
  2: {
    titulo: 'Etapa 2 — Reparar el daño',
    descripcion:
      'Devolverle a la casa lo que perdió en el sismo. Se hace en el orden que aparece: de abajo hacia arriba y de la estructura hacia los acabados.',
  },
  3: {
    titulo: 'Etapa 3 — Dejarla mejor de como estaba',
    descripcion:
      'Mejoras que cuestan poco y evitan que el próximo sismo o el próximo invierno vuelvan a dañar la casa. Si hay presupuesto, valen mucho la pena.',
  },
}

export function generarPlan(vivienda: Vivienda, diagnostico: Diagnostico): Plan {
  const revision = vivienda.revision
  const sugeridas = sugerirReparaciones(vivienda.respuestas, diagnostico)

  let seleccionadas: Reparacion[]
  if (revision?.firmada) {
    const aprobadas = revision.reparacionesAprobadas
      .map(buscarReparacion)
      .filter((x): x is Reparacion => Boolean(x))
    seleccionadas = aprobadas
  } else {
    seleccionadas = sugeridas
  }

  const items: ItemPlan[] = seleccionadas.map((reparacion) => {
    const medida = reparacion.medir(vivienda.respuestas)
    return {
      reparacion,
      medida,
      materiales: reparacion.materiales(medida).filter((m) => m.cantidad > 0),
      jornales: reparacion.jornales ? Math.round(reparacion.jornales(medida) * 10) / 10 : 0,
    }
  })

  const etapas: EtapaPlan[] = ([1, 2, 3] as Prioridad[])
    .map((p) => ({
      prioridad: p,
      ...DESCRIPCION_ETAPA[p],
      items: items.filter((i) => i.reparacion.prioridad === p),
    }))
    .filter((e) => e.items.length > 0)

  return {
    etapas,
    listaCompras: consolidarMateriales(items),
    jornalesTotales: Math.round(items.reduce((s, i) => s + i.jornales, 0) * 10) / 10,
    advertencias: construirAdvertencias(vivienda, diagnostico, items),
    generadoEn: new Date().toISOString(),
  }
}

/** Suma materiales iguales (mismo nombre y unidad) de todas las reparaciones. */
export function consolidarMateriales(items: ItemPlan[]): Material[] {
  const mapa = new Map<string, Material>()
  for (const item of items) {
    for (const mat of item.materiales) {
      const clave = `${mat.nombre}|${mat.unidad}`
      const previo = mapa.get(clave)
      if (previo) {
        previo.cantidad = Math.round((previo.cantidad + mat.cantidad) * 100) / 100
        if (mat.nota && !previo.nota?.includes(mat.nota)) {
          previo.nota = previo.nota ? `${previo.nota}. ${mat.nota}` : mat.nota
        }
      } else {
        mapa.set(clave, { ...mat })
      }
    }
  }
  return [...mapa.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
}

function construirAdvertencias(vivienda: Vivienda, diagnostico: Diagnostico, items: ItemPlan[]): string[] {
  const avisos: string[] = []

  if (!vivienda.revision?.firmada) {
    avisos.push(
      'Este plan es una PROPUESTA generada automáticamente. No se puede ejecutar hasta que un ingeniero o arquitecto lo revise y lo firme.',
    )
  }

  if (diagnostico.habitabilidadSugerida === 'rojo') {
    avisos.push(
      'La vivienda está clasificada como NO HABITABLE. Solo se pueden ejecutar las obras de la Etapa 1, y únicamente con personal capacitado.',
    )
  }

  if (items.some((i) => i.reparacion.id === 'estudio_terreno')) {
    avisos.push(
      'Hay señales de problemas en el terreno. No inviertas en reparaciones definitivas hasta tener el concepto sobre el terreno: la casa se volvería a rajar.',
    )
  }

  if (items.some((i) => i.reparacion.quienLoHace === 'profesional')) {
    avisos.push(
      'Hay obras que debe diseñar y dirigir un profesional. Los voluntarios pueden apoyar la ejecución, nunca decidir el diseño.',
    )
  }

  avisos.push(
    'Las cantidades son estimadas para presupuestar y comprar. Verifícalas en obra antes de pedir el material.',
  )

  return avisos
}

/** Comparacion entre lo que sugirio el sistema y lo que aprobo el profesional. */
export function diferenciasConSugerencia(vivienda: Vivienda, diagnostico: Diagnostico) {
  const sugeridas = sugerirReparaciones(vivienda.respuestas, diagnostico).map((r) => r.id)
  const aprobadas = vivienda.revision?.reparacionesAprobadas ?? []
  return {
    agregadasPorProfesional: aprobadas.filter((id) => !sugeridas.includes(id)),
    descartadasPorProfesional: sugeridas.filter((id) => !aprobadas.includes(id)),
  }
}
