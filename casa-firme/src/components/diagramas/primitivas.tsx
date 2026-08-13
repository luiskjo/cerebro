import type { ReactNode } from 'react'

/**
 * Piezas basicas de dibujo. Todos los dibujos usan el mismo lienzo de 320x200
 * para que se vean parejos, y colores por variable CSS para que funcionen en
 * claro y en oscuro.
 */

export const ANCHO = 320
export const ALTO = 200

export function Lienzo({ children, titulo }: { children: ReactNode; titulo: string }) {
  return (
    <svg
      viewBox={`0 0 ${ANCHO} ${ALTO}`}
      className="dibujo"
      role="img"
      aria-label={titulo}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <marker id="punta" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0 0 L10 5 L0 10 z" fill="currentColor" />
        </marker>
        <pattern id="ladrillos" width="20" height="10" patternUnits="userSpaceOnUse">
          <rect width="20" height="10" fill="none" />
          <path d="M0 0 H20 M0 10 H20 M10 0 V5 M0 5 H20 M20 5 V10 M0 5 V10" stroke="currentColor" strokeWidth="0.5" opacity="0.35" />
        </pattern>
        <pattern id="tierra" width="8" height="8" patternUnits="userSpaceOnUse">
          <path d="M0 8 L8 0 M-2 2 L2 -2 M6 10 L10 6" stroke="currentColor" strokeWidth="0.6" opacity="0.4" />
        </pattern>
      </defs>
      {children}
    </svg>
  )
}

export function Etiqueta({
  x,
  y,
  children,
  ancla = 'start',
  tam = 9.5,
  fuerte,
  tono,
}: {
  x: number
  y: number
  children: ReactNode
  ancla?: 'start' | 'middle' | 'end'
  tam?: number
  fuerte?: boolean
  tono?: 'peligro' | 'bien' | 'aviso'
}) {
  const clase = tono ? `t-${tono}` : ''
  return (
    <text
      x={x}
      y={y}
      textAnchor={ancla}
      fontSize={tam}
      fontWeight={fuerte ? 700 : 400}
      className={clase}
      fill="currentColor"
    >
      {children}
    </text>
  )
}

/** Linea guia con punta de flecha, para senalar una parte del dibujo. */
export function Guia({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke="currentColor"
      strokeWidth="0.8"
      opacity="0.6"
      markerEnd="url(#punta)"
    />
  )
}

/** Cota horizontal o vertical con su texto. */
export function Cota({
  x1,
  y1,
  x2,
  y2,
  texto,
  desplazar = 0,
}: {
  x1: number
  y1: number
  x2: number
  y2: number
  texto: string
  desplazar?: number
}) {
  const horizontal = Math.abs(x2 - x1) > Math.abs(y2 - y1)
  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2
  return (
    <g className="cota">
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth="0.7" opacity="0.8" />
      <line x1={x1} y1={y1 - 3} x2={x1} y2={y1 + 3} stroke="currentColor" strokeWidth="0.7" opacity="0.8" />
      <line x1={x2} y1={y2 - 3} x2={x2} y2={y2 + 3} stroke="currentColor" strokeWidth="0.7" opacity="0.8" />
      <text
        x={horizontal ? mx : mx + desplazar}
        y={horizontal ? my - 4 + desplazar : my}
        textAnchor="middle"
        fontSize="8.5"
        fill="currentColor"
      >
        {texto}
      </text>
    </g>
  )
}

export function Suelo({ y = 165, desde = 10, hasta = 310 }: { y?: number; desde?: number; hasta?: number }) {
  return (
    <g>
      <line x1={desde} y1={y} x2={hasta} y2={y} stroke="currentColor" strokeWidth="1.4" />
      <rect x={desde} y={y} width={hasta - desde} height="12" fill="url(#tierra)" />
    </g>
  )
}

/** Silueta de persona a escala, para que se entienda el tamano real. */
export function Persona({ x, y, alto = 40 }: { x: number; y: number; alto?: number }) {
  const k = alto / 40
  return (
    <g stroke="currentColor" strokeWidth="1.2" fill="none" opacity="0.75">
      <circle cx={x} cy={y - 34 * k} r={4 * k} />
      <path d={`M${x} ${y - 30 * k} V${y - 14 * k} M${x} ${y - 26 * k} L${x - 6 * k} ${y - 18 * k} M${x} ${y - 26 * k} L${x + 6 * k} ${y - 18 * k} M${x} ${y - 14 * k} L${x - 5 * k} ${y} M${x} ${y - 14 * k} L${x + 5 * k} ${y}`} />
    </g>
  )
}

export function Marco({
  x,
  y,
  ancho,
  alto,
  relleno = 'none',
  trazo = 1.3,
}: {
  x: number
  y: number
  ancho: number
  alto: number
  relleno?: string
  trazo?: number
}) {
  return <rect x={x} y={y} width={ancho} height={alto} fill={relleno} stroke="currentColor" strokeWidth={trazo} />
}

/** Marca de "asi no" sobre una zona del dibujo. */
export function Mal({ x, y, r = 11 }: { x: number; y: number; r?: number }) {
  return (
    <g className="t-peligro">
      <circle cx={x} cy={y} r={r} fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d={`M${x - r * 0.5} ${y - r * 0.5} L${x + r * 0.5} ${y + r * 0.5} M${x + r * 0.5} ${y - r * 0.5} L${x - r * 0.5} ${y + r * 0.5}`} stroke="currentColor" strokeWidth="1.8" />
    </g>
  )
}

/** Marca de "asi si". */
export function Bien({ x, y, r = 11 }: { x: number; y: number; r?: number }) {
  return (
    <g className="t-bien">
      <circle cx={x} cy={y} r={r} fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d={`M${x - r * 0.5} ${y} L${x - r * 0.1} ${y + r * 0.45} L${x + r * 0.55} ${y - r * 0.45}`} fill="none" stroke="currentColor" strokeWidth="1.8" />
    </g>
  )
}

/** Grieta dibujada como quebrada, no como linea recta: asi se ven de verdad. */
export function Grieta({
  puntos,
  grosor = 2,
  tono = 'peligro',
}: {
  puntos: [number, number][]
  grosor?: number
  tono?: 'peligro' | 'aviso'
}) {
  const d = puntos.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]} ${p[1]}`).join(' ')
  return <path d={d} fill="none" strokeLinejoin="round" strokeWidth={grosor} className={`t-${tono}`} stroke="currentColor" />
}
