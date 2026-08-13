import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { EstadoVivienda, Revision, Usuario, ValorRespuesta, Vivienda } from './tipos'
import {
  borrarSesion,
  guardarSesion,
  guardarViviendas,
  leerSesion,
  leerViviendas,
  nuevoId,
} from './almacenamiento'

interface Contexto {
  viviendas: Vivienda[]
  /** null = nadie ha iniciado sesión en este dispositivo. */
  usuario: Usuario | null
  iniciarSesion: (datos: Omit<Usuario, 'id' | 'creadoEn'> & { id?: string }) => Usuario
  cerrarSesion: () => void
  crearVivienda: (datos: Partial<Vivienda['identificacion']>) => Vivienda
  obtener: (id: string) => Vivienda | undefined
  responder: (id: string, preguntaId: string, valor: ValorRespuesta) => void
  anotar: (id: string, preguntaId: string, nota: string) => void
  actualizar: (id: string, cambios: Partial<Vivienda>) => void
  marcarSeccion: (id: string, seccionId: string, completa: boolean) => void
  cambiarEstado: (id: string, estado: EstadoVivienda) => void
  guardarRevision: (id: string, revision: Revision) => void
  tomarCaso: (id: string) => void
  liberarCaso: (id: string) => void
  eliminar: (id: string) => void
  reemplazarTodo: (viviendas: Vivienda[]) => void
}

const ContextoApp = createContext<Contexto | null>(null)

function consecutivo(existentes: Vivienda[]): string {
  return `CF-${String(existentes.length + 1).padStart(4, '0')}`
}

export function ProveedorApp({ children }: { children: ReactNode }) {
  const [viviendas, setViviendas] = useState<Vivienda[]>(() => leerViviendas())
  const [usuario, setUsuario] = useState<Usuario | null>(() => leerSesion())

  useEffect(() => {
    guardarViviendas(viviendas)
  }, [viviendas])

  const mutar = useCallback((id: string, fn: (v: Vivienda) => Vivienda) => {
    setViviendas((prev) =>
      prev.map((v) => (v.id === id ? { ...fn(v), actualizadaEn: new Date().toISOString() } : v)),
    )
  }, [])

  const valor = useMemo<Contexto>(
    () => ({
      viviendas,
      usuario,

      iniciarSesion: (datos) => {
        const sesion: Usuario = {
          ...datos,
          id: datos.id ?? nuevoId('u'),
          creadoEn: new Date().toISOString(),
        }
        setUsuario(sesion)
        guardarSesion(sesion)
        return sesion
      },

      cerrarSesion: () => {
        setUsuario(null)
        borrarSesion()
      },

      crearVivienda: (datos) => {
        const ahora = new Date().toISOString()
        const vivienda: Vivienda = {
          id: nuevoId(),
          estado: 'borrador',
          identificacion: {
            codigo: consecutivo(viviendas),
            municipio: usuario?.municipio ?? '',
            veredaBarrio: '',
            direccion: '',
            responsableNombre: '',
            responsableTelefono: '',
            personas: 0,
            personasVulnerables: 0,
            voluntarioId: usuario?.id,
            voluntarioNombre: usuario?.nombre ?? '',
            voluntarioTelefono: usuario?.telefono ?? '',
            fecha: ahora.slice(0, 10),
            ...datos,
          },
          respuestas: {},
          notas: {},
          fotos: [],
          seccionesCompletas: [],
          creadaEn: ahora,
          actualizadaEn: ahora,
        }
        setViviendas((prev) => [vivienda, ...prev])
        return vivienda
      },

      obtener: (id) => viviendas.find((v) => v.id === id),
      responder: (id, preguntaId, val) =>
        mutar(id, (v) => ({ ...v, respuestas: { ...v.respuestas, [preguntaId]: val } })),
      anotar: (id, preguntaId, nota) => mutar(id, (v) => ({ ...v, notas: { ...v.notas, [preguntaId]: nota } })),
      actualizar: (id, cambios) => mutar(id, (v) => ({ ...v, ...cambios })),
      marcarSeccion: (id, seccionId, completa) =>
        mutar(id, (v) => ({
          ...v,
          seccionesCompletas: completa
            ? [...new Set([...v.seccionesCompletas, seccionId])]
            : v.seccionesCompletas.filter((s) => s !== seccionId),
        })),
      cambiarEstado: (id, estado) => mutar(id, (v) => ({ ...v, estado })),
      guardarRevision: (id, revision) =>
        mutar(id, (v) => ({ ...v, revision, estado: revision.firmada ? 'revisada' : 'en_revision' })),

      tomarCaso: (id) =>
        mutar(id, (v) => {
          // Si ya lo tomó alguien, no se le quita: la bolsa es por orden de llegada.
          if (v.asignacion || !usuario) return v
          return {
            ...v,
            estado: 'en_revision',
            asignacion: {
              profesionalId: usuario.id,
              profesionalNombre: usuario.nombre,
              profesionalMatricula: usuario.matricula,
              tomadaEn: new Date().toISOString(),
            },
          }
        }),

      liberarCaso: (id) =>
        mutar(id, (v) => {
          // Una revisión firmada ya no se libera: el caso quedó cerrado.
          if (v.revision?.firmada) return v
          const { asignacion: _liberada, ...resto } = v
          return { ...resto, estado: 'evaluacion_enviada' }
        }),

      eliminar: (id) => setViviendas((prev) => prev.filter((v) => v.id !== id)),
      reemplazarTodo: (nuevas) => setViviendas(nuevas),
    }),
    [viviendas, usuario, mutar],
  )

  return <ContextoApp.Provider value={valor}>{children}</ContextoApp.Provider>
}

export function useApp(): Contexto {
  const ctx = useContext(ContextoApp)
  if (!ctx) throw new Error('useApp debe usarse dentro de ProveedorApp')
  return ctx
}

/** Atajos de consulta que usan varias pantallas. */
export function esMiCaso(v: Vivienda, usuario: Usuario | null): boolean {
  return Boolean(usuario && v.asignacion?.profesionalId === usuario.id)
}

export function estaDisponible(v: Vivienda): boolean {
  return !v.asignacion && v.estado === 'evaluacion_enviada'
}
