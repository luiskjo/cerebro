import { Bien, Cota, Etiqueta, Grieta, Guia, Lienzo, Mal, Marco, Persona, Suelo } from './primitivas'

/* =================================================================== */
/* Dibujos de evaluacion                                               */
/* =================================================================== */

export function PeligroInmediato() {
  return (
    <Lienzo titulo="Señales de peligro inmediato">
      <Suelo />
      {/* casa inclinada */}
      <path d="M40 165 L52 95 L112 88 L104 165 Z" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M46 96 L82 72 L118 86" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <Etiqueta x={72} y={182} ancla="middle" tono="peligro" fuerte>Inclinada</Etiqueta>

      {/* techo hundido */}
      <path d="M140 165 V100 H212 V165" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M138 100 L176 122 L214 100" fill="none" stroke="currentColor" strokeWidth="1.8" className="t-peligro" />
      <Etiqueta x={176} y={182} ancla="middle" tono="peligro" fuerte>Techo hundido</Etiqueta>

      {/* muro caido */}
      <path d="M246 165 V96 H262" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M262 96 L300 100" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M270 165 l10 -8 l12 6 l10 -5 l8 7 z" fill="url(#tierra)" stroke="currentColor" strokeWidth="1.1" />
      <Etiqueta x={282} y={182} ancla="middle" tono="peligro" fuerte>Muro caído</Etiqueta>

      <Etiqueta x={160} y={22} ancla="middle" fuerte tam={11}>Si ves cualquiera de estas tres: NO ENTRES</Etiqueta>
      <Etiqueta x={160} y={36} ancla="middle" tam={9}>Acordona, saca a la familia y reporta de inmediato.</Etiqueta>
    </Lienzo>
  )
}

export function Plomada() {
  return (
    <Lienzo titulo="Cómo medir si un muro está inclinado">
      <Suelo y={170} />
      {/* muro inclinado */}
      <path d="M60 170 L72 40 L112 40 L100 170 Z" fill="url(#ladrillos)" stroke="currentColor" strokeWidth="1.4" />
      {/* cuerda */}
      <line x1={78} y1={42} x2={78} y2={158} stroke="currentColor" strokeWidth="1" strokeDasharray="3 2" />
      <circle cx={78} cy={160} r={4} fill="currentColor" />
      <Etiqueta x={84} y={162} tam={8.5}>plomada</Etiqueta>
      {/* separaciones */}
      <Cota x1={72} y1={46} x2={78} y2={46} texto="5 cm" desplazar={-6} />
      <Cota x1={64} y1={156} x2={78} y2={156} texto="12 cm" desplazar={16} />
      <Guia x1={150} y1={100} x2={112} y2={100} />
      <Etiqueta x={154} y={92} fuerte>Desplome = 12 − 5 = 7 cm</Etiqueta>
      <Etiqueta x={154} y={106} tam={9}>Anota ese número (7) en la app.</Etiqueta>

      <Etiqueta x={154} y={128} fuerte tam={9.5}>Cómo se hace</Etiqueta>
      <Etiqueta x={154} y={141} tam={9}>1. Amarra algo pesado a una cuerda.</Etiqueta>
      <Etiqueta x={154} y={153} tam={9}>2. Cuélgala desde arriba del muro.</Etiqueta>
      <Etiqueta x={154} y={165} tam={9}>3. Mide arriba y abajo. Resta.</Etiqueta>
      <Etiqueta x={160} y={20} ancla="middle" fuerte tam={11}>La plomada nunca miente</Etiqueta>
    </Lienzo>
  )
}

export function MedirGrieta() {
  const filas = [
    { y: 52, w: 0.6, nombre: 'Como un pelo', ref: 'no entra la uña', menos: 'menos de 0,2 mm' },
    { y: 82, w: 1.4, nombre: 'Fina', ref: 'entra una hoja de papel', menos: 'hasta 1 mm' },
    { y: 112, w: 3, nombre: 'Media', ref: 'entra la uña o una moneda de canto', menos: '1 a 5 mm' },
    { y: 142, w: 5.5, nombre: 'Ancha', ref: 'entra un lápiz', menos: '5 a 15 mm' },
    { y: 172, w: 9, nombre: 'Muy ancha', ref: 'entra un dedo o se ve el otro lado', menos: 'más de 15 mm' },
  ]
  return (
    <Lienzo titulo="Cómo saber de qué tamaño es una grieta">
      <Etiqueta x={160} y={20} ancla="middle" fuerte tam={11}>No necesitas regla: usa lo que tienes</Etiqueta>
      <Etiqueta x={160} y={33} ancla="middle" tam={8.5}>Compara la grieta con estas referencias y elige la que más se parezca.</Etiqueta>
      {filas.map((f) => (
        <g key={f.nombre}>
          <rect x={16} y={f.y - 12} width={40} height={22} fill="url(#ladrillos)" stroke="currentColor" strokeWidth="0.8" />
          <rect x={34} y={f.y - 12} width={f.w} height={22} className={f.w >= 3 ? 't-peligro' : 't-aviso'} fill="currentColor" />
          <Etiqueta x={64} y={f.y - 2} fuerte tam={9.5}>{f.nombre}</Etiqueta>
          <Etiqueta x={64} y={f.y + 8} tam={8.5}>{f.menos} — {f.ref}</Etiqueta>
        </g>
      ))}
    </Lienzo>
  )
}

export function GrietasTipos() {
  return (
    <Lienzo titulo="Tipos de grieta en un muro y qué significan">
      <Etiqueta x={160} y={16} ancla="middle" fuerte tam={11}>La forma de la grieta dice qué le pasó al muro</Etiqueta>

      {/* muro 1: diagonal / X */}
      <Marco x={14} y={34} ancho={88} alto={70} relleno="url(#ladrillos)" />
      <Marco x={44} y={62} ancho={26} alto={42} />
      <Grieta puntos={[[22, 42], [42, 60], [50, 74], [70, 92], [92, 100]]} grosor={2.2} />
      <Grieta puntos={[[94, 42], [74, 60], [66, 74], [46, 92], [24, 100]]} grosor={2.2} />
      <Etiqueta x={58} y={118} ancla="middle" fuerte tam={9.5} tono="peligro">Diagonal o en X</Etiqueta>
      <Etiqueta x={58} y={130} ancla="middle" tam={8.5}>El muro resistió el sismo</Etiqueta>
      <Etiqueta x={58} y={140} ancla="middle" tam={8.5}>y se agrietó. Es la más</Etiqueta>
      <Etiqueta x={58} y={150} ancla="middle" tam={8.5}>importante de todas.</Etiqueta>

      {/* muro 2: vertical en esquina */}
      <Marco x={116} y={34} ancho={88} alto={70} relleno="url(#ladrillos)" />
      <Grieta puntos={[[128, 34], [126, 54], [130, 76], [127, 104]]} grosor={2.2} />
      <Etiqueta x={160} y={118} ancla="middle" fuerte tam={9.5} tono="peligro">Vertical en la esquina</Etiqueta>
      <Etiqueta x={160} y={130} ancla="middle" tam={8.5}>Los dos muros se están</Etiqueta>
      <Etiqueta x={160} y={140} ancla="middle" tam={8.5}>soltando. El muro suelto</Etiqueta>
      <Etiqueta x={160} y={150} ancla="middle" tam={8.5}>se vuelca hacia afuera.</Etiqueta>

      {/* muro 3: horizontal */}
      <Marco x={218} y={34} ancho={88} alto={70} relleno="url(#ladrillos)" />
      <Grieta puntos={[[220, 92], [244, 89], [268, 93], [304, 90]]} grosor={2.2} />
      <Etiqueta x={262} y={118} ancla="middle" fuerte tam={9.5} tono="peligro">Horizontal</Etiqueta>
      <Etiqueta x={262} y={130} ancla="middle" tam={8.5}>El muro se está corriendo</Etiqueta>
      <Etiqueta x={262} y={140} ancla="middle" tam={8.5}>o volcando sobre esa línea.</Etiqueta>
      <Etiqueta x={262} y={150} ancla="middle" tam={8.5}>Muy peligroso.</Etiqueta>

      <Etiqueta x={160} y={172} ancla="middle" tam={9} fuerte>Toma foto de cada grieta con una moneda o un lápiz al lado.</Etiqueta>
      <Etiqueta x={160} y={186} ancla="middle" tam={8.5}>Sin escala en la foto, el ingeniero no puede saber qué tan grave es.</Etiqueta>
    </Lienzo>
  )
}

