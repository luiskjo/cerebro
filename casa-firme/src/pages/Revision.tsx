import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../lib/estado'
import { calcularDiagnostico } from '../domain/reglas'
import { CATALOGO, ETIQUETA_PRIORIDAD, ETIQUETA_QUIEN, sugerirReparaciones } from '../domain/reparaciones'
import { Semaforo } from '../components/Semaforo'
import type { Habitabilidad, Revision as RevisionTipo } from '../lib/tipos'
import { ETIQUETA_HABITABILIDAD } from '../lib/tipos'

/**
 * Segunda etapa: el ingeniero o arquitecto revisa lo que levanto el voluntario,
 * confirma o cambia el semaforo, y decide que reparaciones entran al plan.
 */
export function Revision() {
  const { id = '' } = useParams()
  const navegar = useNavigate()
  const { obtener, perfil, guardarRevision, cambiarEstado } = useApp()
  const vivienda = obtener(id)

  const diagnostico = useMemo(() => (vivienda ? calcularDiagnostico(vivienda.respuestas) : null), [vivienda])
  const sugeridas = useMemo(
    () => (vivienda && diagnostico ? sugerirReparaciones(vivienda.respuestas, diagnostico) : []),
    [vivienda, diagnostico],
  )

  const [revision, setRevision] = useState<RevisionTipo>(
    () =>
      vivienda?.revision ?? {
        profesionalNombre: perfil.rol === 'profesional' ? perfil.nombre : '',
        profesionalMatricula: '',
        fecha: new Date().toISOString().slice(0, 10),
        habitabilidadFinal: diagnostico?.habitabilidadSugerida ?? 'amarillo',
        justificacion: '',
        requiereVisitaProfesional: false,
        requiereEstudioDetallado: false,
        observaciones: '',
        reparacionesAprobadas: sugeridas.map((r) => r.id),
        reparacionesDescartadas: [],
        recomendacionesAdicionales: [],
        firmada: false,
      },
  )
  const [nuevaRecomendacion, setNuevaRecomendacion] = useState('')

  if (!vivienda || !diagnostico) {
    return <p className="vacio">No encontramos esa vivienda. <Link to="/">Volver</Link></p>
  }

  const soloLectura = perfil.rol !== 'profesional'
  const idsSugeridos = new Set(sugeridas.map((r) => r.id))

  function alternarReparacion(idRep: string) {
    setRevision((prev) => {
      const aprobadas = prev.reparacionesAprobadas.includes(idRep)
        ? prev.reparacionesAprobadas.filter((x) => x !== idRep)
        : [...prev.reparacionesAprobadas, idRep]
      return {
        ...prev,
        reparacionesAprobadas: aprobadas,
        reparacionesDescartadas: [...idsSugeridos].filter((x) => !aprobadas.includes(x)),
      }
    })
  }

  function guardar(firmar: boolean) {
    const actualizada = { ...revision, firmada: firmar }
    setRevision(actualizada)
    guardarRevision(id, actualizada)
    if (firmar) {
      cambiarEstado(id, 'revisada')
      navegar(`/vivienda/${id}/plan`)
    }
  }

  return (
    <div className="pila">
      <Link to={`/vivienda/${id}/reporte`} className="btn btn-texto no-imprimir">← Ver el reporte de campo</Link>
      <h1>Revisión profesional</h1>
      <p className="tenue">
        {vivienda.identificacion.codigo} · {vivienda.identificacion.direccion}
      </p>

      {soloLectura && (
        <p className="aviso aviso-aviso">
          Estás en modo voluntario, así que esta pantalla es de solo lectura. Cambia tu rol a "Ingeniero /
          arquitecto" en el inicio si eres quien revisa.
        </p>
      )}

      <section className="tarjeta pila">
        <h2>1. Clasificación de habitabilidad</h2>
        <div className="fila-entre">
          <div>
            <p className="tenue chico">Lo que calculó el sistema</p>
            <Semaforo valor={diagnostico.habitabilidadSugerida} tamano="chico" />
          </div>
          <div>
            <p className="tenue chico">Tu decisión</p>
            <Semaforo valor={revision.habitabilidadFinal} tamano="chico" />
          </div>
        </div>
        <div className="opciones opciones-si-no">
          {(['verde', 'amarillo', 'rojo'] as Habitabilidad[]).map((h) => (
            <button
              key={h}
              type="button"
              disabled={soloLectura}
              className={`opcion ${revision.habitabilidadFinal === h ? 'elegida' : ''}`}
              onClick={() => setRevision({ ...revision, habitabilidadFinal: h })}
            >
              {ETIQUETA_HABITABILIDAD[h]}
            </button>
          ))}
        </div>
        {revision.habitabilidadFinal !== diagnostico.habitabilidadSugerida && (
          <label>
            Justifica el cambio respecto a lo calculado
            <textarea
              className="campo"
              rows={3}
              disabled={soloLectura}
              value={revision.justificacion}
              onChange={(e) => setRevision({ ...revision, justificacion: e.target.value })}
            />
          </label>
        )}
      </section>

      <section className="tarjeta pila">
        <h2>2. ¿Se necesita algo más antes de intervenir?</h2>
        <label className="casilla">
          <input
            type="checkbox"
            disabled={soloLectura}
            checked={revision.requiereVisitaProfesional}
            onChange={(e) => setRevision({ ...revision, requiereVisitaProfesional: e.target.checked })}
          />
          Requiere visita presencial de un profesional antes de ejecutar
        </label>
        <label className="casilla">
          <input
            type="checkbox"
            disabled={soloLectura}
            checked={revision.requiereEstudioDetallado}
            onChange={(e) => setRevision({ ...revision, requiereEstudioDetallado: e.target.checked })}
          />
          Requiere evaluación estructural detallada o estudio del terreno
        </label>
      </section>

      <section className="tarjeta pila">
        <h2>3. Reparaciones que entran al plan</h2>
        <p className="tenue">
          Marcadas: las que propuso el sistema. Puedes quitar las que no apliquen y agregar otras del catálogo.
        </p>
        {([1, 2, 3] as const).map((prioridad) => {
          const grupo = CATALOGO.filter((r) => r.prioridad === prioridad)
          return (
            <div key={prioridad} className="pila-chica">
              <h3 className="chico">{ETIQUETA_PRIORIDAD[prioridad]}</h3>
              {grupo.map((r) => {
                const marcada = revision.reparacionesAprobadas.includes(r.id)
                return (
                  <label key={r.id} className={`casilla tarjeta-suave ${idsSugeridos.has(r.id) ? 'sugerida' : ''}`}>
                    <input
                      type="checkbox"
                      disabled={soloLectura}
                      checked={marcada}
                      onChange={() => alternarReparacion(r.id)}
                    />
                    <span>
                      <strong>{r.titulo}</strong>
                      {idsSugeridos.has(r.id) && <span className="pastilla">sugerida</span>}
                      <span className="tenue chico bloque">{ETIQUETA_QUIEN[r.quienLoHace]}</span>
                    </span>
                  </label>
                )
              })}
            </div>
          )
        })}
      </section>

      <section className="tarjeta pila">
        <h2>4. Recomendaciones para la obra</h2>
        <p className="tenue">
          Instrucciones tuyas que aparecerán en el plan, en lenguaje que entienda el voluntario.
        </p>
        <ul className="lista-puntos">
          {revision.recomendacionesAdicionales.map((r, i) => (
            <li key={r}>
              {r}
              {!soloLectura && (
                <button
                  type="button"
                  className="btn btn-texto peligro"
                  onClick={() =>
                    setRevision({
                      ...revision,
                      recomendacionesAdicionales: revision.recomendacionesAdicionales.filter((_, j) => j !== i),
                    })
                  }
                >
                  quitar
                </button>
              )}
            </li>
          ))}
        </ul>
        {!soloLectura && (
          <div className="fila">
            <input
              className="campo"
              value={nuevaRecomendacion}
              placeholder="Ej: no reforzar el muro del fondo hasta drenar el talud"
              onChange={(e) => setNuevaRecomendacion(e.target.value)}
            />
            <button
              type="button"
              className="btn btn-secundario"
              onClick={() => {
                if (!nuevaRecomendacion.trim()) return
                setRevision({
                  ...revision,
                  recomendacionesAdicionales: [...revision.recomendacionesAdicionales, nuevaRecomendacion.trim()],
                })
                setNuevaRecomendacion('')
              }}
            >
              Agregar
            </button>
          </div>
        )}
        <label>
          Observaciones generales
          <textarea
            className="campo"
            rows={4}
            disabled={soloLectura}
            value={revision.observaciones}
            onChange={(e) => setRevision({ ...revision, observaciones: e.target.value })}
          />
        </label>
      </section>

      {!soloLectura && (
        <section className="tarjeta pila">
          <h2>5. Firma</h2>
          <div className="fila">
            <label>
              Nombre
              <input
                className="campo"
                value={revision.profesionalNombre}
                onChange={(e) => setRevision({ ...revision, profesionalNombre: e.target.value })}
              />
            </label>
            <label>
              Matrícula profesional
              <input
                className="campo"
                value={revision.profesionalMatricula}
                onChange={(e) => setRevision({ ...revision, profesionalMatricula: e.target.value })}
              />
            </label>
          </div>
          <div className="navegacion">
            <button type="button" className="btn btn-secundario" onClick={() => guardar(false)}>
              Guardar sin firmar
            </button>
            <button
              type="button"
              className="btn btn-principal"
              disabled={!revision.profesionalNombre.trim() || revision.reparacionesAprobadas.length === 0}
              onClick={() => guardar(true)}
            >
              Firmar y generar el plan
            </button>
          </div>
          <p className="tenue chico">
            Al firmar declaras que revisaste el reporte y las fotos, y que las acciones aprobadas son las
            adecuadas para esta vivienda.
          </p>
        </section>
      )}
    </div>
  )
}
