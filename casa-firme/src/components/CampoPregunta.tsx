import { useState } from 'react'
import type { Foto, Pregunta, ValorRespuesta } from '../lib/tipos'
import { severidadDeRespuesta } from '../domain/reglas'
import { Dibujo } from './Dibujo'
import { Fotos } from './Fotos'

interface Props {
  pregunta: Pregunta
  valor: ValorRespuesta
  nota: string
  fotos: Foto[]
  onResponder: (v: ValorRespuesta) => void
  onAnotar: (n: string) => void
  onAgregarFoto: (f: Foto) => void
  onQuitarFoto: (f: Foto) => void
}

export function CampoPregunta({
  pregunta,
  valor,
  nota,
  fotos,
  onResponder,
  onAnotar,
  onAgregarFoto,
  onQuitarFoto,
}: Props) {
  const [verAyuda, setVerAyuda] = useState(false)
  const { severidad } = severidadDeRespuesta(pregunta, valor)
  const respondida = valor !== undefined && valor !== null && valor !== '' && !(Array.isArray(valor) && !valor.length)
  const pedirFoto = pregunta.fotoSugerida && severidad >= 2 && fotos.length === 0

  return (
    <section className={`pregunta ${respondida ? 'respondida' : ''} ${severidad >= 3 ? 'grave' : ''}`}>
      <header className="pregunta-cabeza">
        <h3>
          {pregunta.titulo}
          {pregunta.obligatoria && <span className="obligatoria" title="Obligatoria"> *</span>}
        </h3>
        {pregunta.ayuda && <p className="pregunta-ayuda">{pregunta.ayuda}</p>}
      </header>

      {pregunta.dibujo && <Dibujo id={pregunta.dibujo} titulo={pregunta.titulo} />}

      {pregunta.comoMedir && (
        <div className="como-medir">
          <button type="button" className="btn btn-texto" onClick={() => setVerAyuda((v) => !v)}>
            📏 {verAyuda ? 'Ocultar' : 'Cómo se mide'}
          </button>
          {verAyuda && <p>{pregunta.comoMedir}</p>}
        </div>
      )}

      <Control pregunta={pregunta} valor={valor} onResponder={onResponder} />

      {pedirFoto && (
        <p className="aviso aviso-aviso">
          Este hallazgo es importante. Toma una foto para que el ingeniero pueda verlo.
        </p>
      )}

      {(pregunta.fotoSugerida || pregunta.tipo === 'fotos') && (
        <Fotos fotos={fotos} preguntaId={pregunta.id} onAgregar={onAgregarFoto} onQuitar={onQuitarFoto} />
      )}

      <details className="nota">
        <summary>Agregar una nota{nota ? ' (escrita)' : ''}</summary>
        <textarea
          value={nota}
          rows={3}
          placeholder="Lo que viste y no cabe en las opciones."
          onChange={(e) => onAnotar(e.target.value)}
        />
      </details>
    </section>
  )
}

function Control({
  pregunta,
  valor,
  onResponder,
}: {
  pregunta: Pregunta
  valor: ValorRespuesta
  onResponder: (v: ValorRespuesta) => void
}) {
  if (pregunta.tipo === 'texto') {
    return (
      <textarea
        className="campo"
        rows={3}
        value={typeof valor === 'string' ? valor : ''}
        onChange={(e) => onResponder(e.target.value)}
      />
    )
  }

  if (pregunta.tipo === 'numero') {
    return (
      <div className="campo-numero">
        <input
          type="number"
          inputMode="decimal"
          className="campo"
          min={pregunta.min}
          max={pregunta.max}
          value={typeof valor === 'number' ? valor : ''}
          onChange={(e) => onResponder(e.target.value === '' ? null : Number(e.target.value))}
        />
        {pregunta.unidad && <span className="unidad">{pregunta.unidad}</span>}
      </div>
    )
  }

  if (pregunta.tipo === 'si_no') {
    return (
      <div className="opciones opciones-si-no">
        {[
          { v: false, t: 'No' },
          { v: true, t: 'Sí' },
        ].map((o) => (
          <button
            key={String(o.v)}
            type="button"
            className={`opcion ${valor === o.v ? 'elegida' : ''}`}
            onClick={() => onResponder(o.v)}
          >
            {o.t}
          </button>
        ))}
      </div>
    )
  }

  if (pregunta.tipo === 'fotos') return null

  const multiple = pregunta.tipo === 'multiple'
  const elegidos = multiple ? (Array.isArray(valor) ? valor : []) : valor === null ? [] : [String(valor)]

  function alternar(v: string) {
    if (!multiple) {
      onResponder(v)
      return
    }
    // "Ninguno" o "Nada de eso" son excluyentes: limpian el resto.
    const excluyente = v.startsWith('ningun') || v === 'no' || v === 'buena' || v === 'todos'
    if (excluyente) {
      onResponder(elegidos.includes(v) ? [] : [v])
      return
    }
    const sinExcluyentes = elegidos.filter((x) => !x.startsWith('ningun'))
    onResponder(
      sinExcluyentes.includes(v) ? sinExcluyentes.filter((x) => x !== v) : [...sinExcluyentes, v],
    )
  }

  return (
    <div className="opciones">
      {pregunta.opciones?.map((o) => {
        const activa = elegidos.includes(o.valor)
        return (
          <button
            key={o.valor}
            type="button"
            className={`opcion ${activa ? 'elegida' : ''} sev-${o.severidad}`}
            onClick={() => alternar(o.valor)}
            aria-pressed={activa}
          >
            <span className="opcion-marca" aria-hidden="true">{activa ? '●' : '○'}</span>
            <span className="opcion-cuerpo">
              <span className="opcion-titulo">{o.etiqueta}</span>
              {o.detalle && <span className="opcion-detalle">{o.detalle}</span>}
            </span>
            {o.banderaRoja && <span className="bandera" title="Condición de peligro">⚠</span>}
          </button>
        )
      })}
      {multiple && <p className="pista">Puedes marcar varias.</p>}
    </div>
  )
}
