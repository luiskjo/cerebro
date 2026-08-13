import { Link } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { esMiCaso, estaDisponible, useApp } from '../lib/estado'
import { calcularDiagnostico } from '../domain/reglas'
import { Semaforo } from '../components/Semaforo'
import { ETIQUETA_ESTADO } from '../lib/tipos'
import type { Diagnostico, Vivienda } from '../lib/tipos'

interface Caso {
  vivienda: Vivienda
  diagnostico: Diagnostico
}

export function Inicio() {
  const { viviendas, usuario } = useApp()
  const casos = useMemo<Caso[]>(
    () => viviendas.map((v) => ({ vivienda: v, diagnostico: calcularDiagnostico(v.respuestas) })),
    [viviendas],
  )

  return usuario?.rol === 'profesional' ? <VistaProfesional casos={casos} /> : <VistaVoluntario casos={casos} />
}

/* ------------------------------------------------------------------ */
/* Voluntario                                                          */
/* ------------------------------------------------------------------ */

function VistaVoluntario({ casos }: { casos: Caso[] }) {
  const { usuario } = useApp()
  const [filtro, setFiltro] = useState<'todas' | 'sin_terminar' | 'enviadas'>('todas')

  const mias = casos.filter((c) => c.vivienda.identificacion.voluntarioId === usuario?.id)
  const listadas = mias.filter(({ vivienda }) => {
    if (filtro === 'sin_terminar') return vivienda.estado === 'borrador'
    if (filtro === 'enviadas') return vivienda.estado !== 'borrador'
    return true
  })

  return (
    <div className="pila">
      <div>
        <h1>Hola, {usuario?.nombre.split(' ')[0]}</h1>
        <p className="tenue">
          {mias.length === 0
            ? 'Todavía no has evaluado ninguna vivienda.'
            : `Llevas ${mias.length} vivienda${mias.length === 1 ? '' : 's'} evaluada${mias.length === 1 ? '' : 's'}.`}
        </p>
      </div>

      <Link to="/nueva" className="btn btn-principal ancho grande">
        + Evaluar una vivienda
      </Link>

      {mias.length > 0 && (
        <>
          <div className="filtros">
            {(
              [
                ['todas', 'Todas'],
                ['sin_terminar', 'Sin terminar'],
                ['enviadas', 'Enviadas'],
              ] as const
            ).map(([id, texto]) => (
              <button
                key={id}
                type="button"
                className={`chip ${filtro === id ? 'activo' : ''}`}
                onClick={() => setFiltro(id)}
              >
                {texto}
              </button>
            ))}
          </div>

          {listadas.length === 0 ? (
            <p className="vacio">No hay viviendas en este filtro.</p>
          ) : (
            <ul className="lista">
              {listadas.map((c) => (
                <FilaCaso key={c.vivienda.id} caso={c} />
              ))}
            </ul>
          )}
        </>
      )}

      <p className="aviso aviso-aviso">
        Cuando llegues a donde haya señal, entra a <Link to="/datos">Datos</Link> y exporta tu trabajo
        para pasárselo al coordinador. Mientras no lo hagas, solo existe en este teléfono.
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Ingeniero / arquitecto                                              */
/* ------------------------------------------------------------------ */

/** Los casos más graves y con más gente vulnerable se ofrecen primero. */
function prioridad(c: Caso): number {
  const porSemaforo = { rojo: 0, amarillo: 1, verde: 2 }[c.diagnostico.habitabilidadSugerida]
  const vulnerables = c.vivienda.identificacion.personasVulnerables > 0 ? 0 : 1
  return porSemaforo * 10 + vulnerables
}

function VistaProfesional({ casos }: { casos: Caso[] }) {
  const { usuario } = useApp()
  const [pestana, setPestana] = useState<'disponibles' | 'mios' | 'cerrados'>('disponibles')

  const disponibles = casos
    .filter((c) => estaDisponible(c.vivienda))
    .sort((a, b) => prioridad(a) - prioridad(b) || a.vivienda.creadaEn.localeCompare(b.vivienda.creadaEn))
  const mios = casos.filter((c) => esMiCaso(c.vivienda, usuario ?? null) && !c.vivienda.revision?.firmada)
  const cerrados = casos.filter((c) => c.vivienda.revision?.firmada)
  const deOtros = casos.filter(
    (c) => c.vivienda.asignacion && !esMiCaso(c.vivienda, usuario ?? null) && !c.vivienda.revision?.firmada,
  )

  const grupos = { disponibles, mios, cerrados }

  return (
    <div className="pila">
      <div>
        <h1>Casos</h1>
        <p className="tenue">
          {disponibles.length === 0
            ? 'No hay evaluaciones esperando revisión en este dispositivo.'
            : `${disponibles.length} evaluación${disponibles.length === 1 ? '' : 'es'} esperando que alguien la tome.`}
        </p>
      </div>

      <div className="filtros">
        {(
          [
            ['disponibles', `Disponibles (${disponibles.length})`],
            ['mios', `Míos (${mios.length})`],
            ['cerrados', `Firmados (${cerrados.length})`],
          ] as const
        ).map(([id, texto]) => (
          <button
            key={id}
            type="button"
            className={`chip ${pestana === id ? 'activo' : ''}`}
            onClick={() => setPestana(id)}
          >
            {texto}
          </button>
        ))}
      </div>

      {pestana === 'disponibles' && (
        <p className="tenue chico">
          Ordenados por gravedad y por número de personas vulnerables en la casa. Toma solo los que puedas
          atender: mientras esté tomado, nadie más lo revisa.
        </p>
      )}

      {grupos[pestana].length === 0 ? (
        <p className="vacio">
          {pestana === 'disponibles'
            ? 'Nada por tomar. Importa el archivo del coordinador desde Datos para recibir evaluaciones nuevas.'
            : pestana === 'mios'
              ? 'No has tomado ningún caso todavía.'
              : 'Todavía no has firmado ningún plan.'}
        </p>
      ) : (
        <ul className="lista">
          {grupos[pestana].map((c) => (
            <FilaCaso key={c.vivienda.id} caso={c} modoProfesional />
          ))}
        </ul>
      )}

      {pestana === 'disponibles' && deOtros.length > 0 && (
        <details className="tarjeta">
          <summary>
            {deOtros.length} caso{deOtros.length === 1 ? '' : 's'} que ya tomó otro colega
          </summary>
          <ul className="lista" style={{ marginTop: '.75rem' }}>
            {deOtros.map((c) => (
              <FilaCaso key={c.vivienda.id} caso={c} modoProfesional />
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */

function FilaCaso({ caso, modoProfesional }: { caso: Caso; modoProfesional?: boolean }) {
  const { vivienda, diagnostico } = caso
  const { usuario, tomarCaso } = useApp()
  const mio = esMiCaso(vivienda, usuario ?? null)
  const disponible = estaDisponible(vivienda)

  const destino =
    vivienda.estado === 'borrador'
      ? `/vivienda/${vivienda.id}/evaluacion`
      : vivienda.revision?.firmada
        ? `/vivienda/${vivienda.id}/plan`
        : mio
          ? `/vivienda/${vivienda.id}/revision`
          : `/vivienda/${vivienda.id}/reporte`

  const ident = vivienda.identificacion

  return (
    <li className="caso">
      <Link to={destino} className="tarjeta tarjeta-enlace">
        <div className="fila-entre">
          <div>
            <strong>{ident.codigo}</strong>
            <p className="tenue">
              {ident.direccion || 'Sin dirección'}
              {ident.veredaBarrio ? ` · ${ident.veredaBarrio}` : ''}
            </p>
            <p className="tenue chico">
              {modoProfesional
                ? `${ident.municipio} · evaluó ${ident.voluntarioNombre || '—'} · ${ident.fecha}`
                : `${ETIQUETA_ESTADO[vivienda.estado]} · ${diagnostico.completitud}% completo`}
            </p>
            {modoProfesional && (
              <p className="tenue chico">
                {ident.personas} persona{ident.personas === 1 ? '' : 's'}
                {ident.personasVulnerables > 0 && (
                  <span className="marca-vulnerable"> · {ident.personasVulnerables} vulnerable{ident.personasVulnerables === 1 ? '' : 's'}</span>
                )}
              </p>
            )}
            {vivienda.asignacion && (
              <p className="tenue chico">
                {mio ? 'Lo tomaste tú' : `Lo tomó ${vivienda.asignacion.profesionalNombre}`}
              </p>
            )}
          </div>
          <Semaforo valor={diagnostico.habitabilidadSugerida} tamano="chico" />
        </div>
      </Link>

      {modoProfesional && disponible && (
        <button type="button" className="btn btn-principal ancho" onClick={() => tomarCaso(vivienda.id)}>
          Tomar este caso
        </button>
      )}
    </li>
  )
}
