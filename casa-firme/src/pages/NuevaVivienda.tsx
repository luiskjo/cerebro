import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../lib/estado'

export function NuevaVivienda() {
  const { crearVivienda, perfil } = useApp()
  const navegar = useNavigate()
  const [datos, setDatos] = useState({
    municipio: perfil.municipio,
    veredaBarrio: '',
    direccion: '',
    responsableNombre: '',
    responsableTelefono: '',
    personas: 0,
    personasVulnerables: 0,
  })
  const [gps, setGps] = useState<{ lat: number; lon: number; precision?: number }>()
  const [gpsEstado, setGpsEstado] = useState<'inactivo' | 'buscando' | 'error'>('inactivo')

  function tomarGps() {
    if (!navigator.geolocation) {
      setGpsEstado('error')
      return
    }
    setGpsEstado('buscando')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGps({
          lat: Number(pos.coords.latitude.toFixed(6)),
          lon: Number(pos.coords.longitude.toFixed(6)),
          precision: Math.round(pos.coords.accuracy),
        })
        setGpsEstado('inactivo')
      },
      () => setGpsEstado('error'),
      { enableHighAccuracy: true, timeout: 15000 },
    )
  }

  return (
    <form
      className="pila"
      onSubmit={(e) => {
        e.preventDefault()
        const vivienda = crearVivienda({ ...datos, puntoGps: gps })
        navegar(`/vivienda/${vivienda.id}/evaluacion`)
      }}
    >
      <h1>Nueva vivienda</h1>
      <p className="tenue">
        Solo lo indispensable para identificarla. Lo demás se llena en la evaluación.
      </p>

      <div className="tarjeta pila">
        <label>
          Municipio
          <input className="campo" required value={datos.municipio} onChange={(e) => setDatos({ ...datos, municipio: e.target.value })} />
        </label>
        <label>
          Vereda o barrio
          <input className="campo" value={datos.veredaBarrio} onChange={(e) => setDatos({ ...datos, veredaBarrio: e.target.value })} />
        </label>
        <label>
          Dirección o referencia
          <input
            className="campo"
            required
            placeholder="Ej: casa azul frente a la escuela"
            value={datos.direccion}
            onChange={(e) => setDatos({ ...datos, direccion: e.target.value })}
          />
        </label>

        <div className="pila-chica">
          <button type="button" className="btn btn-secundario" onClick={tomarGps}>
            📍 {gpsEstado === 'buscando' ? 'Buscando señal…' : 'Marcar ubicación GPS'}
          </button>
          {gps && (
            <p className="tenue chico">
              {gps.lat}, {gps.lon} (±{gps.precision} m)
            </p>
          )}
          {gpsEstado === 'error' && (
            <p className="tenue chico">No se pudo tomar el GPS. No importa: sigue con la dirección escrita.</p>
          )}
        </div>
      </div>

      <div className="tarjeta pila">
        <h2>La familia</h2>
        <label>
          Nombre de quien responde
          <input className="campo" value={datos.responsableNombre} onChange={(e) => setDatos({ ...datos, responsableNombre: e.target.value })} />
        </label>
        <label>
          Teléfono
          <input className="campo" inputMode="tel" value={datos.responsableTelefono} onChange={(e) => setDatos({ ...datos, responsableTelefono: e.target.value })} />
        </label>
        <div className="fila">
          <label>
            Personas que viven ahí
            <input
              className="campo"
              type="number"
              min={0}
              value={datos.personas || ''}
              onChange={(e) => setDatos({ ...datos, personas: Number(e.target.value) })}
            />
          </label>
          <label>
            De ellas, niños, adultos mayores o personas con discapacidad
            <input
              className="campo"
              type="number"
              min={0}
              value={datos.personasVulnerables || ''}
              onChange={(e) => setDatos({ ...datos, personasVulnerables: Number(e.target.value) })}
            />
          </label>
        </div>
      </div>

      <button type="submit" className="btn btn-principal ancho grande">
        Empezar la evaluación
      </button>
    </form>
  )
}