export function SeparacionMuros() {
  return (
    <Lienzo titulo="Muros que se separan en la esquina">
      <Etiqueta x={160} y={18} ancla="middle" fuerte tam={11}>Párate en la esquina y mira hacia arriba</Etiqueta>
      {/* vista isometrica sencilla */}
      <path d="M60 60 L60 150 L140 168 L140 78 Z" fill="url(#ladrillos)" stroke="currentColor" strokeWidth="1.3" />
      <path d="M140 78 L230 52 L230 142 L140 168 Z" fill="url(#ladrillos)" stroke="currentColor" strokeWidth="1.3" opacity="0.9" />
      <Grieta puntos={[[140, 78], [136, 100], [142, 124], [138, 168]]} grosor={2.6} />
      <Guia x1={262} y1={92} x2={148} y2={110} />
      <Etiqueta x={252} y={86} ancla="end" fuerte tono="peligro">Aquí se abre</Etiqueta>
      <Etiqueta x={266} y={110} ancla="middle" tam={8.5}>Mide el ancho</Etiqueta>
      <Etiqueta x={266} y={121} ancla="middle" tam={8.5}>arriba y abajo:</Etiqueta>
      <Etiqueta x={266} y={132} ancla="middle" tam={8.5}>casi siempre es</Etiqueta>
      <Etiqueta x={266} y={143} ancla="middle" tam={8.5}>más ancha arriba.</Etiqueta>
      <Etiqueta x={160} y={188} ancla="middle" tam={9}>Un muro que se soltó de sus vecinos ya no está amarrado: se cae solo.</Etiqueta>
    </Lienzo>
  )
}

export function MuroConfinado() {
  return (
    <Lienzo titulo="Partes de un muro de ladrillo confinado">
      <Etiqueta x={160} y={16} ancla="middle" fuerte tam={11}>Muro confinado: así debe ser</Etiqueta>
      <Marco x={70} y={38} ancho={170} alto={22} relleno="rgba(127,127,127,0.25)" />
      <Marco x={70} y={60} ancho={22} alto={98} relleno="rgba(127,127,127,0.25)" />
      <Marco x={218} y={60} ancho={22} alto={98} relleno="rgba(127,127,127,0.25)" />
      <rect x={92} y={60} width={126} height={98} fill="url(#ladrillos)" stroke="currentColor" strokeWidth="1.1" />
      <Marco x={70} y={158} ancho={170} alto={14} relleno="rgba(127,127,127,0.25)" />
      <Suelo y={172} desde={40} hasta={280} />

      <Guia x1={40} y1={44} x2={68} y2={48} />
      <Etiqueta x={36} y={42} ancla="end" fuerte tam={9}>Viga de amarre</Etiqueta>
      <Guia x1={44} y1={100} x2={68} y2={100} />
      <Etiqueta x={40} y={98} ancla="end" fuerte tam={9}>Columna de</Etiqueta>
      <Etiqueta x={40} y={108} ancla="end" fuerte tam={9}>confinamiento</Etiqueta>
      <Guia x1={280} y1={100} x2={244} y2={100} />
      <Etiqueta x={284} y={98} tam={9}>Van en las esquinas</Etiqueta>
      <Etiqueta x={284} y={108} tam={9}>y máximo cada 4 m</Etiqueta>
      <Guia x1={276} y1={164} x2={244} y2={164} />
      <Etiqueta x={280} y={166} tam={9}>Cimiento</Etiqueta>
      <Etiqueta x={160} y={190} ancla="middle" tam={9}>Si la casa NO tiene columnas ni viga de amarre, márcalo: cambia todo el diagnóstico.</Etiqueta>
    </Lienzo>
  )
}

export function MuroBahareque() {
  return (
    <Lienzo titulo="Partes de un muro de bahareque encementado">
      <Etiqueta x={160} y={15} ancla="middle" fuerte tam={11}>Bahareque encementado por dentro</Etiqueta>
      {/* solera superior */}
      <rect x={50} y={32} width={180} height={9} fill="rgba(127,127,127,0.3)" stroke="currentColor" strokeWidth="1.1" />
      {/* pie derechos */}
      {[62, 100, 138, 176, 214].map((x) => (
        <rect key={x} x={x} y={41} width={8} height={96} fill="rgba(127,127,127,0.2)" stroke="currentColor" strokeWidth="1" />
      ))}
      {/* diagonal */}
      <path d="M68 135 L216 45" stroke="currentColor" strokeWidth="4" opacity="0.55" />
      {/* solera inferior */}
      <rect x={50} y={137} width={180} height={9} fill="rgba(127,127,127,0.3)" stroke="currentColor" strokeWidth="1.1" />
      {/* sobrecimiento */}
      <rect x={46} y={146} width={188} height={20} fill="url(#tierra)" stroke="currentColor" strokeWidth="1.2" />
      <Suelo y={166} desde={20} hasta={300} />
      {/* capa de malla/repello mostrada como recorte a la derecha */}
      <path d="M230 32 L262 32 L262 146 L230 146" fill="none" stroke="currentColor" strokeWidth="1.1" strokeDasharray="3 2" />
      <path d="M234 36 v106 M242 36 v106 M250 36 v106 M258 36 v106 M230 44 h32 M230 60 h32 M230 76 h32 M230 92 h32 M230 108 h32 M230 124 h32 M230 140 h32" stroke="currentColor" strokeWidth="0.5" opacity="0.5" />

      <Guia x1={26} y1={36} x2={48} y2={36} />
      <Etiqueta x={22} y={38} ancla="end" tam={8.5} fuerte>Solera superior</Etiqueta>
      <Guia x1={26} y1={90} x2={60} y2={90} />
      <Etiqueta x={22} y={92} ancla="end" tam={8.5} fuerte>Pie derecho</Etiqueta>
      <Guia x1={140} y1={186} x2={142} y2={96} />
      <Etiqueta x={140} y={196} ancla="middle" tam={8.5} fuerte>Diagonal (riostra)</Etiqueta>
      <Guia x1={26} y1={156} x2={44} y2={156} />
      <Etiqueta x={22} y={158} ancla="end" tam={8.5} fuerte>Sobrecimiento</Etiqueta>
      <Guia x1={296} y1={70} x2={264} y2={80} />
      <Etiqueta x={300} y={62} ancla="end" tam={8.5} fuerte>Esterilla</Etiqueta>
      <Etiqueta x={300} y={72} ancla="end" tam={8.5} fuerte>+ malla</Etiqueta>
      <Etiqueta x={300} y={82} ancla="end" tam={8.5} fuerte>+ repello</Etiqueta>
      <Etiqueta x={160} y={186} ancla="middle" tam={8.5}>Golpea el muro: debe sonar hueco y firme. Si suena blando, el repello ya se despegó.</Etiqueta>
    </Lienzo>
  )
}

