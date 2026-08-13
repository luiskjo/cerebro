import { useState } from 'react'
import { HashRouter, Link, NavLink, Route, Routes, useNavigate } from 'react-router-dom'
import { ProveedorApp, useApp } from './lib/estado'
import { ETIQUETA_ROL } from './lib/tipos'
import { Entrar } from './pages/Entrar'
import { Inicio } from './pages/Inicio'
import { NuevaVivienda } from './pages/NuevaVivienda'
import { Evaluacion } from './pages/Evaluacion'
import { Reporte } from './pages/Reporte'
import { Revision } from './pages/Revision'
import { PlanDeAccion } from './pages/PlanDeAccion'
import { Ayuda } from './pages/Ayuda'
import { Datos } from './pages/Datos'

function MenuUsuario() {
  const { usuario, cerrarSesion, viviendas } = useApp()
  const [abierto, setAbierto] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const navegar = useNavigate()
  if (!usuario) return null

  const iniciales = usuario.nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')

  return (
    <>
      <button
        type="button"
        className="avatar"
        onClick={() => setAbierto((a) => !a)}
        aria-expanded={abierto}
        aria-label={`Cuenta de ${usuario.nombre}`}
      >
        {iniciales || '?'}
      </button>

      {abierto && (
        <>
          <div className="capa" onClick={() => setAbierto(false)} />
          <div className="menu" role="menu">
            <div className="menu-cabeza">
              <strong>{usuario.nombre}</strong>
              <span className="tenue chico bloque">{ETIQUETA_ROL[usuario.rol]}</span>
              {usuario.matricula && <span className="tenue chico bloque">M.P. {usuario.matricula}</span>}
              <span className="tenue chico bloque">{usuario.municipio}</span>
            </div>
            <button
              type="button"
              role="menuitem"
              className="menu-item"
              onClick={() => {
                setAbierto(false)
                navegar('/datos')
              }}
            >
              Exportar o importar datos
            </button>
            <button
              type="button"
              role="menuitem"
              className="menu-item peligro"
              onClick={() => {
                setAbierto(false)
                setConfirmando(true)
              }}
            >
              Cerrar sesión
            </button>
          </div>
        </>
      )}

      {confirmando && (
        <div className="modal" role="dialog" aria-modal="true" onClick={() => setConfirmando(false)}>
          <div className="modal-contenido pila" onClick={(e) => e.stopPropagation()}>
            <h2>¿Cerrar sesión?</h2>
            <p>
              Las {viviendas.length} vivienda{viviendas.length === 1 ? '' : 's'} que tienes guardadas
              <strong> se quedan en este dispositivo</strong> y las verá quien entre después.
            </p>
            <p className="tenue chico">
              Si vas a entregar el teléfono o cambiar de persona, exporta tu trabajo primero.
            </p>
            <button
              type="button"
              className="btn btn-secundario ancho"
              onClick={() => {
                setConfirmando(false)
                navegar('/datos')
              }}
            >
              Exportar antes de salir
            </button>
            <button type="button" className="btn btn-peligro ancho" onClick={cerrarSesion}>
              Cerrar sesión
            </button>
            <button type="button" className="btn btn-texto" onClick={() => setConfirmando(false)}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </>
  )
}

function Cascaron() {
  const { usuario } = useApp()

  if (!usuario) {
    return (
      <div className="app">
        <main className="contenido angosto">
          <Entrar />
        </main>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="barra">
        <Link to="/" className="marca">
          <span className="marca-icono" aria-hidden="true">⌂</span>
          <span>
            <strong>Casa Firme</strong>
            <small>{usuario.rol === 'profesional' ? 'Revisión profesional' : 'Evaluación en campo'}</small>
          </span>
        </Link>
        <nav className="barra-nav">
          <NavLink to="/" end>{usuario.rol === 'profesional' ? 'Casos' : 'Viviendas'}</NavLink>
          <NavLink to="/ayuda">Ayuda</NavLink>
          <MenuUsuario />
        </nav>
      </header>

      <main className="contenido">
        <Routes>
          <Route path="/" element={<Inicio />} />
          <Route path="/nueva" element={<NuevaVivienda />} />
          <Route path="/vivienda/:id/evaluacion" element={<Evaluacion />} />
          <Route path="/vivienda/:id/reporte" element={<Reporte />} />
          <Route path="/vivienda/:id/revision" element={<Revision />} />
          <Route path="/vivienda/:id/plan" element={<PlanDeAccion />} />
          <Route path="/ayuda" element={<Ayuda />} />
          <Route path="/datos" element={<Datos />} />
          <Route path="*" element={<p className="vacio">No encontramos esa página.</p>} />
        </Routes>
      </main>

      <footer className="pie">
        <p>
          Herramienta de apoyo para brigadas de evaluación. No reemplaza el criterio de un ingeniero o
          arquitecto, ni el formato oficial del municipio.
        </p>
      </footer>
    </div>
  )
}

export default function App() {
  return (
    <ProveedorApp>
      <HashRouter>
        <Cascaron />
      </HashRouter>
    </ProveedorApp>
  )
}
