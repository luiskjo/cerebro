import type { Habitabilidad, Severidad } from '../lib/tipos'
import { DESCRIPCION_HABITABILIDAD, ETIQUETA_HABITABILIDAD, ETIQUETA_SEVERIDAD } from '../lib/tipos'

export function Semaforo({
  valor,
  tamano = 'normal',
  conDescripcion,
}: {
  valor: Habitabilidad
  tamano?: 'chico' | 'normal' | 'grande'
  conDescripcion?: boolean
}) {
  return (
    <div className={`semaforo semaforo-${valor} semaforo-${tamano}`}>
      <div className="semaforo-cabeza">
        <span className="semaforo-punto" aria-hidden="true" />
        <strong>{ETIQUETA_HABITABILIDAD[valor]}</strong>
      </div>
      {conDescripcion && <p className="semaforo-texto">{DESCRIPCION_HABITABILIDAD[valor]}</p>}
    </div>
  )
}

export function BarraSeveridad({ valor }: { valor: Severidad }) {
  return (
    <div className="severidad" title={ETIQUETA_SEVERIDAD[valor]}>
      <div className="severidad-barras" aria-hidden="true">
        {[1, 2, 3, 4].map((n) => (
          <span key={n} className={`severidad-barra ${valor >= n ? `nivel-${valor}` : ''}`} />
        ))}
      </div>
      <span className="severidad-texto">{ETIQUETA_SEVERIDAD[valor]}</span>
    </div>
  )
}
