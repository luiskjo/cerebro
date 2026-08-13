import type { Usuario, Vivienda } from './tipos'

/**
 * Persistencia local. La app tiene que funcionar sin senal: los datos viven en
 * el dispositivo del voluntario y se sincronizan exportando/importando un
 * archivo. Las fotos van en IndexedDB porque no caben en localStorage.
 */

const CLAVE_VIVIENDAS = 'casafirme.viviendas.v1'
const CLAVE_SESION = 'casafirme.sesion.v1'
const BD_FOTOS = 'casafirme-fotos'
const ALMACEN_FOTOS = 'fotos'

export function leerViviendas(): Vivienda[] {
  try {
    const crudo = localStorage.getItem(CLAVE_VIVIENDAS)
    if (!crudo) return []
    const datos = JSON.parse(crudo)
    return Array.isArray(datos) ? (datos as Vivienda[]) : []
  } catch {
    return []
  }
}

export function guardarViviendas(viviendas: Vivienda[]): void {
  localStorage.setItem(CLAVE_VIVIENDAS, JSON.stringify(viviendas))
}

/** Devuelve el usuario con sesion abierta en este dispositivo, o null. */
export function leerSesion(): Usuario | null {
  try {
    const crudo = localStorage.getItem(CLAVE_SESION)
    if (!crudo) return null
    const usuario = JSON.parse(crudo) as Usuario
    return usuario?.id && usuario?.nombre ? usuario : null
  } catch {
    return null
  }
}

export function guardarSesion(usuario: Usuario): void {
  localStorage.setItem(CLAVE_SESION, JSON.stringify(usuario))
}

/**
 * Cierra la sesion. NO borra las viviendas: el trabajo de campo puede no estar
 * exportado todavia y perderlo seria irreparable. Quien quiera limpiar el
 * dispositivo lo hace explicitamente desde la pantalla de Datos.
 */
export function borrarSesion(): void {
  localStorage.removeItem(CLAVE_SESION)
}

/* ------------------------------------------------------------------ */
/* Fotos en IndexedDB                                                  */
/* ------------------------------------------------------------------ */

function abrirBD(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const solicitud = indexedDB.open(BD_FOTOS, 1)
    solicitud.onupgradeneeded = () => {
      const bd = solicitud.result
      if (!bd.objectStoreNames.contains(ALMACEN_FOTOS)) bd.createObjectStore(ALMACEN_FOTOS)
    }
    solicitud.onsuccess = () => resolve(solicitud.result)
    solicitud.onerror = () => reject(solicitud.error)
  })
}

export async function guardarFoto(clave: string, dataUrl: string): Promise<void> {
  const bd = await abrirBD()
  await new Promise<void>((resolve, reject) => {
    const tx = bd.transaction(ALMACEN_FOTOS, 'readwrite')
    tx.objectStore(ALMACEN_FOTOS).put(dataUrl, clave)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  bd.close()
}

export async function leerFoto(clave: string): Promise<string | undefined> {
  const bd = await abrirBD()
  const valor = await new Promise<string | undefined>((resolve, reject) => {
    const tx = bd.transaction(ALMACEN_FOTOS, 'readonly')
    const req = tx.objectStore(ALMACEN_FOTOS).get(clave)
    req.onsuccess = () => resolve(req.result as string | undefined)
    req.onerror = () => reject(req.error)
  })
  bd.close()
  return valor
}

export async function borrarFoto(clave: string): Promise<void> {
  const bd = await abrirBD()
  await new Promise<void>((resolve, reject) => {
    const tx = bd.transaction(ALMACEN_FOTOS, 'readwrite')
    tx.objectStore(ALMACEN_FOTOS).delete(clave)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  bd.close()
}

/**
 * Reduce la foto antes de guardarla. En campo se toman fotos de 4 MB y el
 * telefono se queda sin espacio a la decima vivienda.
 */
export function comprimirImagen(archivo: File, ladoMaximo = 1280, calidad = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const lector = new FileReader()
    lector.onerror = () => reject(new Error('No se pudo leer la imagen'))
    lector.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Imagen inválida'))
      img.onload = () => {
        const escala = Math.min(1, ladoMaximo / Math.max(img.width, img.height))
        const ancho = Math.round(img.width * escala)
        const alto = Math.round(img.height * escala)
        const lienzo = document.createElement('canvas')
        lienzo.width = ancho
        lienzo.height = alto
        const ctx = lienzo.getContext('2d')
        if (!ctx) return reject(new Error('No se pudo procesar la imagen'))
        ctx.drawImage(img, 0, 0, ancho, alto)
        resolve(lienzo.toDataURL('image/jpeg', calidad))
      }
      img.src = String(lector.result)
    }
    lector.readAsDataURL(archivo)
  })
}

/* ------------------------------------------------------------------ */
/* Exportar / importar para sincronizar sin internet                   */
/* ------------------------------------------------------------------ */

export interface Paquete {
  version: 1
  exportadoEn: string
  viviendas: Vivienda[]
  fotos: Record<string, string>
}

export async function exportarPaquete(viviendas: Vivienda[], incluirFotos: boolean): Promise<Paquete> {
  const fotos: Record<string, string> = {}
  if (incluirFotos) {
    for (const vivienda of viviendas) {
      for (const foto of vivienda.fotos) {
        const dato = await leerFoto(foto.clave)
        if (dato) fotos[foto.clave] = dato
      }
    }
  }
  return { version: 1, exportadoEn: new Date().toISOString(), viviendas, fotos }
}

export async function importarPaquete(paquete: Paquete, existentes: Vivienda[]): Promise<Vivienda[]> {
  for (const [clave, dato] of Object.entries(paquete.fotos ?? {})) {
    await guardarFoto(clave, dato)
  }
  const porId = new Map(existentes.map((v) => [v.id, v]))
  for (const entrante of paquete.viviendas ?? []) {
    const actual = porId.get(entrante.id)
    porId.set(entrante.id, actual ? fusionarVivienda(actual, entrante) : entrante)
  }
  return [...porId.values()]
}

/**
 * Fusiona dos versiones de la misma vivienda que viajaron por archivos
 * distintos.
 *
 * Por defecto gana la mas reciente, pero hay dos cosas que no se pueden perder
 * por llegar tarde:
 *
 * - **La asignacion**: si dos profesionales tomaron el mismo caso sin verse,
 *   gana quien lo tomo primero. Si no, el ultimo en sincronizar le quitaria el
 *   caso al otro y los dos terminarian revisando lo mismo.
 * - **Una revision firmada**: es trabajo profesional con responsabilidad
 *   detras. Nunca la pisa una version sin firmar, asi sea mas nueva.
 */
export function fusionarVivienda(a: Vivienda, b: Vivienda): Vivienda {
  const [viejo, nuevo] = a.actualizadaEn <= b.actualizadaEn ? [a, b] : [b, a]
  const resultado: Vivienda = { ...nuevo }

  const asignaciones = [a.asignacion, b.asignacion].filter(Boolean) as NonNullable<Vivienda['asignacion']>[]
  if (asignaciones.length > 0) {
    resultado.asignacion = asignaciones.reduce((primera, x) => (x.tomadaEn < primera.tomadaEn ? x : primera))
  }

  if (viejo.revision?.firmada && !nuevo.revision?.firmada) {
    resultado.revision = viejo.revision
    resultado.estado = viejo.estado
  }

  return resultado
}

export function descargarArchivo(nombre: string, contenido: string, tipo = 'application/json'): void {
  const blob = new Blob([contenido], { type: tipo })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function nuevoId(prefijo = 'v'): string {
  return `${prefijo}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}
