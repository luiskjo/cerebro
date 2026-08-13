import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../lib/estado'
import { preguntasVisibles, seccionesVisibles } from '../domain/checklist'
import { calcularDiagnostico, severidadDeRespuesta } from '../domain/reglas'
import { CampoPregunta } from '../components/CampoPregunta'
import { Semaforo } from '../components/Semaforo'
import type { Foto } from '../lib/tipos'

export function Evaluacion() {
  const { id = '' } = useParams()
  const navegar = useNavigate()
  const { obtener, responder, anotar, actualizar, marcarSeccion, cambiarEstado } = useApp()
  const vivienda = obtener(id)
  const [indice, setIndice] = useState(0)

  const secciones = useMemo(() => (vivienda ? seccionesVisibles(vivienda.respuestas) : []), [vivienda])
  const diagnostico = useMemo(
    () => (vivienda ? calcularDiagnostico(vivienda.respuestas) : null),
    [vivienda],
  )

  if (!vivienda || !diagnostico) {
    return (
      <p className="vacio">
        No encontramos esa vivienda. <Link to="/">Volver</Link>
      </p>
    )
  }

  const seccion = secciones[Math.min(indice, secciones.length - 1)]
  const preguntas = preguntasVisibles(seccion, vivienda.respuestas)

  // Si el filtro de seguridad detecto peligro, hay que decirlo aqui mismo y no
  // dejar que el voluntario siga metido en la casa llenando formularios.
  const peligroDetectado =
    seccion.esFiltroDeSeguridad &&
    preguntas.some((p) => severidadDeRespuesta(p, vivienda.respuestas[p.id]).banderaRoja)

  const faltantes = preguntas.filter((p) => {
    if (!p.obligatoria) return false
    const v = vivienda.respuestas[p.id]
    return v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)
  })

  function agregarFoto(foto: Foto) {
    actualizar(id, { fotos: [...vivienda!.fotos, foto] })
  }

  function quitarFoto(foto: Foto) {
    actualizar(id, { fotos: vivienda!.fotos.filter((f) => f.id !== foto.id) })
  }

  const esUltima = indice >= secciones.length - 1

  return (
    <div className="pila">
      <div className="fila-entre">
        <div>
          <h1>{vivienda.identificacion.codigo}</h1>
          <p className="tenue chico">{vivienda.identificacion.direccion}</p>
        </div>
        <Semaforo valor={diagnostico.habitabilidadSugerida} tamano="chico" />
      </div>

      <div className="progreso" role="progressbar" aria-valuenow={diagnostico.completitud} aria-valuemin={0} aria-valuemax={100}>
        <div className="progreso-barra" style={{ width: `${diagnostico.completitud}%` }} />
      </div>

      <nav className="pasos" aria-label="Secciones de la evaluación">
        {secciones.map((s, i) => (
          <button
            key={s.id}
            type="button"
            className={`paso ${i === indice ? 'activo' : ''} ${vivienda.seccionesCompletas.includes(s.id) ? 'listo' : ''}`}
            onClick={() => setIndice(i)}
            title={s.titulo}
          >
            {i + 1}
          </button>
        ))}
      </nav>

      <header className="seccion-cabeza">
        <p className="tenue chico">Paso {indice + 1} de {secciones.length}</p>
        <h2>{seccion.titulo}</h2>
        {seccion.subtitulo && <p className="subtitulo">{seccion.subtitulo}</p>}
        {seccion.intro && <p className="intro">{seccion.intro}</p>}
      </header>

      {peligroDetectado && (
        <div className="alerta alerta-roja">
          <h3>⚠ Peligro detectado. No sigas dentro de la casa.</h3>
          <p>
            Con lo que ya marcaste, esta vivienda queda clasificada como <strong>no habitable</strong>. Sal,
            saca a la familia, acordona y reporta. Puedes terminar de llenar el resto del formulario desde
            afuera, mirando la casa a distancia.
          </p>
          <Link to={`/vivienda/${id}/reporte`} className="btn btn-peligro">
            Ir al reporte y reportar ya
          </Link>
        </div>
      )}

      {preguntas.map((p) => (
        <CampoPregunta
          key={p.id}
          pregunta={p}
          valor={vivienda.respuestas[p.id] ?? null}
          nota={vivienda.notas[p.id] ?? ''}
          fotos={vivienda.fotos.filter((f) => f.preguntaId === p.id)}
          onResponder={(v) => responder(id, p.id, v)}
          onAnotar={(n) => anotar(id, p.id, n)}
          onAgregarFoto={agregarFoto}
          onQuitarFoto={quitarFoto}
        />
      ))}

      {faltantes.length > 0 && (
        <p className="aviso aviso-aviso">
          Faltan {faltantes.length} pregunta{faltantes.length > 1 ? 's' : ''} obligatoria
          {faltantes.length > 1 ? 's' : ''} en este paso.
        </p>
      )}

      <div className="navegacion">
        <button
          type="button"
          className="btn btn-secundario"
          disabled={indice === 0}
          onClick={() => {
            setIndice((i) => Math.max(0, i - 1))
            window.scrollTo({ top: 0 })
          }}
        >
          ← Atrás
        </button>

        {esUltima ? (
          <button
            type="button"
            className="btn btn-principal"
            onClick={() => {
              marcarSeccion(id, seccion.id, true)
              cambiarEstado(id, 'evaluacion_enviada')
              navegar(`/vivienda/${id}/reporte`)
            }}
          >
            Terminar y ver el reporte
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-principal"
            onClick={() => {
              marcarSeccion(id, seccion.id, faltantes.length === 0)
              setIndice((i) => Math.min(secciones.length - 1, i + 1))
              window.scrollTo({ top: 0 })
            }}
          >
            Siguiente →
          </button>
        )}
      </div>

      <p className="tenue chico centro">
        Todo se guarda solo en este teléfono. No necesitas señal.
      </p>
    </div>
  )
}