export function GuaduaPatologias() {
  return (
    <Lienzo titulo="Cómo saber si la guadua está dañada">
      <Etiqueta x={160} y={16} ancla="middle" fuerte tam={11}>Píncha la guadua con un destornillador</Etiqueta>
      {/* sana */}
      <g>
        <rect x={26} y={40} width={26} height={100} rx={5} fill="none" stroke="currentColor" strokeWidth="1.4" />
        <path d="M26 68 h26 M26 96 h26 M26 124 h26" stroke="currentColor" strokeWidth="1.2" />
        <Bien x={39} y={158} r={9} />
        <Etiqueta x={39} y={182} ancla="middle" tam={8.5} fuerte>Sana</Etiqueta>
        <Etiqueta x={39} y={192} ancla="middle" tam={8}>dura, seca</Etiqueta>
      </g>
      {/* humedad */}
      <g>
        <rect x={98} y={40} width={26} height={100} rx={5} fill="none" stroke="currentColor" strokeWidth="1.4" />
        <ellipse cx={111} cy={80} rx={11} ry={18} fill="currentColor" opacity="0.28" />
        <Etiqueta x={111} y={182} ancla="middle" tam={8.5} fuerte tono="aviso">Húmeda</Etiqueta>
        <Etiqueta x={111} y={192} ancla="middle" tam={8}>manchas oscuras</Etiqueta>
      </g>
      {/* insectos */}
      <g>
        <rect x={170} y={40} width={26} height={100} rx={5} fill="none" stroke="currentColor" strokeWidth="1.4" />
        {[52, 66, 78, 92, 104, 118, 130].map((y, i) => (
          <circle key={y} cx={178 + (i % 3) * 6} cy={y} r={1.6} fill="currentColor" className="t-peligro" />
        ))}
        <Etiqueta x={183} y={182} ancla="middle" tam={8.5} fuerte tono="peligro">Comején</Etiqueta>
        <Etiqueta x={183} y={192} ancla="middle" tam={8}>huequitos y polvillo</Etiqueta>
      </g>
      {/* podrida */}
      <g>
        <rect x={242} y={40} width={26} height={100} rx={5} fill="none" stroke="currentColor" strokeWidth="1.4" />
        <path d="M242 96 q13 -14 26 0 q-13 22 -26 0" fill="currentColor" opacity="0.4" className="t-peligro" />
        <Mal x={255} y={158} r={9} />
        <Etiqueta x={255} y={182} ancla="middle" tam={8.5} fuerte tono="peligro">Podrida</Etiqueta>
        <Etiqueta x={255} y={192} ancla="middle" tam={8}>se hunde al picar</Etiqueta>
      </g>
      <Etiqueta x={160} y={32} ancla="middle" tam={8.5}>Si la punta se hunde fácil, esa pieza hay que cambiarla. No se repara.</Etiqueta>
    </Lienzo>
  )
}

export function GuaduaUniones() {
  return (
    <Lienzo titulo="Uniones correctas en guadua">
      <Etiqueta x={160} y={16} ancla="middle" fuerte tam={11}>Con perno sí. Con clavo no.</Etiqueta>
      {/* bien */}
      <g>
        <rect x={30} y={60} width={110} height={26} rx={8} fill="none" stroke="currentColor" strokeWidth="1.4" />
        <line x1={62} y1={60} x2={62} y2={86} stroke="currentColor" strokeWidth="1.2" />
        <line x1={104} y1={60} x2={104} y2={86} stroke="currentColor" strokeWidth="1.2" />
        <line x1={84} y1={52} x2={84} y2={94} stroke="currentColor" strokeWidth="2.4" />
        <circle cx={84} cy={54} r={3.5} fill="currentColor" />
        <circle cx={84} cy={92} r={3.5} fill="currentColor" />
        <rect x={64} y={60} width={40} height={26} fill="currentColor" opacity="0.2" />
        <Bien x={155} y={73} r={10} />
        <Etiqueta x={30} y={110} tam={8.5} fuerte>Perno de ⅜" con arandela</Etiqueta>
        <Etiqueta x={30} y={121} tam={8.5}>El canuto va relleno de mortero</Etiqueta>
        <Etiqueta x={30} y={132} tam={8.5}>para que no se aplaste al apretar.</Etiqueta>
      </g>
      {/* mal */}
      <g>
        <rect x={30} y={150} width={110} height={26} rx={8} fill="none" stroke="currentColor" strokeWidth="1.4" />
        <Grieta puntos={[[36, 158], [70, 156], [104, 160], [138, 157]]} grosor={1.8} />
        <line x1={84} y1={146} x2={84} y2={170} stroke="currentColor" strokeWidth="1.6" />
        <Mal x={155} y={163} r={10} />
        <Etiqueta x={176} y={158} tam={8.5} fuerte tono="peligro">El clavo raja la guadua</Etiqueta>
        <Etiqueta x={176} y={169} tam={8.5}>a lo largo de la fibra.</Etiqueta>
        <Etiqueta x={176} y={180} tam={8.5}>Busca esas rajaduras.</Etiqueta>
      </g>
      <Etiqueta x={176} y={62} tam={8.5} fuerte>Corta siempre</Etiqueta>
      <Etiqueta x={176} y={73} tam={8.5}>3 a 5 cm después</Etiqueta>
      <Etiqueta x={176} y={84} tam={8.5}>de un nudo.</Etiqueta>
    </Lienzo>
  )
}

export function TapiaFallas() {
  return (
    <Lienzo titulo="Cómo falla un muro de tierra">
      <Etiqueta x={160} y={16} ancla="middle" fuerte tam={11}>La tapia se vuelca hacia afuera</Etiqueta>
      <Suelo y={168} />
      <path d="M50 168 V56 H150 V168" fill="url(#tierra)" stroke="currentColor" strokeWidth="1.4" />
      <Grieta puntos={[[52, 56], [58, 82], [50, 110], [56, 140], [50, 168]]} grosor={2.4} />
      <Grieta puntos={[[148, 56], [142, 84], [150, 112], [144, 142], [150, 168]]} grosor={2.4} />
      <Guia x1={100} y1={38} x2={60} y2={56} />
      <Etiqueta x={104} y={36} tam={9} fuerte tono="peligro">Grieta vertical en la esquina</Etiqueta>
      <Etiqueta x={104} y={47} tam={8.5}>= el muro ya se soltó</Etiqueta>

      {/* volcamiento en corte */}
      <g transform="translate(190,0)">
        <Suelo y={168} desde={0} hasta={130} />
        <path d="M30 168 L38 60 L60 58 L54 168 Z" fill="url(#tierra)" stroke="currentColor" strokeWidth="1.4" />
        <line x1={30} y1={168} x2={30} y2={52} stroke="currentColor" strokeWidth="0.8" strokeDasharray="3 2" />
        <Cota x1={30} y1={64} x2={38} y2={64} texto="se sale" desplazar={-8} />
        <Persona x={92} y={168} alto={44} />
        <Etiqueta x={62} y={186} tam={8.5} fuerte tono="peligro">Nunca trabajes ni</Etiqueta>
        <Etiqueta x={62} y={196} tam={8.5} fuerte tono="peligro">duermas junto a esto</Etiqueta>
      </g>
    </Lienzo>
  )
}

export function CubiertaGuadua() {
  return (
    <Lienzo titulo="Partes del techo de guadua con teja de barro">
      <Etiqueta x={160} y={15} ancla="middle" fuerte tam={11}>Partes del techo</Etiqueta>
      {/* cercha */}
      <path d="M40 130 L160 52 L280 130" fill="none" stroke="currentColor" strokeWidth="2" />
      <line x1={40} y1={130} x2={280} y2={130} stroke="currentColor" strokeWidth="2" />
      <line x1={160} y1={52} x2={160} y2={130} stroke="currentColor" strokeWidth="1.4" />
      <line x1={100} y1={91} x2={160} y2={130} stroke="currentColor" strokeWidth="1.4" />
      <line x1={220} y1={91} x2={160} y2={130} stroke="currentColor" strokeWidth="1.4" />
      {/* correas */}
      {[[70, 111], [100, 91], [130, 71], [190, 71], [220, 91], [250, 111]].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={3.4} fill="none" stroke="currentColor" strokeWidth="1.2" />
      ))}
      {/* muros */}
      <rect x={40} y={130} width={16} height={38} fill="url(#ladrillos)" stroke="currentColor" strokeWidth="1.2" />
      <rect x={264} y={130} width={16} height={38} fill="url(#ladrillos)" stroke="currentColor" strokeWidth="1.2" />
      <Suelo y={168} desde={20} hasta={300} />

      <Guia x1={160} y1={34} x2={160} y2={50} />
      <Etiqueta x={160} y={30} ancla="middle" tam={8.5} fuerte>Cumbrera / caballete</Etiqueta>
      <Guia x1={62} y1={72} x2={98} y2={88} />
      <Etiqueta x={58} y={70} ancla="end" tam={8.5} fuerte>Correas</Etiqueta>
      <Guia x1={256} y1={60} x2={224} y2={86} />
      <Etiqueta x={260} y={58} tam={8.5} fuerte>Par o limatón</Etiqueta>
      <Guia x1={196} y1={148} x2={166} y2={132} />
      <Etiqueta x={200} y={150} tam={8.5} fuerte>Tirante</Etiqueta>
      <Guia x1={24} y1={146} x2={38} y2={140} />
      <Etiqueta x={20} y={148} ancla="end" tam={8.5} fuerte>Apoyo en el muro</Etiqueta>
      <Etiqueta x={160} y={190} ancla="middle" tam={8.5}>Alumbra con linterna desde adentro y busca piezas partidas, torcidas o descolgadas.</Etiqueta>
    </Lienzo>
  )
}

