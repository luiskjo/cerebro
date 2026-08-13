import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useApp } from '../lib/estado'
import { calcularDiagnostico } from '../domain/reglas'
import { generarPlan } from '../domain/plan'
import { ETIQUETA_QUIEN } from '../domain/reparaciones'
import type { ItemPlan } from '../domain/plan'
import { Dibujo } from '../components/Dibujo'
import { Semaforo } from '../components/Semaforo'

export function PlanDeAccion() {
  const { id = '' } = useParams()
  const { obtener } = useApp()
  const vivienda = obtener(id)
  const [vista, setVista] = useState<'obra' | 'compras'>('obra')

  const diagnostico = useMemo(() => (vivienda ? calcularDiagnostico(vivienda.respuestas) : null), [vivienda])
  const plan = useMemo(
    () => (vivienda && diagnostico ? generarPlan(vivienda, diagnostico) : null),
    [vivienda, diagnostico],
  )

  if (!vivienda || !diagnostico || !plan) {
    return <p className="vacio">No encontramos esa vivienda. <Link to="/">Volver</Link></p>
  }

  const habitabilidad = vivienda.revision?.firmada
    ? vivienda.revision.habitabilidadFinal
    : diagnostico.habitabilidadSugerida

  return (
    <div className="pila">
      <div className="fila-entre no-imprimir">
        <Link to={`/vivienda/${id}/reporte`} className="btn btn-texto">← Reporte</Link>
        <button type="button" className="btn btn-texto" onClick={() => window.print()}>🖨 Imprimir el plan</button>
      </div>

      <header className="tarjeta pila">
        <h1>Plan de acción</h1>
        <p className="tenue">
          {vivienda.identificacion.codigo} · {vivienda.identificacion.direccion}
          {vivienda.identificacion.veredaBarrio ? ` · ${vivienda.identificacion.veredaBarrio}` : ''}
        </p>
        <Semaforo valor={habitabilidad} conDescripcion />
        {vivienda.revision?.firmada ? (
          <p className="aviso aviso-bien">
            Revisado y firmado por <strong>{vivienda.revision.profesionalNombre}</strong>
            {vivienda.revision.profesionalMatricula ? ` (M.P. ${vivienda.revision.profesionalMatricula})` : ''} el{' '}
            {vivienda.revision.fecha}.
          </p>
        ) : (
          <p className="aviso aviso-aviso">
            <strong>Borrador.</strong> Todavía no lo ha firmado un ingeniero o arquitecto. No inicies obra con este
            documento.
          </p>
        )}
      </header>

      {plan.advertencias.length > 0 && (
        <section className="tarjeta alerta-aviso pila">
          <h2>Antes de empezar, lee esto</h2>
          <ul className="lista-puntos">
            {plan.advertencias.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </section>
      )}

      {vivienda.revision && (vivienda.revision.recomendacionesAdicionales.length > 0 || vivienda.revision.observaciones) && (
        <section className="tarjeta pila">
          <h2>Indicaciones del profesional</h2>
          {vivienda.revision.observaciones && <p>{vivienda.revision.observaciones}</p>}
          <ul className="lista-puntos">
            {vivienda.revision.recomendacionesAdicionales.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </section>
      )}

      <div className="filtros no-imprimir">
        <button type="button" className={`chip ${vista === 'obra' ? 'activo' : ''}`} onClick={() => setVista('obra')}>
          Paso a paso de la obra
        </button>
        <button type="button" className={`chip ${vista === 'compras' ? 'activo' : ''}`} onClick={() => setVista('compras')}>
          Lista de compras
        </button>
      </div>

      {vista === 'obra' ? (
        <>
          {plan.etapas.map((etapa) => (
            <section key={etapa.prioridad} className={`etapa etapa-${etapa.prioridad}`}>
              <header className="pila-chica">
                <h2>{etapa.titulo}</h2>
                <p className="tenue">{etapa.descripcion}</p>
              </header>
              {etapa.items.map((item, i) => (
                <TarjetaTrabajo key={item.reparacion.id} item={item} numero={i + 1} />
              ))}
            </section>
          ))}
          <section className="tarjeta pila">
            <h2>Mano de obra estimada</h2>
            <p className="grande-num">{plan.jornalesTotales} jornales</p>
            <p className="tenue">
              Un jornal es una persona trabajando un día. Con una cuadrilla de 3 personas serían unos{' '}
              {Math.ceil(plan.jornalesTotales / 3)} días de trabajo. Es un estimado grueso para organizar el
              apoyo, no un contrato.
            </p>
          </section>
        </>
      ) : (
        <ListaCompras plan={plan} />
      )}
    </div>
  )
}

function TarjetaTrabajo({ item, numero }: { item: ItemPlan; numero: number }) {
  const { reparacion, medida, materiales, jornales } = item
  const [abierto, setAbierto] = useState(numero === 1)

  return (
    <article className="trabajo">
      <button type="button" className="trabajo-cabeza" onClick={() => setAbierto((a) => !a)} aria-expanded={abierto}>
        <span className="trabajo-numero">{numero}</span>
        <span className="trabajo-titulo">
          <strong>{reparacion.titulo}</strong>
          <span className="tenue chico bloque">
            {ETIQUETA_QUIEN[reparacion.quienLoHace]} · {medida.cantidad} {medida.unidad}
            {jornales > 0 ? ` · ~${jornales} jornales` : ''}
          </span>
        </span>
        <span aria-hidden="true">{abierto ? '−' : '+'}</span>
      </button>

      {abierto && (
        <div className="trabajo-cuerpo pila">
          <p className="resumen">{reparacion.resumen}</p>
          {reparacion.dibujo && <Dibujo id={reparacion.dibujo} titulo={reparacion.titulo} />}

          {reparacion.seguridad && reparacion.seguridad.length > 0 && (
            <div className="aviso aviso-peligro">
              <strong>Seguridad</strong>
              <ul className="lista-puntos chico">
                {reparacion.seguridad.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          )}

          {reparacion.herramientas.length > 0 && (
            <p className="tenue chico">
              <strong>Herramientas:</strong> {reparacion.herramientas.join(' · ')}
            </p>
          )}

          <h4>Cómo se hace</h4>
          <ol className="pasos-obra">
            {reparacion.pasos.map((paso) => (
              <li key={paso.titulo}>
                <strong>{paso.titulo}</strong>
                <p>{paso.detalle}</p>
                {paso.advertencia && <p className="aviso aviso-peligro chico">⚠ {paso.advertencia}</p>}
                {paso.dibujo && <Dibujo id={paso.dibujo} titulo={paso.titulo} />}
              </li>
            ))}
          </ol>

          {materiales.length > 0 && (
            <>
              <h4>Materiales para este trabajo</h4>
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Material</th>
                    <th>Cantidad</th>
                  </tr>
                </thead>
                <tbody>
                  {materiales.map((m) => (
                    <tr key={m.nombre}>
                      <td>
                        {m.nombre}
                        {m.nota && <span className="tenue chico bloque">{m.nota}</span>}
                      </td>
                      <td className="numero">
                        {m.cantidad} {m.unidad}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}
    </article>
  )
}

function ListaCompras({ plan }: { plan: ReturnType<typeof generarPlan> }) {
  const [comprados, setComprados] = useState<string[]>([])

  return (
    <section className="tarjeta pila">
      <h2>Lista de compras consolidada</h2>
      <p className="tenue">
        Suma de todos los trabajos del plan, con desperdicio incluido. Verifica en obra antes de pedir.
      </p>
      <table className="tabla">
        <thead>
          <tr>
            <th />
            <th>Material</th>
            <th>Cantidad</th>
          </tr>
        </thead>
        <tbody>
          {plan.listaCompras.map((m) => {
            const clave = `${m.nombre}|${m.unidad}`
            const listo = comprados.includes(clave)
            return (
              <tr key={clave} className={listo ? 'comprado' : ''}>
                <td>
                  <input
                    type="checkbox"
                    checked={listo}
                    aria-label={`Marcar ${m.nombre} como comprado`}
                    onChange={() =>
                      setComprados((prev) => (listo ? prev.filter((x) => x !== clave) : [...prev, clave]))
                    }
                  />
                </td>
                <td>
                  {m.nombre}
                  {m.nota && <span className="tenue chico bloque">{m.nota}</span>}
                </td>
                <td className="numero">
                  {m.cantidad} {m.unidad}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="tenue chico">
        Las cantidades salen de las medidas que tomó el voluntario en campo. Si esas medidas cambian, vuelve a
        abrir el plan: se recalculan solas.
      </p>
    </section>
  )
}
