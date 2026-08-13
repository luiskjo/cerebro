import { useState } from 'react'
import { DIBUJOS } from './diagramas/catalogo'

/**
 * Muestra un dibujo explicativo. En campo la pantalla es chica y hay sol, asi
 * que cualquier dibujo se puede abrir a pantalla completa con un toque.
 */
export function Dibujo({ id, titulo }: { id?: string; titulo?: string }) {
  const [ampliado, setAmpliado] = useState(false)
  if (!id) return null
  const Componente = DIBUJOS[id]
  if (!Componente) return null

  return (
    <>
      <figure className="dibujo-caja">
        <button
          type="button"
          className="dibujo-boton"
          onClick={() => setAmpliado(true)}
          aria-label={`Ampliar dibujo${titulo ? `: ${titulo}` : ''}`}
        >
          <Componente />
          <span className="dibujo-lupa" aria-hidden="true">⤢ Ampliar</span>
        </button>
      </figure>

      {ampliado && (
        <div className="modal" role="dialog" aria-modal="true" onClick={() => setAmpliado(false)}>
          <div className="modal-contenido" onClick={(e) => e.stopPropagation()}>
            <Componente />
            <button type="button" className="btn btn-principal ancho" onClick={() => setAmpliado(false)}>
              Cerrar
            </button>
          </div>
        </div>
      )}
    </>
  )
}
