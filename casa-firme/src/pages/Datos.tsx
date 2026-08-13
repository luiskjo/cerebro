import { useState } from 'react'
import { useApp } from '../lib/estado'
import { descargarArchivo, exportarPaquete, importarPaquete, type Paquete } from '../lib/almacenamiento'

/**
 * Sincronizacion sin servidor: el voluntario exporta un archivo cuando llega a
 * donde hay senal y se lo pasa al coordinador, que lo importa y lo reparte.
 */
export function Datos() {
  const { viviendas, reemplazarTodo } = useApp()
  const [mensaje, setMensaje] = useState<string>()
  const [trabajando, setTrabajando] = useState(false)

  async function exportar(conFotos: boolean) {
    setTrabajando(true)
    try {
      const paquete = await exportarPaquete(viviendas, conFotos)
      const fecha = new Date().toISOString().slice(0, 10)
      descargarArchivo(`casa-firme-${fecha}${conFotos ? '-con-fotos' : ''}.json`, JSON.stringify(paquete))
      setMensaje(`Se exportaron ${viviendas.length} viviendas${conFotos ? ' con sus fotos' : ''}.`)
    } catch {
      setMensaje('No se pudo exportar.')
    } finally {
      setTrabajando(false)
    }
  }

  async function importar(archivo: File) {
    setTrabajando(true)
    try {
      const paquete = JSON.parse(await archivo.text()) as Paquete
      if (!Array.isArray(paquete.viviendas)) throw new Error('formato')
      const combinadas = await importarPaquete(paquete, viviendas)
      reemplazarTodo(combinadas)
      setMensaje(`Se importaron ${paquete.viviendas.length} viviendas. Ahora tienes ${combinadas.length}.`)
    } catch {
      setMensaje('El archivo no es válido o está dañado.')
    } finally {
      setTrabajando(false)
    }
  }

  return (
    <div className="pila">
      <h1>Datos</h1>
      <p className="tenue">
        Esta app guarda todo en tu dispositivo y funciona sin internet. Para juntar el trabajo de varias
        personas, se exporta y se importa un archivo.
      </p>

      <section className="tarjeta pila">
        <h2>Exportar</h2>
        <p>Tienes {viviendas.length} vivienda{viviendas.length === 1 ? '' : 's'} guardadas.</p>
        <button type="button" className="btn btn-principal ancho" disabled={trabajando} onClick={() => void exportar(false)}>
          Exportar solo los datos (archivo liviano)
        </button>
        <button type="button" className="btn btn-secundario ancho" disabled={trabajando} onClick={() => void exportar(true)}>
          Exportar con fotos (archivo pesado, usa wifi)
        </button>
      </section>

      <section className="tarjeta pila">
        <h2>Importar</h2>
        <p className="tenue">
          Si una vivienda ya existe, se queda la versión modificada más recientemente.
        </p>
        <label className="btn btn-secundario ancho">
          Elegir archivo
          <input
            type="file"
            accept="application/json,.json"
            hidden
            disabled={trabajando}
            onChange={(e) => {
              const archivo = e.target.files?.[0]
              if (archivo) void importar(archivo)
              e.target.value = ''
            }}
          />
        </label>
      </section>

      {mensaje && <p className="aviso aviso-bien">{mensaje}</p>}

      <section className="tarjeta pila">
        <h2>Cuidado con los datos personales</h2>
        <p>
          Este archivo lleva nombres, teléfonos y ubicaciones de familias afectadas. Compártelo solo con el
          coordinador de la brigada y no lo publiques en grupos abiertos.
        </p>
      </section>
    </div>
  )
}