export function ApoyoCubierta() {
  return (
    <Lienzo titulo="El techo se corrió de su apoyo">
      <Etiqueta x={160} y={16} ancla="middle" fuerte tam={11}>Revisa cuánto apoya cada viga sobre el muro</Etiqueta>
      {/* bien */}
      <g>
        <rect x={30} y={100} width={50} height={60} fill="url(#ladrillos)" stroke="currentColor" strokeWidth="1.2" />
        <rect x={40} y={82} width={90} height={16} fill="none" stroke="currentColor" strokeWidth="1.4" />
        <Cota x1={40} y1={76} x2={80} y2={76} texto="15 cm" />
        <path d="M74 98 l0 10 l-8 0" fill="none" stroke="currentColor" strokeWidth="2" className="t-bien" />
        <Bien x={112} y={124} r={10} />
        <Etiqueta x={30} y={178} tam={8.5} fuerte tono="bien">Bien apoyada y amarrada</Etiqueta>
        <Etiqueta x={30} y={190} tam={8.5}>Mínimo 10 cm de apoyo + platina</Etiqueta>
      </g>
      {/* mal */}
      <g transform="translate(160,0)">
        <rect x={30} y={100} width={50} height={60} fill="url(#ladrillos)" stroke="currentColor" strokeWidth="1.2" />
        <rect x={70} y={82} width={90} height={16} fill="none" stroke="currentColor" strokeWidth="1.4" />
        <Cota x1={70} y1={76} x2={80} y2={76} texto="3 cm" />
        <Mal x={112} y={124} r={10} />
        <Etiqueta x={20} y={178} tam={8.5} fuerte tono="peligro">Casi fuera del apoyo</Etiqueta>
        <Etiqueta x={20} y={190} tam={8.5}>Con la próxima réplica se cae. Apuntala hoy.</Etiqueta>
      </g>
    </Lienzo>
  )
}

export function Culata() {
  return (
    <Lienzo titulo="La culata: el muro que más se cae">
      <Etiqueta x={160} y={15} ancla="middle" fuerte tam={11}>La culata es el muro triangular del extremo</Etiqueta>
      <Suelo y={168} />
      <path d="M40 168 V96 L110 52 L180 96 V168 Z" fill="url(#ladrillos)" stroke="currentColor" strokeWidth="1.3" />
      <path d="M40 96 L110 52 L180 96" fill="none" stroke="currentColor" strokeWidth="2.2" />
      <Grieta puntos={[[62, 96], [78, 78], [92, 66], [110, 54]]} grosor={2.4} />
      <Guia x1={210} y1={62} x2={116} y2={62} />
      <Etiqueta x={214} y={58} tam={9} fuerte tono="peligro">Alta, delgada y sin</Etiqueta>
      <Etiqueta x={214} y={69} tam={9} fuerte tono="peligro">nada que la agarre arriba</Etiqueta>
      <Etiqueta x={214} y={86} tam={8.5}>Se cae hacia afuera</Etiqueta>
      <Etiqueta x={214} y={97} tam={8.5}>y cae sobre el andén,</Etiqueta>
      <Etiqueta x={214} y={108} tam={8.5}>donde está la gente.</Etiqueta>
      <Etiqueta x={214} y={128} tam={9} fuerte tono="bien">La solución buena:</Etiqueta>
      <Etiqueta x={214} y={139} tam={8.5}>no volverla a levantar</Etiqueta>
      <Etiqueta x={214} y={150} tam={8.5}>en ladrillo, sino cerrar</Etiqueta>
      <Etiqueta x={214} y={161} tam={8.5}>con marco de madera</Etiqueta>
      <Etiqueta x={214} y={172} tam={8.5}>y lámina liviana.</Etiqueta>
      <Persona x={110} y={168} alto={40} />
      <Etiqueta x={110} y={188} ancla="middle" tam={8.5}>Míralas siempre desde lejos.</Etiqueta>
    </Lienzo>
  )
}

