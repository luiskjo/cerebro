import { useState } from 'react'
import { useApp } from '../lib/estado'
import type { Rol } from '../lib/tipos'

/**
 * Pantalla de entrada. No es autenticacion —la app no tiene servidor y no
 * puede verificar a nadie— sino identificacion: quien esta usando este
 * dispositivo y con que rol. Se dice explicitamente para que nadie asuma una
 * seguridad que no existe.
 */
export function Entrar() {
  const { iniciarSesion } = useApp()
  const [rol, setRol] = useState<Rol | null>(null)
  const [datos, setDatos] = useState({
    nombre: '',
    telefono: '',
    municipio: '',
    matricula: '',
    profesion: 'Ingeniero civil',
  })

  return (
    <div className="entrada">
      <header className="entrada-cabeza">
        <span className="marca-icono grande" aria-hidden="true">⌂</span>
        <h1>Casa Firme</h1>
        <p>
          Evaluación de viviendas afectadas por el sismo y planes guiados de reparación.
        </p>
      </header>

      {rol === null ? (
        <section className="pila">
          <h2 className="centro">¿Cómo vas a participar?</h2>
          <button type="button" className="rol-tarjeta" onClick={() => setRol('voluntario')}>
            <span className="rol-icono" aria-hidden="true">📋</span>
            <span>
              <strong>Soy voluntario en campo</strong>
              <span className="tenue chico bloque">
                Voy a las casas y lleno la lista de chequeo con ayuda de los dibujos. No necesitas saber
                de construcción.
              </span>
            </span>
          </button>
          <button type="button" className="rol-tarjeta" onClick={() => setRol('profesional')}>
            <span className="rol-icono" aria-hidden="true">📐</span>
            <span>
              <strong>Soy ingeniero o arquitecto</strong>
              <span className="tenue chico bloque">
                Reviso las evaluaciones que llegan, tomo los casos que puedo atender y firmo los planes
                de reparación.
              </span>
            </span>
          </button>
          <p className="aviso aviso-aviso">
            Esta app guarda todo en tu dispositivo. No hay cuentas ni contraseñas: tu nombre sirve para
            firmar tu trabajo, no para darte acceso. Quien confirma que eres profesional es el
            coordinador de la brigada.
          </p>
        </section>
      ) : (
        <form
          className="pila"
          onSubmit={(e) => {
            e.preventDefault()
            iniciarSesion({
              nombre: datos.nombre.trim(),
              telefono: datos.telefono.trim(),
              municipio: datos.municipio.trim(),
              rol,
              matricula: rol === 'profesional' ? datos.matricula.trim() : undefined,
              profesion: rol === 'profesional' ? datos.profesion : undefined,
            })
          }}
        >
          <button type="button" className="btn btn-texto" onClick={() => setRol(null)}>
            ← Cambiar de rol
          </button>

          <div className="tarjeta pila">
            <h2>{rol === 'voluntario' ? 'Voluntario en campo' : 'Ingeniero o arquitecto'}</h2>

            <label>
              Nombre y apellido
              <input
                className="campo"
                required
                autoComplete="name"
                value={datos.nombre}
                onChange={(e) => setDatos({ ...datos, nombre: e.target.value })}
              />
            </label>

            <label>
              Teléfono / WhatsApp
              <input
                className="campo"
                required
                inputMode="tel"
                autoComplete="tel"
                value={datos.telefono}
                onChange={(e) => setDatos({ ...datos, telefono: e.target.value })}
              />
              <span className="pista">Para que el resto de la brigada pueda ubicarte.</span>
            </label>

            <label>
              Municipio donde trabajas
              <input
                className="campo"
                required
                value={datos.municipio}
                onChange={(e) => setDatos({ ...datos, municipio: e.target.value })}
              />
            </label>

            {rol === 'profesional' && (
              <>
                <label>
                  Profesión
                  <select
                    className="campo"
                    value={datos.profesion}
                    onChange={(e) => setDatos({ ...datos, profesion: e.target.value })}
                  >
                    <option>Ingeniero civil</option>
                    <option>Arquitecto</option>
                    <option>Ingeniero estructural</option>
                    <option>Otra</option>
                  </select>
                </label>
                <label>
                  Matrícula profesional
                  <input
                    className="campo"
                    required
                    value={datos.matricula}
                    onChange={(e) => setDatos({ ...datos, matricula: e.target.value })}
                  />
                  <span className="pista">Queda impresa en cada plan que firmes.</span>
                </label>
              </>
            )}
          </div>

          <button type="submit" className="btn btn-principal ancho grande">
            Entrar
          </button>
        </form>
      )}
    </div>
  )
}
