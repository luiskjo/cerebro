import { HashRouter, Link, NavLink, Route, Routes } from 'react-router-dom'
import { ProveedorApp } from './lib/estado'
import { Inicio } from './pages/Inicio'
import { NuevaVivienda } from './pages/NuevaVivienda'
import { Evaluacion } from './pages/Evaluacion'
import { Reporte } from './pages/Reporte'
import { Revision } from './pages/Revision'
import { PlanDeAccion } from './pages/PlanDeAccion'
import { Ayuda } from './pages/Ayuda'
import { Datos } from './pages/Datos'

function Cascaron() {
  return (
    <div className="app">
      <header className="barra">
        <Link to="/" className="marca">
          <span className="marca-icono" aria-hidden="true">⌂</span>
          <span>
            <strong>Casa Firme</strong>
            <small>Evaluación post-sismo</small>
          </span>
        </Link>
        <nav className="barra-nav">
          <NavLink to="/" end>Viviendas</NavLink>
          <NavLink to="/ayuda">Ayuda</NavLink>
          <NavLink to="/datos">Datos</NavLink>
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
