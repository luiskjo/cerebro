/**
 * Modelo de datos de Casa Firme.
 *
 * Todo el vocabulario del dominio esta en espanol porque lo leen y lo mantienen
 * arquitectos e ingenieros en Colombia. La severidad 0-4 sigue la escala de
 * grados de dano de la EMS-98 (0 = sin dano, 4 = dano muy grave / colapso
 * parcial), que es la que usan los formatos de evaluacion post-sismo de la AIS.
 */

export type Severidad = 0 | 1 | 2 | 3 | 4

export const ETIQUETA_SEVERIDAD: Record<Severidad, string> = {
  0: 'Sin daño',
  1: 'Daño leve',
  2: 'Daño moderado',
  3: 'Daño fuerte',
  4: 'Daño muy grave',
}

/** Partes de la casa que se califican por separado. */
export type Componente =
  | 'terreno'
  | 'cimentacion'
  | 'muros'
  | 'entrepiso'
  | 'cubierta'
  | 'noEstructural'
  | 'redes'

export const ETIQUETA_COMPONENTE: Record<Componente, string> = {
  terreno: 'Terreno y entorno',
  cimentacion: 'Cimentación',
  muros: 'Muros',
  entrepiso: 'Entrepiso',
  cubierta: 'Cubierta',
  noEstructural: 'Elementos no estructurales',
  redes: 'Redes (agua, luz, gas)',
}

/** Semaforo de habitabilidad. Equivale a los avisos verde/amarillo/rojo del ATC-20. */
export type Habitabilidad = 'verde' | 'amarillo' | 'rojo'

export const ETIQUETA_HABITABILIDAD: Record<Habitabilidad, string> = {
  verde: 'Habitable',
  amarillo: 'Uso restringido',
  rojo: 'No habitable',
}

export const DESCRIPCION_HABITABILIDAD: Record<Habitabilidad, string> = {
  verde:
    'No se encontraron daños que impidan vivir en la casa. Puede requerir reparaciones menores.',
  amarillo:
    'La casa tiene daños importantes. Solo se puede entrar por tiempo corto y a las zonas seguras, hasta que un profesional la revise y se hagan las reparaciones.',
  rojo:
    'La casa no es segura para vivir ni para entrar. Hay que desalojar, señalizar y esperar la revisión de un ingeniero.',
}

export type TipoPregunta =
  | 'unica'
  | 'multiple'
  | 'numero'
  | 'texto'
  | 'si_no'
  | 'fotos'

export interface Opcion {
  valor: string
  etiqueta: string
  /** Frase corta que describe que se ve en campo. */
  detalle?: string
  severidad: Severidad
  /** Si es true, por si sola obliga a clasificar la vivienda como NO HABITABLE. */
  banderaRoja?: boolean
  dibujo?: string
}

/** Tramo de una escala numerica: si el valor es <= hasta, aplica esta severidad. */
export interface TramoEscala {
  hasta: number
  severidad: Severidad
  banderaRoja?: boolean
}

export interface Pregunta {
  id: string
  titulo: string
  /** Que debe mirar el voluntario. */
  ayuda?: string
  /** Como se mide o se verifica, paso a paso. */
  comoMedir?: string
  tipo: TipoPregunta
  unidad?: string
  min?: number
  max?: number
  opciones?: Opcion[]
  /** Identificador del dibujo explicativo que acompana la pregunta. */
  dibujo?: string
  componente?: Componente
  /** Se pide foto de respaldo cuando la respuesta tiene severidad >= 2. */
  fotoSugerida?: boolean
  obligatoria?: boolean
  escala?: TramoEscala[]
  /** Solo se muestra si esta funcion devuelve true. */
  visibleSi?: (r: Respuestas) => boolean
  /** Marca preguntas que se usan solo para calcular cantidades de obra. */
  soloMedicion?: boolean
}

export interface Seccion {
  id: string
  titulo: string
  subtitulo?: string
  intro?: string
  /** Corta la evaluacion si se detecta peligro inmediato. */
  esFiltroDeSeguridad?: boolean
  preguntas: Pregunta[]
}