export function Tejas() {
  return (
    <Lienzo titulo="Estado de las tejas y cómo amarrarlas">
      <Etiqueta x={160} y={16} ancla="middle" fuerte tam={11}>Las tejas que se caen son las de los bordes</Etiqueta>
      <path d="M30 130 L160 56 L290 130" fill="none" stroke="currentColor" strokeWidth="1.6" />
      {/* tejas */}
      {Array.from({ length: 9 }).map((_, i) => {
        const x = 44 + i * 13
        const y = 122 - i * 7.4
        return <path key={`izq${i}`} d={`M${x} ${y} q6 -7 13 0`} fill="none" stroke="currentColor" strokeWidth="1.4" />
      })}
      {Array.from({ length: 9 }).map((_, i) => {
        const x = 168 + i * 13
        const y = 62 + i * 7.4
        const falta = i === 3 || i === 6
        return (
          <path
            key={`der${i}`}
            d={`M${x} ${y} q6 -7 13 0`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeDasharray={falta ? '2 3' : undefined}
            className={falta ? 't-peligro' : undefined}
          />
        )
      })}
      <Guia x1={252} y1={44} x2={218} y2={82} />
      <Etiqueta x={256} y={42} ancla="end" tam={8.5} fuerte tono="peligro">Tejas que faltan</Etiqueta>
      <Guia x1={40} y1={158} x2={48} y2={126} />
      <Etiqueta x={36} y={162} ancla="start" tam={8.5} fuerte>Amarra con alambre</Etiqueta>
      <Etiqueta x={36} y={173} tam={8.5}>la primera hilada (alero),</Etiqueta>
      <Etiqueta x={36} y={184} tam={8.5}>el caballete y los bordes.</Etiqueta>
      <Etiqueta x={160} y={196} ancla="middle" tam={8.5} fuerte tono="peligro">Nunca pises sobre la teja: usa una tabla apoyada en dos correas.</Etiqueta>
    </Lienzo>
  )
}

export function Terreno() {
  return (
    <Lienzo titulo="Señales de que el terreno está fallando">
      <Etiqueta x={160} y={16} ancla="middle" fuerte tam={11}>Una casa buena en terreno malo sigue siendo peligrosa</Etiqueta>
      <path d="M10 180 L110 180 L200 110 L310 92 L310 190 L10 190 Z" fill="url(#tierra)" stroke="currentColor" strokeWidth="1.2" />
      <path d="M10 180 L110 180 L200 110 L310 92" fill="none" stroke="currentColor" strokeWidth="1.6" />
      {/* casa */}
      <path d="M120 152 V126 H176 V152 Z" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M114 126 L148 106 L182 126" fill="none" stroke="currentColor" strokeWidth="1.4" />
      {/* grietas del suelo */}
      <Grieta puntos={[[196, 112], [206, 122], [198, 134], [210, 146]]} grosor={2.2} />
      <Grieta puntos={[[232, 100], [240, 112], [232, 124]]} grosor={1.8} />
      <Guia x1={266} y1={140} x2={214} y2={130} />
      <Etiqueta x={270} y={138} ancla="end" tam={9} fuerte tono="peligro">Grietas en el suelo</Etiqueta>
      <Etiqueta x={302} y={152} ancla="end" tam={8.5}>= la ladera se mueve</Etiqueta>
      <Guia x1={70} y1={128} x2={112} y2={146} />
      <Etiqueta x={66} y={126} ancla="end" tam={8.5} fuerte>Al borde del talud</Etiqueta>
      <Etiqueta x={160} y={40} ancla="middle" tam={8.5}>Pon un pedacito de vidrio pegado atravesando la grieta y escribe la fecha.</Etiqueta>
      <Etiqueta x={160} y={52} ancla="middle" tam={8.5}>Si se parte en los días siguientes, la grieta sigue viva. Repórtalo.</Etiqueta>
    </Lienzo>
  )
}

export function SistemasConstructivos() {
  return (
    <Lienzo titulo="Cómo distinguir los sistemas constructivos">
      <Etiqueta x={160} y={15} ancla="middle" fuerte tam={11}>¿De qué es el muro? Mira donde el pañete ya se cayó</Etiqueta>
      <g>
        <rect x={16} y={34} width={88} height={72} fill="url(#ladrillos)" stroke="currentColor" strokeWidth="1.2" />
        <Etiqueta x={60} y={122} ancla="middle" tam={9} fuerte>Ladrillo o bloque</Etiqueta>
        <Etiqueta x={60} y={134} ancla="middle" tam={8}>Pesado, macizo.</Etiqueta>
        <Etiqueta x={60} y={145} ancla="middle" tam={8}>Suena lleno al golpear.</Etiqueta>
        <Etiqueta x={60} y={156} ancla="middle" tam={8}>Busca si tiene columnas</Etiqueta>
        <Etiqueta x={60} y={167} ancla="middle" tam={8}>de concreto en las esquinas.</Etiqueta>
      </g>
      <g>
        <rect x={116} y={34} width={88} height={72} fill="none" stroke="currentColor" strokeWidth="1.2" />
        {[128, 146, 164, 182].map((x) => (
          <line key={x} x1={x} y1={34} x2={x} y2={106} stroke="currentColor" strokeWidth="2.2" opacity="0.6" />
        ))}
        <path d="M120 102 L200 40" stroke="currentColor" strokeWidth="2.6" opacity="0.5" />
        <Etiqueta x={160} y={122} ancla="middle" tam={9} fuerte>Bahareque</Etiqueta>
        <Etiqueta x={160} y={134} ancla="middle" tam={8}>Liviano. Suena HUECO.</Etiqueta>
        <Etiqueta x={160} y={145} ancla="middle" tam={8}>Se ve guadua o madera</Etiqueta>
        <Etiqueta x={160} y={156} ancla="middle" tam={8}>y malla bajo el repello.</Etiqueta>
        <Etiqueta x={160} y={167} ancla="middle" tam={8}>Muro delgado (10-15 cm).</Etiqueta>
      </g>
      <g>
        <rect x={216} y={34} width={88} height={72} fill="url(#tierra)" stroke="currentColor" strokeWidth="1.4" />
        <Etiqueta x={260} y={122} ancla="middle" tam={9} fuerte>Tapia o adobe</Etiqueta>
        <Etiqueta x={260} y={134} ancla="middle" tam={8}>Muy grueso: 40 cm o más.</Etiqueta>
        <Etiqueta x={260} y={145} ancla="middle" tam={8}>Es tierra: si raspas,</Etiqueta>
        <Etiqueta x={260} y={156} ancla="middle" tam={8}>sale polvo de tierra.</Etiqueta>
        <Etiqueta x={260} y={167} ancla="middle" tam={8}>Frágil y pesado.</Etiqueta>
      </g>
      <Etiqueta x={160} y={188} ancla="middle" tam={8.5} fuerte>Es normal que una misma casa tenga dos o tres sistemas. Marca todos.</Etiqueta>
    </Lienzo>
  )
}

export function Ampliaciones() {
  return (
    <Lienzo titulo="Ampliaciones pegadas sin amarrar">
      <Etiqueta x={160} y={18} ancla="middle" fuerte tam={11}>La casa se raja justo en la junta</Etiqueta>
      <Suelo y={162} />
      <path d="M50 162 V90 H150 V162 Z" fill="url(#ladrillos)" stroke="currentColor" strokeWidth="1.4" />
      <path d="M44 90 L100 60 L156 90" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M150 162 V106 H240 V162 Z" fill="url(#ladrillos)" stroke="currentColor" strokeWidth="1.4" opacity="0.75" />
      <path d="M146 106 L196 84 L246 106" fill="none" stroke="currentColor" strokeWidth="1.4" opacity="0.75" />
      <Grieta puntos={[[150, 106], [146, 124], [152, 142], [148, 162]]} grosor={2.6} />
      <Guia x1={196} y1={48} x2={152} y2={120} />
      <Etiqueta x={200} y={44} tam={9} fuerte tono="peligro">Aquí se raja siempre</Etiqueta>
      <Etiqueta x={100} y={182} ancla="middle" tam={8.5}>Casa original</Etiqueta>
      <Etiqueta x={196} y={182} ancla="middle" tam={8.5}>Ampliación</Etiqueta>
      <Etiqueta x={160} y={196} ancla="middle" tam={8.5}>Dos cosas pegadas se mueven distinto en el sismo y se separan.</Etiqueta>
    </Lienzo>
  )
}

export function FormaPlanta() {
  return (
    <Lienzo titulo="La forma de la casa vista desde arriba">
      <Etiqueta x={160} y={18} ancla="middle" fuerte tam={11}>Vista desde arriba</Etiqueta>
      <rect x={26} y={50} width={70} height={60} fill="none" stroke="currentColor" strokeWidth="1.6" />
      <Bien x={61} y={130} r={9} />
      <Etiqueta x={61} y={156} ancla="middle" tam={8.5} fuerte>Cuadrada</Etiqueta>
      <Etiqueta x={61} y={167} ancla="middle" tam={8}>Se comporta bien</Etiqueta>

      <path d="M126 50 h64 v34 h-30 v26 h-34 z" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <Grieta puntos={[[160, 84], [166, 92], [160, 100]]} grosor={2.2} />
      <Etiqueta x={158} y={130} ancla="middle" tam={8.5} fuerte tono="aviso">En L</Etiqueta>
      <Etiqueta x={158} y={143} ancla="middle" tam={8}>Se raja en el quiebre.</Etiqueta>
      <Etiqueta x={158} y={154} ancla="middle" tam={8}>Revisa esa esquina</Etiqueta>
      <Etiqueta x={158} y={165} ancla="middle" tam={8}>con especial cuidado.</Etiqueta>

      <path d="M226 50 h72 v22 h-26 v38 h-20 v-38 h-26 z" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <Etiqueta x={262} y={130} ancla="middle" tam={8.5} fuerte tono="peligro">En T o en U</Etiqueta>
      <Etiqueta x={262} y={143} ancla="middle" tam={8}>Cada ala se mueve</Etiqueta>
      <Etiqueta x={262} y={154} ancla="middle" tam={8}>por su lado y se</Etiqueta>
      <Etiqueta x={262} y={165} ancla="middle" tam={8}>parten los encuentros.</Etiqueta>
    </Lienzo>
  )
}

export function MedirArea() {
  return (
    <Lienzo titulo="Cómo medir sin metro">
      <Etiqueta x={160} y={18} ancla="middle" fuerte tam={11}>Si no tienes metro, mide con pasos</Etiqueta>
      <rect x={40} y={48} width={150} height={86} fill="none" stroke="currentColor" strokeWidth="1.6" />
      <Cota x1={40} y1={142} x2={190} y2={142} texto="12 pasos ≈ 8,4 m" />
      <Cota x1={200} y1={48} x2={200} y2={134} texto="" />
      <Etiqueta x={208} y={94} tam={8.5}>8 pasos</Etiqueta>
      <Etiqueta x={208} y={105} tam={8.5}>≈ 5,6 m</Etiqueta>
      <Persona x={70} y={170} alto={34} />
      <Etiqueta x={90} y={162} tam={9} fuerte>1 paso de adulto ≈ 70 cm</Etiqueta>
      <Etiqueta x={90} y={174} tam={9}>Brazo levantado ≈ 2,20 m de alto</Etiqueta>
      <Etiqueta x={90} y={186} tam={9}>Un ladrillo común ≈ 24 cm de largo</Etiqueta>
      <Etiqueta x={240} y={72} tam={9} fuerte>Área =</Etiqueta>
      <Etiqueta x={240} y={84} tam={9}>8,4 × 5,6</Etiqueta>
      <Etiqueta x={240} y={96} tam={9} fuerte>≈ 47 m²</Etiqueta>
      <Etiqueta x={240} y={116} tam={8}>Aproximado está bien.</Etiqueta>
      <Etiqueta x={240} y={127} tam={8}>Nadie espera precisión.</Etiqueta>
    </Lienzo>
  )
}

export function Asentamiento() {
  return (
    <Lienzo titulo="Cómo saber si la casa se hundió">
      <Etiqueta x={160} y={18} ancla="middle" fuerte tam={11}>La prueba de la canica</Etiqueta>
      <path d="M40 120 L200 132" stroke="currentColor" strokeWidth="1.8" />
      <circle cx={70} cy={116} r={5} fill="currentColor" />
      <path d="M84 112 q30 6 56 12" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="3 2" markerEnd="url(#punta)" />
      <Etiqueta x={40} y={150} tam={9}>Pon una canica o una botella</Etiqueta>
      <Etiqueta x={40} y={162} tam={9}>en el piso. Si siempre rueda</Etiqueta>
      <Etiqueta x={40} y={174} tam={9}>para el mismo lado, la casa</Etiqueta>
      <Etiqueta x={40} y={186} tam={9} fuerte>se asentó por ese lado.</Etiqueta>
      <g transform="translate(210,0)">
        <rect x={0} y={54} width={40} height={64} fill="none" stroke="currentColor" strokeWidth="1.4" />
        <rect x={8} y={66} width={24} height={40} fill="none" stroke="currentColor" strokeWidth="1.1" />
        <path d="M8 66 l24 40" stroke="currentColor" strokeWidth="0.8" strokeDasharray="2 2" />
        <Etiqueta x={20} y={134} ancla="middle" tam={8.5} fuerte>Otra señal:</Etiqueta>
        <Etiqueta x={20} y={146} ancla="middle" tam={8.5}>la puerta roza</Etiqueta>
        <Etiqueta x={20} y={158} ancla="middle" tam={8.5}>o no cierra,</Etiqueta>
        <Etiqueta x={20} y={170} ancla="middle" tam={8.5}>o el marco</Etiqueta>
        <Etiqueta x={20} y={182} ancla="middle" tam={8.5}>quedó romboidal.</Etiqueta>
      </g>
    </Lienzo>
  )
}

export function Sobrecimiento() {
  return (
    <Lienzo titulo="La guadua no puede tocar el suelo">
      <Etiqueta x={160} y={16} ancla="middle" fuerte tam={11}>La madera y la guadua se pudren desde abajo</Etiqueta>
      {/* bien */}
      <g>
        <Suelo y={150} desde={20} hasta={150} />
        <rect x={50} y={112} width={60} height={38} fill="none" stroke="currentColor" strokeWidth="1.4" />
        <line x1={50} y1={118} x2={110} y2={118} stroke="currentColor" strokeWidth="0.8" strokeDasharray="2 2" />
        <rect x={56} y={48} width={10} height={64} fill="rgba(127,127,127,0.25)" stroke="currentColor" strokeWidth="1.2" />
        <rect x={94} y={48} width={10} height={64} fill="rgba(127,127,127,0.25)" stroke="currentColor" strokeWidth="1.2" />
        <Cota x1={44} y1={112} x2={44} y2={150} texto="" />
        <Etiqueta x={16} y={134} tam={8.5} fuerte>30 cm</Etiqueta>
        <Etiqueta x={16} y={144} tam={8} >mínimo</Etiqueta>
        <Bien x={130} y={80} r={9} />
        <Etiqueta x={80} y={172} ancla="middle" tam={8.5} fuerte tono="bien">Sobre concreto,</Etiqueta>
        <Etiqueta x={80} y={183} ancla="middle" tam={8.5} fuerte tono="bien">con impermeabilizante</Etiqueta>
        <Etiqueta x={80} y={194} ancla="middle" tam={8}>y anclada con perno</Etiqueta>
      </g>
      {/* mal */}
      <g transform="translate(170,0)">
        <Suelo y={150} desde={0} hasta={150} />
        <rect x={56} y={48} width={10} height={102} fill="rgba(127,127,127,0.25)" stroke="currentColor" strokeWidth="1.2" />
        <rect x={94} y={48} width={10} height={102} fill="rgba(127,127,127,0.25)" stroke="currentColor" strokeWidth="1.2" />
        <path d="M54 134 q6 -12 14 0 q-6 18 -14 0" fill="currentColor" opacity="0.5" className="t-peligro" />
        <path d="M92 138 q6 -10 14 0 q-6 14 -14 0" fill="currentColor" opacity="0.5" className="t-peligro" />
        <Mal x={130} y={80} r={9} />
        <Etiqueta x={80} y={172} ancla="middle" tam={8.5} fuerte tono="peligro">Directo en la tierra</Etiqueta>
        <Etiqueta x={80} y={183} ancla="middle" tam={8.5}>La humedad sube y</Etiqueta>
        <Etiqueta x={80} y={194} ancla="middle" tam={8.5}>se pudre en 2 o 3 años</Etiqueta>
      </g>
    </Lienzo>
  )
}

export function FotosGuia() {
  return (
    <Lienzo titulo="Cómo tomar las fotos">
      <Etiqueta x={160} y={16} ancla="middle" fuerte tam={11}>El ingeniero no va a estar allá. Las fotos son sus ojos.</Etiqueta>
      {/* bien */}
      <g>
        <Marco x={24} y={34} ancho={110} alto={76} />
        <rect x={30} y={40} width={98} height={64} fill="url(#ladrillos)" />
        <Grieta puntos={[[46, 46], [64, 62], [72, 78], [92, 96]]} grosor={2.4} />
        <circle cx={86} cy={70} r={7} fill="none" stroke="currentColor" strokeWidth="1.6" />
        <Bien x={146} y={44} r={9} />
        <Etiqueta x={24} y={126} tam={9} fuerte tono="bien">De frente, con luz y con escala</Etiqueta>
        <Etiqueta x={24} y={138} tam={8.5}>Pon una moneda, un lápiz o tu dedo</Etiqueta>
        <Etiqueta x={24} y={149} tam={8.5}>junto a la grieta, siempre.</Etiqueta>
      </g>
      {/* mal */}
      <g transform="translate(170,0)">
        <Marco x={24} y={34} ancho={110} alto={76} />
        <rect x={30} y={40} width={98} height={64} fill="url(#ladrillos)" opacity="0.35" />
        <Grieta puntos={[[100, 90], [106, 96], [110, 100]]} grosor={1} tono="aviso" />
        <Mal x={146} y={44} r={9} />
        <Etiqueta x={14} y={126} tam={9} fuerte tono="peligro">De lejos, oscura y sin escala</Etiqueta>
        <Etiqueta x={14} y={138} tam={8.5}>Con esta foto no se puede decidir nada.</Etiqueta>
      </g>
      <Etiqueta x={160} y={172} ancla="middle" tam={9} fuerte>Fotos mínimas por vivienda</Etiqueta>
      <Etiqueta x={160} y={186} ancla="middle" tam={8.5}>Las 4 fachadas · cada ambiente por dentro · el techo por dentro · cada daño con escala</Etiqueta>
    </Lienzo>
  )
}

/* =================================================================== */
/* Dibujos de reparacion                                               */
/* =================================================================== */

export function Acordonar() {
  return (
    <Lienzo titulo="Cómo acordonar una casa insegura">
      <Etiqueta x={160} y={18} ancla="middle" fuerte tam={11}>La cinta va a la misma distancia que la altura de la casa</Etiqueta>
      <Suelo y={158} />
      <path d="M120 158 V96 H200 V158 Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M114 96 L160 66 L206 96" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <Cota x1={120} y1={66} x2={120} y2={158} texto="" />
      <Etiqueta x={104} y={114} ancla="end" tam={9} fuerte>alto = 4 m</Etiqueta>
      <line x1={62} y1={158} x2={62} y2={132} stroke="currentColor" strokeWidth="1.4" />
      <line x1={258} y1={158} x2={258} y2={132} stroke="currentColor" strokeWidth="1.4" />
      <path d="M62 136 h196" stroke="currentColor" strokeWidth="2.2" strokeDasharray="8 5" className="t-peligro" />
      <Cota x1={62} y1={172} x2={120} y2={172} texto="4 m" />
      <Cota x1={200} y1={172} x2={258} y2={172} texto="4 m" />
      <Etiqueta x={160} y={194} ancla="middle" tam={8.5}>Así, si algo se cae, no alcanza a nadie. Pon el aviso rojo en la puerta.</Etiqueta>
    </Lienzo>
  )
}

export function Apuntalamiento() {
  return (
    <Lienzo titulo="Cómo poner un puntal">
      <Etiqueta x={160} y={16} ancla="middle" fuerte tam={11}>Un puntal sostiene, no levanta</Etiqueta>
      <Suelo y={168} />
      {/* viga descolgada */}
      <rect x={40} y={54} width={200} height={14} fill="none" stroke="currentColor" strokeWidth="1.4" />
      <rect x={40} y={68} width={16} height={100} fill="url(#ladrillos)" stroke="currentColor" strokeWidth="1.2" />
      {/* puntal */}
      <rect x={128} y={76} width={40} height={6} fill="rgba(127,127,127,0.35)" stroke="currentColor" strokeWidth="1" />
      <rect x={142} y={82} width={12} height={72} fill="rgba(127,127,127,0.25)" stroke="currentColor" strokeWidth="1.3" />
      <rect x={126} y={154} width={44} height={6} fill="rgba(127,127,127,0.35)" stroke="currentColor" strokeWidth="1" />
      <path d="M138 154 l8 -8 M158 154 l-8 -8" stroke="currentColor" strokeWidth="1.6" />
      <Guia x1={214} y1={72} x2={172} y2={78} />
      <Etiqueta x={218} y={70} tam={8.5} fuerte>Tabla arriba para</Etiqueta>
      <Etiqueta x={218} y={80} tam={8.5}>repartir la carga</Etiqueta>
      <Guia x1={214} y1={152} x2={174} y2={157} />
      <Etiqueta x={218} y={150} tam={8.5} fuerte>Cuñas encontradas:</Etiqueta>
      <Etiqueta x={218} y={160} tam={8.5}>firme, no apretado</Etiqueta>
      <Guia x1={100} y1={120} x2={140} y2={118} />
      <Etiqueta x={96} y={118} ancla="end" tam={8.5} fuerte>Vertical</Etiqueta>
      <Etiqueta x={96} y={128} ancla="end" tam={8.5}>(máx. 15° de</Etiqueta>
      <Etiqueta x={96} y={138} ancla="end" tam={8.5}>inclinación)</Etiqueta>
      <Etiqueta x={160} y={190} ancla="middle" tam={8.5} fuerte tono="peligro">No trates de devolver el techo a su sitio con el puntal: puedes reventar el muro.</Etiqueta>
    </Lienzo>
  )
}

export function CubiertaProvisional() {
  return (
    <Lienzo titulo="Cubierta provisional con plástico">
      <Etiqueta x={160} y={16} ancla="middle" fuerte tam={11}>El plástico se pone como si fueran tejas: de arriba hacia abajo</Etiqueta>
      <path d="M40 140 L160 62 L280 140" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M158 66 L60 130" stroke="currentColor" strokeWidth="4" opacity="0.4" />
      <path d="M120 96 L36 150" stroke="currentColor" strokeWidth="4" opacity="0.4" />
      <Cota x1={116} y1={86} x2={140} y2={72} texto="" />
      <Guia x1={196} y1={92} x2={132} y2={92} />
      <Etiqueta x={200} y={90} tam={8.5} fuerte>Traslapo de 30 cm</Etiqueta>
      <Etiqueta x={200} y={101} tam={8.5}>La tira de arriba monta</Etiqueta>
      <Etiqueta x={200} y={112} tam={8.5}>sobre la de abajo.</Etiqueta>
      {/* listones */}
      {[[76, 122], [110, 100], [144, 78]].map(([x, y]) => (
        <rect key={x} x={x} y={y} width={26} height={5} transform={`rotate(-33 ${x} ${y})`} fill="rgba(127,127,127,0.5)" stroke="currentColor" strokeWidth="0.9" />
      ))}
      <Guia x1={62} y1={172} x2={80} y2={130} />
      <Etiqueta x={56} y={176} ancla="start" tam={8.5} fuerte>Sujeta con listones clavados encima,</Etiqueta>
      <Etiqueta x={56} y={187} tam={8.5}>no con puntillas sueltas (rasgan el plástico).</Etiqueta>
      <Etiqueta x={286} y={148} ancla="end" tam={8.5} fuerte>Debe sobresalir</Etiqueta>
      <Etiqueta x={286} y={159} ancla="end" tam={8.5}>50 cm del muro</Etiqueta>
    </Lienzo>
  )
}

export function SellarFisura() {
  return (
    <Lienzo titulo="Cómo sellar una fisura fina">
      <Etiqueta x={160} y={18} ancla="middle" fuerte tam={11}>Abre la fisura en V antes de rellenarla</Etiqueta>
      <g>
        <rect x={30} y={50} width={100} height={70} fill="url(#ladrillos)" stroke="currentColor" strokeWidth="1.2" />
        <path d="M74 50 v70" stroke="currentColor" strokeWidth="1.4" className="t-aviso" />
        <Etiqueta x={80} y={136} ancla="middle" tam={9} fuerte>1. Fisura como está</Etiqueta>
        <Etiqueta x={80} y={148} ancla="middle" tam={8.5}>Si la rellenas así,</Etiqueta>
        <Etiqueta x={80} y={159} ancla="middle" tam={8.5}>la masilla se sale sola.</Etiqueta>
      </g>
      <g transform="translate(160,0)">
        <rect x={30} y={50} width={100} height={70} fill="url(#ladrillos)" stroke="currentColor" strokeWidth="1.2" />
        <path d="M68 50 L74 62 L74 108 L80 120 L68 120 L74 108 L74 62 L80 50 Z" fill="currentColor" opacity="0.3" />
        <path d="M68 50 L80 50 L76 66 L76 104 L80 120 L68 120 L72 104 L72 66 Z" fill="currentColor" opacity="0.25" stroke="currentColor" strokeWidth="1" />
        <Etiqueta x={80} y={136} ancla="middle" tam={9} fuerte tono="bien">2. Abierta en V</Etiqueta>
        <Etiqueta x={80} y={148} ancla="middle" tam={8.5}>Unos 5 mm. Limpia el polvo,</Etiqueta>
        <Etiqueta x={80} y={159} ancla="middle" tam={8.5}>humedece y rellena apretando.</Etiqueta>
      </g>
      <Etiqueta x={160} y={182} ancla="middle" tam={9} fuerte>Escribe la fecha con lápiz al lado de la fisura reparada.</Etiqueta>
      <Etiqueta x={160} y={194} ancla="middle" tam={8.5}>Si vuelve a abrirse en las próximas semanas, ya no es cosa del pañete: avisa.</Etiqueta>
    </Lienzo>
  )
}

export function InyeccionGrieta() {
  return (
    <Lienzo titulo="Inyección de grietas paso a paso">
      <Etiqueta x={160} y={16} ancla="middle" fuerte tam={11}>Se inyecta de abajo hacia arriba</Etiqueta>
      <rect x={90} y={34} width={140} height={132} fill="url(#ladrillos)" stroke="currentColor" strokeWidth="1.3" />
      <Grieta puntos={[[104, 156], [124, 128], [140, 108], [162, 82], [186, 56], [206, 40]]} grosor={2.6} />
      {[[112, 144], [132, 118], [152, 94], [176, 68], [198, 46]].map(([x, y], i) => (
        <g key={x}>
          <rect x={x - 3} y={y - 8} width={7} height={12} fill="none" stroke="currentColor" strokeWidth="1.2" />
          <Etiqueta x={x + 8} y={y - 1} tam={8}>{i + 1}</Etiqueta>
        </g>
      ))}
      <Guia x1={62} y1={148} x2={106} y2={146} />
      <Etiqueta x={58} y={146} ancla="end" tam={8.5} fuerte>Empieza</Etiqueta>
      <Etiqueta x={58} y={157} ancla="end" tam={8.5}>por la más baja</Etiqueta>
      <Guia x1={262} y1={44} x2={210} y2={44} />
      <Etiqueta x={266} y={42} ancla="end" tam={8.5}>Termina arriba</Etiqueta>

      <Etiqueta x={20} y={48} tam={8.5} fuerte>Boquillas</Etiqueta>
      <Etiqueta x={20} y={59} tam={8.5}>cada 30 cm</Etiqueta>
      <Etiqueta x={20} y={78} tam={8.5} fuerte>Sella toda la</Etiqueta>
      <Etiqueta x={20} y={89} tam={8.5}>grieta por fuera</Etiqueta>
      <Etiqueta x={20} y={100} tam={8.5}>y espera 1 día.</Etiqueta>
      <Etiqueta x={20} y={119} tam={8.5} fuerte>Inyecta hasta</Etiqueta>
      <Etiqueta x={20} y={130} tam={8.5}>que salga por</Etiqueta>
      <Etiqueta x={20} y={141} tam={8.5}>la siguiente.</Etiqueta>
      <Etiqueta x={160} y={186} ancla="middle" tam={8.5} fuerte tono="peligro">Solo se inyecta cuando el ingeniero confirmó que la causa ya está controlada.</Etiqueta>
    </Lienzo>
  )
}

export function MallaMortero() {
  return (
    <Lienzo titulo="Refuerzo de muro con malla y mortero">
      <Etiqueta x={160} y={15} ancla="middle" fuerte tam={11}>El detalle que hace que funcione: la malla dobla en la esquina</Etiqueta>
      {/* planta de esquina */}
      <path d="M60 120 H210 V60" fill="none" stroke="currentColor" strokeWidth="10" opacity="0.35" />
      <path d="M60 112 H218" stroke="currentColor" strokeWidth="1.6" strokeDasharray="3 2" />
      <path d="M202 60 V128" stroke="currentColor" strokeWidth="1.6" strokeDasharray="3 2" />
      <Cota x1={210} y1={140} x2={166} y2={140} texto="45 cm" />
      <Guia x1={116} y1={68} x2={150} y2={110} />
      <Etiqueta x={112} y={66} ancla="end" tam={9} fuerte>Malla continua</Etiqueta>
      <Etiqueta x={112} y={77} ancla="end" tam={8.5}>Nunca se corta</Etiqueta>
      <Etiqueta x={112} y={88} ancla="end" tam={8.5}>en la esquina.</Etiqueta>
      <Guia x1={264} y1={92} x2={216} y2={96} />
      <Etiqueta x={268} y={90} ancla="end" tam={8.5}>Se pasa 45 cm</Etiqueta>
      <Etiqueta x={268} y={101} ancla="end" tam={8.5}>al muro vecino</Etiqueta>

      <Etiqueta x={26} y={158} tam={9} fuerte>Orden del trabajo</Etiqueta>
      <Etiqueta x={26} y={170} tam={8.5}>1. Picar todo el pañete · 2. Rellenar grietas grandes</Etiqueta>
      <Etiqueta x={26} y={181} tam={8.5}>3. Clavar la malla cada 45 cm, separada 1 cm del muro</Etiqueta>
      <Etiqueta x={26} y={192} tam={8.5}>4. Mortero 1:4 en dos capas hasta 3 cm · 5. Curar 7 días</Etiqueta>
    </Lienzo>
  )
}

export function VigaAmarre() {
  return (
    <Lienzo titulo="Viga de amarre: el cinturón de la casa">
      <Etiqueta x={160} y={16} ancla="middle" fuerte tam={11}>Un cinturón continuo que amarra todos los muros</Etiqueta>
      {/* isometrico simple */}
      <path d="M50 130 L50 80 L150 60 L150 110 Z" fill="url(#ladrillos)" stroke="currentColor" strokeWidth="1.2" />
      <path d="M150 110 L150 60 L262 84 L262 134 Z" fill="url(#ladrillos)" stroke="currentColor" strokeWidth="1.2" opacity="0.85" />
      <path d="M46 82 L46 68 L152 46 L152 60 Z" fill="rgba(127,127,127,0.4)" stroke="currentColor" strokeWidth="1.2" />
      <path d="M152 60 L152 46 L266 70 L266 84 Z" fill="rgba(127,127,127,0.4)" stroke="currentColor" strokeWidth="1.2" />
      <Guia x1={110} y1={30} x2={100} y2={56} />
      <Etiqueta x={114} y={28} tam={9} fuerte>Viga de amarre</Etiqueta>
      <Guia x1={190} y1={128} x2={160} y2={62} />
      <Etiqueta x={194} y={132} tam={8.5} fuerte>El acero es continuo y dobla</Etiqueta>
      <Etiqueta x={194} y={143} tam={8.5}>en la esquina. Los traslapos</Etiqueta>
      <Etiqueta x={194} y={154} tam={8.5}>van de 50 cm y NUNCA</Etiqueta>
      <Etiqueta x={194} y={165} tam={8.5}>en la esquina misma.</Etiqueta>
      <Etiqueta x={26} y={166} tam={8.5} fuerte tono="peligro">Apuntala el techo antes</Etiqueta>
      <Etiqueta x={26} y={177} tam={8.5} fuerte tono="peligro">de descabezar el muro.</Etiqueta>
      <Etiqueta x={26} y={190} tam={8.5}>Por tramos de 1,5 m, alternados.</Etiqueta>
    </Lienzo>
  )
}

/* =================================================================== */

export const DIBUJOS: Record<string, () => React.JSX.Element> = {
  'peligro-inmediato': PeligroInmediato,
  plomada: Plomada,
  'medir-grieta': MedirGrieta,
  'grietas-tipos': GrietasTipos,
  'separacion-muros': SeparacionMuros,
  'muro-confinado': MuroConfinado,
  'muro-bahareque': MuroBahareque,
  'guadua-patologias': GuaduaPatologias,
  'guadua-uniones': GuaduaUniones,
  'tapia-fallas': TapiaFallas,
  'cubierta-guadua': CubiertaGuadua,
  'apoyo-cubierta': ApoyoCubierta,
  culata: Culata,
  tejas: Tejas,
  terreno: Terreno,
  'sistemas-constructivos': SistemasConstructivos,
  ampliaciones: Ampliaciones,
  'forma-planta': FormaPlanta,
  'medir-area': MedirArea,
  asentamiento: Asentamiento,
  sobrecimiento: Sobrecimiento,
  'fotos-guia': FotosGuia,
  acordonar: Acordonar,
  apuntalamiento: Apuntalamiento,
  'cubierta-provisional': CubiertaProvisional,
  'sellar-fisura': SellarFisura,
  'inyeccion-grieta': InyeccionGrieta,
  'malla-mortero': MallaMortero,
  'viga-amarre': VigaAmarre,
}
