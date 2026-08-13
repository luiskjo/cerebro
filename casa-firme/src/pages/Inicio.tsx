import { Link } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { useApp } from '../lib/estado'
import { calcularDiagnostico } from '../domain/reglas'
import { Semaforo } from '../components/Semaforo'
import { ETIQUETA_ESTADO } from '../lib/tipos'
import type { Vivienda } from '../lib/tipos'

type Filtro = 'todas' | 'mias' | 'por_revisar' | 'rojas'

export function Inicio() {
  const { viviendas, perfil, actualizarPerfil } = useApp()
  const [filtro, setFiltro] = useState<Filtro>('todas')
  const [editandoPerfil, setEditandoPerfil] = useState(!perfil.nombre)

  const conDiagnostico = useMemo(
    () => viviendas.map((v) => ({ vivienda: v, diagnostico: calcularDiagnostico(v.respuestas) })),
    [viviendas],
  )

  const listadas = conDiagnostico.filter(({ vivienda, diagnostico }) => {
    if (filtro === 'mias') return vivienda.identificacion.voluntarioNombre === perfil.nombre
    if (filtro === 'por_revisar') return vivienda.estado === 'evaluacion_enviada' || vivienda.estado === 'en_revision'
    if (filtro === 'rojas') return diagnostico.habitabilidadSugerida === 'rojo'
    return true
  })

  const resumen = {
    total: conDiagnostico.length,
    rojas: conDiagnostico.filter((c) => c.diagnostico.habitabilidadSugerida === 'rojo').length,
    porRevisar: conDiagnostico.filter((c) => c.vivienda.estado === 'evaluacion_enviada').length,
    conPlan: conDiagnostico.filter((c) => c.vivienda.revision?.firmada).length,
  }

  return (
    <div className="pila">
      {editandoPerfil ? (
        <FormularioPerfil
          onGuardar={(p) => {
            actualizarPerfil(p)
            setEditandoPerfil(false)
          }}
        />
      ) : (
        <div className="tarjeta fila-entre">
          <div>
            <strong>{perfil.nombre}</strong>
            <p className="tenue">
              {perfil.rol === 'profesional' ? 'Ingeniero / arquitecto' : 'Voluntario en campo'}
              {perfil.municipio ? ` · ${perfil.municipio}` : ''}
            </p>
          </div>
          <button type="button" className="btn btn-texto" onClick={() => setEditandoPerfil(true)}>
            Cambiar
          </button>
        </div>
      )}

      <div className="metricas">
        <Metrica etiqueta="Viviendas" valor={resumen.total} />
        <Metrica etiqueta="No habitables" valor={resumen.rojas} tono="peligro" />
        <Metrica etiqueta="Esperando revisión" valor={resumen.porRevisar} tono="aviso" />
        <Metrica etiqueta="Con plan firmado" valor={resumen.conPlan} tono="bien" />
      </div>

      <Link to="/nueva" className="btn btn-principal ancho grande">
        + Evaluar una vivienda
      </Link>

      <div className="filtros" role="tablist">
        {(
          [
            ['todas', 'Todas'],
            ['mias', 'Mías'],
            ['por_revisar', 'Por revisar'],
            ['rojas', 'No habitables'],
          ] as [Filtro, string][]
        ).map(([id, texto]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={filtro === id}
            className={`chip ${filtro === id ? 'activo' : ''}`}
            onClick={() => setFiltro(id)}
          >
            {texto}
          </button>
        ))}
      </div>

      {listadas.length === 0 ? (
        <p className="vacio">
          {viviendas.length === 0
            ? 'Todavía no has evaluado ninguna vivienda. Empieza con el botón de arriba.'
            : 'No hay viviendas en este filtro.'}
        </p>
      ) : (
        <ul className="lista">
          {listadas.map(({ vivienda, diagnostico }) => (
            <FilaVivienda key={vivienda.id} vivienda={vivienda} habitabilidad={diagnostico} />
          ))}
        </ul>
      )}
    </div>
  )
}

function FilaVivienda({
  vivienda,
  habitabilidad,
}: {
  vivienda: Vivienda
  habitabilidad: ReturnType<typeof calcularDiagnostico>
}) {
  const destino =
    vivienda.estado === 'borrador'
      ? `/vivienda/${vivienda.id}/evaluacion`
      : vivienda.revision?.firmada
        ? `/vivienda/${vivienda.id}/plan`
        : `/vivienda/${vivienda.id}/reporte`

  return (
    <li>
      <Link to={destino} className="tarjeta tarjeta-enlace">
        <div className="fila-entre">
          <div>
            <strong>{vivienda.identificacion.codigo}</strong>
            <p className="tenue">
              {vivienda.identificacion.direccion || 'Sin dirección'}
              {vivienda.identificacion.veredaBarrio ? ` · ${vivienda.identificacion.veredaBarrio}` : ''}
            </p>
            <p className="tenue chico">
              {ETIQUETA_ESTADO[vivienda.estado]} · {habitabilidad.completitud}% completo
            </p>
          </div>
          <Semaforo valor={habitabilidad.habitabilidadSugerida} tamano="chico" />
        </div>
      </Link>
    </li>
  )
}

function Metrica({ etiqueta, valor, tono }: { etiqueta: string; valor: number; tono?: string }) {
  return (
    <div className={`metrica ${tono ? `metrica-${tono}` : ''}`}>
      <span className="metrica-valor">{valor}</span>
      <span className="metrica-etiqueta">{etiqueta}</span>
    </div>
  )
}

function FormularioPerfil({ onGuardar }: { onGuardar: (p: ReturnType<typeof useApp>['perfil']) => void }) {
  const { perfil } = useApp()
  const [datos, setDatos] = useState(perfil)

  return (
    <form
      className="tarjeta pila"
      onSubmit={(e) => {
        e.preventDefault()
        onGuardar(datos)
      }}
    >
      <h2>¿Quién eres?</h2>
      <p className="tenue">Esto queda solo en este dispositivo y firma tus evaluaciones.</p>
      <label>
        Nombre completo
        <input
          className="campo"
          required
          value={datos.nombre}
          onChange={(e) => setDatos({ ...datos, nombre: e.target.value })}
        />
      </label>
      <label>
        Teléfono
        <input
          className="campo"
          inputMode="tel"
          value={datos.telefono}
          onChange={(e) => setDatos({ ...datos, telefono: e.target.value })}
        />
      </label>
      <label>
        Municipio donde trabajas
        <input
          className="campo"
          value={datos.municipio}
          onChange={(e) => setDatos({ ...datos, municipio: e.target.value })}
        />
      </label>
      <fieldset className="opciones opciones-si-no">
        <legend>Tu rol</legend>
        <button
          type="button"
          className={`opcion ${datos.rol === 'voluntario' ? 'elegida' : ''}`}
          onClick={() => setDatos({ ...datos, rol: 'voluntario' })}
        >
          Voluntario en campo
        </button>
        <button
          type="button"
          className={`opcion ${datos.rol === 'profesional' ? 'elegida' : ''}`}
          onClick={() => setDatos({ ...datos, rol: 'profesional' })}
        >
          Ingeniero / arquitecto
        </button>
      </fieldset>
      <button type="submit" className="btn btn-principal ancho">
        Guardar
      </button>
    </form>
  )
}
