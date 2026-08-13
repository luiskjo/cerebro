import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { EstadoVivienda, Revision, ValorRespuesta, Vivienda } from './tipos'
import {
  guardarPerfil,
  guardarViviendas,
  leerPerfil,
  leerViviendas,
  nuevoId,
  type Perfil,
} from './almacenamiento'

interface Contexto {
  viviendas: Vivienda[]
  perfil: Perfil
  actualizarPerfil: (p: Perfil) => void
  crearVivienda: (datos: Partial<Vivienda['identificacion']>) => Vivienda
  obtener: (id: string) => Vivienda | undefined
  responder: (id: string, preguntaId: string, valor: ValorRespuesta) => void
  anotar: (id: string, preguntaId: string, nota: string) => void
  actualizar: (id: string, cambios: Partial<Vivienda>) => void
  marcarSeccion: (id: string, seccionId: string, completa: boolean) => void
  cambiarEstado: (id: string, estado: EstadoVivienda) => void
  guardarRevision: (id: string, revision: Revision) => void
  eliminar: (id: string) => void
  reemplazarTodo: (viviendas: Vivienda[]) => void
}

const ContextoApp = createContext<Contexto | null>(null)

function consecutivo(existentes: Vivienda[]): string {
  const n = existentes.length + 1
  return `CF-${String(n).padStart(4, '0')}`
}

export function ProveedorApp({ children }: { children: ReactNode }) {
  const [viviendas, setViviendas] = useState<Vivienda[]>(() => leerViviendas())
  const [perfil, setPerfil] = useState<Perfil>(() => leerPerfil())

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
      perfil,
      actualizarPerfil: (p) => {
        setPerfil(p)
        guardarPerfil(p)
      },
      crearVivienda: (datos) => {
        const ahora = new Date().toISOString()
        const vivienda: Vivienda = {
          id: nuevoId(),
          estado: 'borrador',
          identificacion: {
            codigo: consecutivo(viviendas),
            municipio: perfil.municipio,
            veredaBarrio: '',
            direccion: '',
            responsableNombre: '',
            responsableTelefono: '',
            personas: 0,
            personasVulnerables: 0,
            voluntarioNombre: perfil.nombre,
            voluntarioTelefono: perfil.telefono,
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
        mutar(id, (v) => ({
          ...v,
          revision,
          estado: revision.firmada ? 'revisada' : 'en_revision',
        })),
      eliminar: (id) => setViviendas((prev) => prev.filter((v) => v.id !== id)),
      reemplazarTodo: (nuevas) => setViviendas(nuevas),
    }),
    [viviendas, perfil, mutar],
  )

  return <ContextoApp.Provider value={valor}>{children}</ContextoApp.Provider>
}

export function useApp(): Contexto {
  const ctx = useContext(ContextoApp)
  if (!ctx) throw new Error('useApp debe usarse dentro de ProveedorApp')
  return ctx
}
