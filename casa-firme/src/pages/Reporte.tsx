import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useApp } from '../lib/estado'
import { calcularDiagnostico, explicarSemaforo } from '../domain/reglas'
import { sugerirReparaciones } from '../domain/reparaciones'
import { BarraSeveridad, Semaforo } from '../components/Semaforo'
import { ETIQUETA_COMPONENTE, ETIQUETA_ESTADO, ETIQUETA_SEVERIDAD } from '../lib/tipos'
import { buscarPregunta } from '../domain/checklist'

export function Reporte() {
  const { id = '' } = useParams()
  const { obtener, perfil } = useApp()
  const vivienda = obtener(id)

  const diagnostico = useMemo(() => (vivienda ? calcularDiagnostico(vivienda.respuestas) : null), [vivienda])
  const sugeridas = useMemo(
    () => (vivienda && diagnostico ? sugerirReparaciones(vivienda.respuestas, diagnostico) : []),
    [vivienda, diagnostico],
  )

  if (!vivienda || !diagnostico) {
    return <p className="vacio">No encontramos esa vivienda. <Link to="/">Volver</Link></p>
  }

  const notas = Object.entries(vivienda.notas).filter(([, texto]) => texto.trim().length > 0)

  return (
    <div className="pila">
      <div className="fila-entre no-imprimir">
        <Link to={`/vivienda/${id}/evaluacion`} className="btn btn-texto">← Seguir editando</Link>
        <button type="button" className="btn btn-texto" onClick={() => window.print()}>🖨 Imprimir</button>
      </div>

      <header className="tarjeta pila">
        <h1>Reporte de evaluación</h1>
        <div className="datos-grid">
          <Dato etiqueta="Código" valor={vivienda.identificacion.codigo} />
          <Dato etiqueta="Municipio" valor={vivienda.identificacion.municipio} />
          <Dato etiqueta="Vereda o barrio" valor={vivienda.identificacion.veredaBarrio} />
          <Dato etiqueta="Dirección" valor={vivienda.identificacion.direccion} />
          <Dato etiqueta="Familia" valor={vivienda.identificacion.responsableNombre} />
          <Dato etiqueta="Teléfono" valor={vivienda.identificacion.responsableTelefono} />
          <Dato etiqueta="Personas" valor={String(vivienda.identificacion.personas)} />
          <Dato etiqueta="Personas vulnerables" valor={String(vivienda.identificacion.personasVulnerables)} />
          <Dato etiqueta="Evaluó" valor={vivienda.identificacion.voluntarioNombre} />
          <Dato etiqueta="Fecha" valor={vivienda.identificacion.fecha} />
          <Dato etiqueta="Estado" valor={ETIQUETA_ESTADO[vivienda.estado]} />
          {vivienda.identificacion.puntoGps && (
            <Dato
              etiqueta="GPS"
              valor={`${vivienda.identificacion.puntoGps.lat}, ${vivienda.identificacion.puntoGps.lon}`}
            />
          )}
        </div>
      </header>

      <section className="tarjeta pila">
        <h2>Resultado preliminar</h2>
        <Semaforo valor={diagnostico.habitabilidadSugerida} tamano="grande" conDescripcion />
        <p>{explicarSemaforo(diagnostico)}</p>
        <p className="tenue">
          Nivel de daño global: <strong>{ETIQUETA_SEVERIDAD[diagnostico.severidadGlobal]}</strong> · Evaluación{' '}
          {diagnostico.completitud}% completa
        </p>
        <p className="aviso aviso-aviso">
          Esta clasificación es <strong>preliminar y automática</strong>. Solo un ingeniero o arquitecto puede
          confirmarla o cambiarla.
        </p>
      </section>

      {diagnostico.banderasRojas.length > 0 && (
        <section className="tarjeta alerta-roja pila">
          <h2>Condiciones de peligro encontradas</h2>
          <ul className="lista-puntos">
            {diagnostico.banderasRojas.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="tarjeta pila">
        <h2>Daño por parte de la casa</h2>
        {diagnostico.porComponente.map((c) => (
          <div key={c.componente} className="componente">
            <div className="fila-entre">
              <strong>{ETIQUETA_COMPONENTE[c.componente]}</strong>
              <BarraSeveridad valor={c.severidad} />
            </div>
            {c.hallazgos.length > 0 && (
              <ul className="lista-puntos chico">
                {c.hallazgos.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </section>

      {diagnostico.preguntasPendientes.length > 0 && (
        <section className="tarjeta pila">
          <h2>Falta contestar</h2>
          <ul className="lista-puntos">
            {diagnostico.preguntasPendientes.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </section>
      )}

      {notas.length > 0 && (
        <section className="tarjeta pila">
          <h2>Notas del voluntario</h2>
          {notas.map(([preguntaId, texto]) => (
            <div key={preguntaId}>
              <strong className="chico">{buscarPregunta(preguntaId)?.titulo ?? preguntaId}</strong>
              <p>{texto}</p>
            </div>
          ))}
        </section>
      )}

      <section className="tarjeta pila">
        <h2>Acciones que el sistema propone</h2>
        <p className="tenue">
          Son una propuesta a partir de las respuestas. El profesional decide cuáles quedan.
        </p>
        <ol className="lista-puntos">
          {sugeridas.map((r) => (
            <li key={r.id}>
              <strong>{r.titulo}</strong> — {r.resumen}
            </li>
          ))}
        </ol>
      </section>

      <section className="tarjeta pila no-imprimir">
        <h2>¿Qué sigue?</h2>
        {vivienda.revision?.firmada ? (
          <Link to={`/vivienda/${id}/plan`} className="btn btn-principal ancho">
            Ver el plan de acción firmado
          </Link>
        ) : (
          <>
            <p>
              Esta evaluación necesita la revisión de un ingeniero o arquitecto antes de convertirse en un plan
              de reparación.
            </p>
            <Link to={`/vivienda/${id}/revision`} className="btn btn-principal ancho">
              {perfil.rol === 'profesional' ? 'Abrir la revisión profesional' : 'Ver la revisión profesional'}
            </Link>
          </>
        )}
      </section>
    </div>
  )
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="dato">
      <span className="dato-etiqueta">{etiqueta}</span>
      <span className="dato-valor">{valor || '—'}</span>
    </div>
  )
}