export type ValorRespuesta = string | string[] | number | boolean | null

export type Respuestas = Record<string, ValorRespuesta>

export interface Foto {
  id: string
  preguntaId: string
  /** Clave del blob en IndexedDB. */
  clave: string
  descripcion: string
  creadaEn: string
}

export type EstadoVivienda =
  | 'borrador'
  | 'evaluacion_enviada'
  | 'en_revision'
  | 'revisada'
  | 'plan_listo'

export const ETIQUETA_ESTADO: Record<EstadoVivienda, string> = {
  borrador: 'Evaluación en curso',
  evaluacion_enviada: 'Esperando revisión profesional',
  en_revision: 'En revisión profesional',
  revisada: 'Revisada — falta generar plan',
  plan_listo: 'Plan de acción listo',
}

export type Rol = 'voluntario' | 'profesional'

export const ETIQUETA_ROL: Record<Rol, string> = {
  voluntario: 'Voluntario en campo',
  profesional: 'Ingeniero / arquitecto',
}

/**
 * Quien esta usando la app en este dispositivo.
 *
 * No es autenticacion: la app no tiene servidor y no puede verificar a nadie.
 * Es una identificacion de equipo, que sirve para firmar el trabajo y para
 * saber quien tomo cada caso. La verificacion de que alguien es de verdad
 * ingeniero la hace el coordinador de la brigada, por fuera.
 */
export interface Usuario {
  id: string
  nombre: string
  telefono: string
  rol: Rol
  municipio: string
  /** Solo para profesionales. */
  matricula?: string
  profesion?: string
  creadoEn: string
}

/** Un profesional se asigna a si mismo un caso de la bolsa. */
export interface Asignacion {
  profesionalId: string
  profesionalNombre: string
  profesionalMatricula?: string
  tomadaEn: string
}

export interface Identificacion {
  codigo: string
  municipio: string
  veredaBarrio: string
  direccion: string
  puntoGps?: { lat: number; lon: number; precision?: number }
  responsableNombre: string
  responsableTelefono: string
  personas: number
  personasVulnerables: number
  voluntarioId?: string
  voluntarioNombre: string
  voluntarioTelefono: string
  fecha: string
}

/** Revision del ingeniero o arquitecto. */
export interface Revision {
  profesionalNombre: string
  profesionalMatricula: string
  fecha: string
  /** El profesional puede confirmar o cambiar el semaforo calculado. */
  habitabilidadFinal: Habitabilidad
  justificacion: string
  requiereVisitaProfesional: boolean
  requiereEstudioDetallado: boolean
  observaciones: string
  /** Ids del catalogo de reparaciones aprobados para el plan. */
  reparacionesAprobadas: string[]
  /** Reparaciones sugeridas por el sistema que el profesional descarto. */
  reparacionesDescartadas: string[]
  recomendacionesAdicionales: string[]
  firmada: boolean
}

export interface Vivienda {
  id: string
  estado: EstadoVivienda
  identificacion: Identificacion
  respuestas: Respuestas
  notas: Record<string, string>
  fotos: Foto[]
  /** Profesional que tomo el caso. Sin esto, nadie puede firmar la revision. */
  asignacion?: Asignacion
  /** Ids de secciones que el voluntario ya marco como terminadas. */
  seccionesCompletas: string[]
  revision?: Revision
  creadaEn: string
  actualizadaEn: string
  /** Se congela al generar el plan para que la obra no cambie sola. */
  planGeneradoEn?: string
}

export interface ResultadoComponente {
  componente: Componente
  severidad: Severidad
  hallazgos: string[]
}

export interface Diagnostico {
  severidadGlobal: Severidad
  habitabilidadSugerida: Habitabilidad
  banderasRojas: string[]
  porComponente: ResultadoComponente[]
  /** Porcentaje de preguntas visibles ya respondidas. */
  completitud: number
  preguntasPendientes: string[]
}
