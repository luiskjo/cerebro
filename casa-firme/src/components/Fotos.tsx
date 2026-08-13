import { useEffect, useState } from 'react'
import type { Foto } from '../lib/tipos'
import { borrarFoto, comprimirImagen, guardarFoto, leerFoto, nuevoId } from '../lib/almacenamiento'

function Miniatura({ foto, onBorrar }: { foto: Foto; onBorrar: () => void }) {
  const [src, setSrc] = useState<string>()

  useEffect(() => {
    let vivo = true
    leerFoto(foto.clave).then((d) => {
      if (vivo) setSrc(d)
    })
    return () => {
      vivo = false
    }
  }, [foto.clave])

  return (
    <figure className="foto-mini">
      {src ? <img src={src} alt={foto.descripcion || 'Foto de la vivienda'} /> : <div className="foto-vacia">…</div>}
      <figcaption>{foto.descripcion || 'Sin descripción'}</figcaption>
      <button type="button" className="btn btn-texto peligro" onClick={onBorrar}>
        Borrar
      </button>
    </figure>
  )
}

export function Fotos({
  fotos,
  preguntaId,
  onAgregar,
  onQuitar,
}: {
  fotos: Foto[]
  preguntaId: string
  onAgregar: (foto: Foto) => void
  onQuitar: (foto: Foto) => void
}) {
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string>()

  async function manejarArchivos(lista: FileList | null) {
    if (!lista?.length) return
    setCargando(true)
    setError(undefined)
    try {
      for (const archivo of Array.from(lista)) {
        if (!archivo.type.startsWith('image/')) continue
        const dataUrl = await comprimirImagen(archivo)
        const clave = nuevoId('f')
        await guardarFoto(clave, dataUrl)
        onAgregar({
          id: clave,
          preguntaId,
          clave,
          descripcion: '',
          creadaEn: new Date().toISOString(),
        })
      }
    } catch {
      setError('No se pudo guardar alguna foto. Intenta de nuevo.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="fotos">
      <label className="btn btn-secundario">
        {cargando ? 'Guardando…' : '📷 Tomar o elegir foto'}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          hidden
          onChange={(e) => {
            void manejarArchivos(e.target.files)
            e.target.value = ''
          }}
        />
      </label>
      {error && <p className="aviso aviso-peligro">{error}</p>}
      {fotos.length > 0 && (
        <div className="fotos-grid">
          {fotos.map((f) => (
            <Miniatura
              key={f.id}
              foto={f}
              onBorrar={() => {
                void borrarFoto(f.clave)
                onQuitar(f)
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
