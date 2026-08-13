import type { Opcion, Pregunta, Respuestas, Seccion, Severidad } from '../lib/tipos'

/* ------------------------------------------------------------------ */
/* Ayudas para escribir el cuestionario sin tanto ruido                */
/* ------------------------------------------------------------------ */

function op(
  valor: string,
  etiqueta: string,
  severidad: Severidad,
  extra: { detalle?: string; banderaRoja?: boolean; dibujo?: string } = {},
): Opcion {
  return { valor, etiqueta, severidad, ...extra }
}

export function valorEs(r: Respuestas, id: string, ...valores: string[]): boolean {
  const v = r[id]
  if (v === undefined || v === null) return false
  if (Array.isArray(v)) return valores.some((x) => v.includes(x))
  return valores.includes(String(v))
}

export function numero(r: Respuestas, id: string): number {
  const v = r[id]
  return typeof v === 'number' ? v : 0
}

const hayMamposteria = (r: Respuestas) =>
  valorEs(r, 'material_muros', 'ladrillo_confinado', 'ladrillo_sin_confinar', 'bloque')

const hayBahareque = (r: Respuestas) =>
  valorEs(r, 'material_muros', 'bahareque_encementado', 'bahareque_tradicional')

const hayTierra = (r: Respuestas) => valorEs(r, 'material_muros', 'tapia_adobe')

const dosPisos = (r: Respuestas) => numero(r, 'numero_pisos') >= 2

/* ------------------------------------------------------------------ */
/* Escala de anchos de grieta, reutilizada en varios muros             */
/* ------------------------------------------------------------------ */

const OPCIONES_ANCHO_GRIETA: Opcion[] = [
  op('ninguna', 'No hay grietas', 0, { detalle: 'Solo se ve la pintura o el pañete sano.' }),
  op('capilar', 'Como un pelo (menos de 0,2 mm)', 1, {
    detalle: 'No alcanza a entrar la uña. Casi siempre es solo el pañete o la pintura.',
  }),
  op('fina', 'Fina, hasta 1 mm', 1, {
    detalle: 'Entra una hoja de papel, no entra la uña.',
  }),
  op('media', 'Media, entre 1 y 5 mm', 2, {
    detalle: 'Entra la uña o el borde de una moneda.',
  }),
  op('ancha', 'Ancha, entre 5 y 15 mm', 3, {
    detalle: 'Entra un lápiz. Se ve el ladrillo o el bloque por dentro.',
  }),
  op('muy_ancha', 'Muy ancha, más de 15 mm', 4, {
    detalle: 'Entra un dedo, o se ve luz del otro lado del muro.',
    banderaRoja: true,
  }),
  op('desplazada', 'Los dos lados de la grieta se corrieron uno respecto al otro', 4, {
    detalle: 'El muro se partió y una parte se movió. Es el daño más grave de un muro.',
    banderaRoja: true,
  }),
]

const OPCIONES_EXTENSION: Opcion[] = [
  op('ninguno', 'En ningún muro', 0),
  op('uno', 'En un solo muro', 1),
  op('pocos', 'En 2 o 3 muros', 2),
  op('muchos', 'En la mayoría de los muros', 3),
  op('todos', 'En casi todos los muros de la casa', 4),
]

/* ------------------------------------------------------------------ */
/* Secciones                                                           */
/* ------------------------------------------------------------------ */

const seccionSeguridad: Seccion = {
  id: 'seguridad',
  titulo: 'Antes de entrar: ¿es seguro?',
  subtitulo: 'Míralo todo desde afuera. No entres todavía.',
  esFiltroDeSeguridad: true,
  intro:
    'Dale la vuelta completa a la casa por fuera antes de acercarte. Si marcas cualquier señal de peligro, NO entres: marca la casa como no habitable, avisa a la familia y repórtalo de inmediato.',
  preguntas: [
    {
      id: 'peligro_colapso',
      titulo: '¿La casa o alguna parte de ella se ve a punto de caerse?',
      ayuda:
        'Techos hundidos, muros caídos, la casa inclinada, escombros sosteniéndose solos, un piso apoyado sobre otro.',
      tipo: 'unica',
      componente: 'muros',
      dibujo: 'peligro-inmediato',
      obligatoria: true,
      fotoSugerida: true,
      opciones: [
        op('no', 'No, la casa está en pie y no se ve inclinada', 0),
        op('parcial', 'Sí, una parte (un alero, una culata, un muro) está por caerse', 3, {
          detalle: 'Acordona esa zona y no pases por debajo.',
        }),
        op('si', 'Sí, la casa o un piso completo se ve a punto de caerse', 4, {
          banderaRoja: true,
          detalle: 'No entres. Retira a la familia y reporta ya.',
        }),
        op('colapsada', 'Ya se cayó total o parcialmente', 4, { banderaRoja: true }),
      ],
    },
    {
      id: 'peligro_inclinacion',
      titulo: '¿La casa completa se ve inclinada o "recostada"?',
      ayuda:
        'Párate en la esquina y mira el filo del muro contra un poste o un árbol. Si el filo no se ve vertical, la casa se inclinó.',
      comoMedir:
        'Cuelga una plomada (una piedra amarrada a una cuerda) desde la parte alta del muro. Mide cuánto se separa la cuerda del muro abajo.',
      tipo: 'si_no',
      componente: 'muros',
      dibujo: 'plomada',
      obligatoria: true,
    },
    {
      id: 'peligro_servicios',
      titulo: '¿Hay cables de luz caídos, olor a gas o pipeta suelta?',
      ayuda: 'Huele antes de entrar. Un olor a gas o un cable en el piso son motivo para no entrar.',
      tipo: 'multiple',
      componente: 'redes',
      obligatoria: true,
      opciones: [
        op('ninguno', 'Nada de eso', 0),
        op('cables', 'Cables de luz caídos o sueltos', 3, { banderaRoja: true }),
        op('gas', 'Olor a gas', 4, { banderaRoja: true }),
        op('pipeta', 'Pipeta de gas volcada o con manguera rota', 3),
        op('agua', 'Agua saliendo de tubos rotos', 2),
      ],
    },
    {
      id: 'peligro_vecino',
      titulo: '¿Alguna construcción vecina puede caer sobre esta casa?',
      ayuda: 'Muros medianeros, casas de dos pisos al lado, tanques o postes inclinados.',
      tipo: 'si_no',
      componente: 'terreno',
      fotoSugerida: true,
    },
  ],
}

const seccionIdentificacion: Seccion = {
  id: 'identificacion',
  titulo: 'Datos de la vivienda y la familia',
  subtitulo: 'Para saber a quién y dónde estamos ayudando.',
  preguntas: [
    {
      id: 'habitada',
      titulo: '¿La familia está viviendo ahí en este momento?',
      tipo: 'unica',
      obligatoria: true,
      opciones: [
        op('si', 'Sí, están durmiendo en la casa', 0),
        op('parcial', 'Sí, pero solo en una parte de la casa', 0),
        op('patio', 'Están durmiendo en el patio, en carpa o en un cambuche', 0),
        op('albergue', 'Están en un albergue o en casa de familiares', 0),
      ],
    },
    {
      id: 'uso',
      titulo: '¿La casa se usa para algo más además de vivienda?',
      ayuda: 'Tienda, taller, granero, salón comunal. Cambia la prioridad y el uso que se le puede dar.',
      tipo: 'texto',
    },
    {
      id: 'servicios_estado',
      titulo: '¿Cómo están los servicios?',
      tipo: 'multiple',
      componente: 'redes',
      opciones: [
        op('todos', 'Agua, luz y gas funcionando', 0),
        op('sin_agua', 'Sin agua', 1),
        op('sin_luz', 'Sin luz', 1),
        op('sin_gas', 'Sin gas', 1),
        op('sanitario', 'El sanitario o el pozo séptico no sirve', 2),
      ],
    },
  ],
}

const seccionTerreno: Seccion = {
  id: 'terreno',
  titulo: 'El terreno donde está la casa',
  subtitulo: 'Una casa buena en un terreno malo sigue siendo peligrosa.',
  intro:
    'En el Eje Cafetero en 1999 muchas casas se tuvieron que reubicar, no porque estuvieran mal construidas, sino porque el terreno no era apto. Revisa esto antes que nada.',
  preguntas: [
    {
      id: 'pendiente',
      titulo: '¿Cómo es el terreno donde está la casa?',
      tipo: 'unica',
      componente: 'terreno',
      dibujo: 'terreno',
      opciones: [
        op('plano', 'Plano', 0),
        op('leve', 'Con una pendiente suave', 1),
        op('fuerte', 'En una ladera empinada', 2),
        op('borde', 'Al borde de un talud, un barranco o un lleno', 3),
      ],
    },
    {
      id: 'grietas_suelo',
      titulo: '¿Hay grietas en el suelo alrededor de la casa?',
      ayuda:
        'Busca en el patio, el andén, la vía y la parte de arriba del talud. Las grietas del suelo avisan que la ladera se está moviendo.',
      comoMedir:
        'Mide el ancho de la grieta más grande con una regla, y su largo con pasos (un paso ≈ 70 cm).',
      tipo: 'unica',
      componente: 'terreno',
      fotoSugerida: true,
      dibujo: 'terreno',
      opciones: [
        op('no', 'No hay grietas en el suelo', 0),
        op('finas', 'Grietas finas, menos de 1 cm', 2),
        op('anchas', 'Grietas de más de 1 cm, o con escalón', 4, {
          banderaRoja: true,
          detalle: 'Señal de deslizamiento activo. La casa no se puede ocupar.',
        }),
      ],
    },
    {
      id: 'deslizamiento',
      titulo: '¿Hubo deslizamiento, derrumbe o caída de rocas cerca?',
      tipo: 'unica',
      componente: 'terreno',
      fotoSugerida: true,
      opciones: [
        op('no', 'No', 0),
        op('lejos', 'Sí, pero lejos de la casa', 1),
        op('cerca', 'Sí, a menos de 20 metros', 3),
        op('toca', 'Sí, tocó la casa o dejó material encima', 4, { banderaRoja: true }),
      ],
    },
    {
      id: 'muro_contencion',
      titulo: 'Si hay muro de contención o gavión, ¿cómo quedó?',
      tipo: 'unica',
      componente: 'terreno',
      visibleSi: (r) => !valorEs(r, 'pendiente', 'plano'),
      opciones: [
        op('no_hay', 'No hay muro de contención', 0),
        op('bien', 'Está bien, sin grietas ni inclinación', 0),
        op('grietas', 'Tiene grietas o se ve panzón', 3),
        op('volcado', 'Se inclinó, se movió o se cayó', 4, { banderaRoja: true }),
      ],
    },
    {
      id: 'agua_socavacion',
      titulo: '¿Hay una quebrada, acequia o tubería rota socavando el terreno?',
      tipo: 'si_no',
      componente: 'terreno',
    },
  ],
}

const seccionTipologia: Seccion = {
  id: 'tipologia',
  titulo: '¿Cómo está construida la casa?',
  subtitulo: 'Esto define qué revisamos después y cómo se repara.',
  intro:
    'Si no estás seguro del material, raspa un pedacito de pañete suelto en una esquina o mira dónde el revoque ya se cayó. Toma foto de eso.',
  preguntas: [
    {
      id: 'material_muros',
      titulo: '¿De qué están hechos los muros? (puedes marcar varios)',
      ayuda:
        'Es muy común que la casa original sea de bahareque y las ampliaciones sean de ladrillo o bloque. Marca todo lo que veas.',
      tipo: 'multiple',
      obligatoria: true,
      dibujo: 'sistemas-constructivos',
      fotoSugerida: true,
      opciones: [
        op('ladrillo_confinado', 'Ladrillo o bloque CON columnas y vigas de amarre en concreto', 0, {
          detalle:
            'Se ven columnas de concreto en las esquinas y donde se cruzan los muros, y una viga de concreto arriba.',
        }),
        op('ladrillo_sin_confinar', 'Ladrillo o bloque SIN columnas ni vigas de amarre', 2, {
          detalle: 'Solo muro de ladrillo pegado con mortero. Es el sistema más vulnerable de todos.',
        }),
        op('bloque', 'Bloque de cemento (perforado)', 1),
        op('bahareque_encementado', 'Bahareque encementado (guadua o madera + malla + repello de mortero)', 0, {
          detalle:
            'Golpea el muro: suena hueco. Es liviano y suele comportarse muy bien en sismo.',
        }),
        op('bahareque_tradicional', 'Bahareque tradicional (guadua o madera + barro/boñiga, sin malla)', 1, {
          detalle: 'Relleno de tierra entre esterilla, revocado con barro o cal.',
        }),
        op('tapia_adobe', 'Tapia pisada o adobe (muros gruesos de tierra)', 3, {
          detalle: 'Muros de 40 cm o más, de tierra apisonada o bloques de barro secados al sol.',
        }),
        op('madera', 'Madera', 0),
        op('otro', 'Otro material', 1),
      ],
    },
    {
      id: 'numero_pisos',
      titulo: '¿Cuántos pisos tiene?',
      tipo: 'numero',
      unidad: 'pisos',
      min: 1,
      max: 4,
      obligatoria: true,
      escala: [
        { hasta: 1, severidad: 0 },
        { hasta: 2, severidad: 1 },
        { hasta: 4, severidad: 2 },
      ],
    },
    {
      id: 'epoca',
      titulo: '¿De cuándo es la casa, más o menos?',
      ayuda: 'Pregúntale a la familia. Las casas anteriores a 1998 casi nunca cumplen la norma sismo resistente.',
      tipo: 'unica',
      opciones: [
        op('antigua', 'Muy antigua, más de 50 años', 2),
        op('media', 'Entre 25 y 50 años', 1),
        op('reciente', 'Menos de 25 años', 0),
        op('no_sabe', 'No saben', 1),
      ],
    },
    {
      id: 'ampliaciones',
      titulo: '¿Le hicieron ampliaciones o le subieron un piso después?',
      ayuda:
        'Las ampliaciones pegadas sin amarrar son el punto donde primero se raja la casa. Busca la junta entre lo viejo y lo nuevo.',
      tipo: 'unica',
      dibujo: 'ampliaciones',
      fotoSugerida: true,
      componente: 'muros',
      opciones: [
        op('no', 'No, la casa es toda de la misma época', 0),
        op('si_amarrada', 'Sí, pero la ampliación está bien amarrada a lo viejo', 1),
        op('si_pegada', 'Sí, la ampliación solo está pegada, se ve la junta', 2),
        op('piso_encima', 'Sí, le construyeron un piso encima', 3, {
          detalle: 'Muy peligroso si abajo es bahareque o tapia. Marca esto siempre.',
        }),
      ],
    },
    {
      id: 'forma_planta',
      titulo: '¿Qué forma tiene la casa vista desde arriba?',
      ayuda: 'Las casas en L, en T o muy alargadas se rajan en el quiebre.',
      tipo: 'unica',
      dibujo: 'forma-planta',
      componente: 'muros',
      opciones: [
        op('regular', 'Cuadrada o rectangular', 0),
        op('l', 'En forma de L', 1),
        op('t_u', 'En forma de T, U o más complicada', 2),
        op('alargada', 'Muy larga y angosta', 1),
      ],
    },
    {
      id: 'material_cubierta',
      titulo: '¿De qué es la estructura del techo?',
      tipo: 'unica',
      componente: 'cubierta',
      dibujo: 'cubierta-guadua',
      obligatoria: true,
      opciones: [
        op('guadua', 'Guadua', 0),
        op('madera', 'Madera aserrada', 0),
        op('guadua_madera', 'Mezcla de guadua y madera', 0),
        op('metalica', 'Perfiles metálicos', 0),
        op('losa', 'Placa o losa de concreto', 1),
      ],
    },
    {
      id: 'material_teja',
      titulo: '¿De qué son las tejas?',
      ayuda:
        'La teja de barro pesa unos 90 kg por metro cuadrado; la de zinc pesa 20. Entre más pesado el techo, más fuerte lo sacude el sismo.',
      tipo: 'unica',
      componente: 'cubierta',
      obligatoria: true,
      opciones: [
        op('barro', 'Teja de barro (española o colonial)', 2),
        op('barro_sobre_zinc', 'Teja de barro encima de zinc o fibrocemento', 1),
        op('zinc', 'Zinc o teja metálica', 0),
        op('fibrocemento', 'Fibrocemento (eternit)', 0),
        op('losa', 'Losa de concreto', 1),
      ],
    },
    {
      id: 'medida_area',
      titulo: 'Área aproximada de la casa',
      comoMedir:
        'Camina el largo y el ancho contando pasos. Un paso de adulto es más o menos 70 cm. Largo × ancho = área. Si tiene dos pisos, cuenta solo la planta.',
      tipo: 'numero',
      unidad: 'm²',
      min: 0,
      max: 1000,
      dibujo: 'medir-area',
      soloMedicion: true,
      obligatoria: true,
    },
    {
      id: 'medida_altura_muro',
      titulo: 'Altura libre de los muros (del piso al techo)',
      comoMedir: 'Con metro. Si no tienes, un adulto con el brazo levantado llega a unos 2,20 m.',
      tipo: 'numero',
      unidad: 'm',
      min: 1.5,
      max: 6,
      soloMedicion: true,
    },
  ],
}

const seccionCimentacion: Seccion = {
  id: 'cimentacion',
  titulo: 'La base de la casa',
  subtitulo: 'Sobrecimiento, zócalo y piso.',
  intro:
    'Agáchate y mira la parte de abajo de los muros por fuera y por dentro. Aquí es donde el bahareque se pudre y donde se nota si la casa se asentó.',
  preguntas: [
    {
      id: 'asentamiento',
      titulo: '¿La casa se hundió por alguna parte?',
      ayuda:
        'Pon una canica o una botella de agua en el piso: si rueda siempre para el mismo lado, hay asentamiento. Mira también si las puertas rozan o no cierran.',
      tipo: 'unica',
      componente: 'cimentacion',
      dibujo: 'asentamiento',
      fotoSugerida: true,
      opciones: [
        op('no', 'No, el piso está parejo', 0),
        op('leve', 'Se siente un desnivel pequeño', 1),
        op('claro', 'Hay un desnivel claro, las puertas no cierran', 2),
        op('fuerte', 'Un lado de la casa se hundió visiblemente', 4, { banderaRoja: true }),
      ],
    },
    {
      id: 'grietas_zocalo',
      titulo: '¿Hay grietas en la base del muro o en el sobrecimiento?',
      ayuda: 'Mira los primeros 50 cm del muro, por fuera y por dentro.',
      tipo: 'unica',
      componente: 'cimentacion',
      fotoSugerida: true,
      opciones: OPCIONES_ANCHO_GRIETA,
      dibujo: 'medir-grieta',
    },
    {
      id: 'piso_agrietado',
      titulo: '¿El piso de la casa se rajó o se levantó?',
      tipo: 'unica',
      componente: 'cimentacion',
      opciones: [
        op('no', 'No', 0),
        op('finas', 'Grietas finas en el piso', 1),
        op('anchas', 'Grietas anchas o el piso se levantó', 3),
      ],
    },
    {
      id: 'guadua_contacto_suelo',
      titulo: '¿La guadua o la madera de los muros toca directamente el suelo?',
      ayuda:
        'La guadua debe apoyarse sobre un sobrecimiento de concreto de al menos 30 cm, nunca sobre la tierra. Si toca el suelo, se pudre.',
      tipo: 'unica',
      componente: 'cimentacion',
      visibleSi: (r) => hayBahareque(r) || valorEs(r, 'material_muros', 'madera'),
      dibujo: 'sobrecimiento',
      fotoSugerida: true,
      opciones: [
        op('sobrecimiento', 'No, se apoya sobre un sobrecimiento de concreto', 0),
        op('bajo', 'Se apoya en un sobrecimiento muy bajito (menos de 20 cm)', 1),
        op('suelo', 'Sí, la madera o guadua toca la tierra', 3),
        op('podrida', 'Sí, y ya se ve podrida o comida', 4),
      ],
    },
    {
      id: 'anclaje_base',
      titulo: '¿El muro está anclado a la base o solo apoyado encima?',
      ayuda:
        'Busca varillas, pernos o platinas que amarren la solera inferior al sobrecimiento. Si no hay nada, el muro se puede correr.',
      tipo: 'unica',
      componente: 'cimentacion',
      visibleSi: (r) => hayBahareque(r) || valorEs(r, 'material_muros', 'madera'),
      dibujo: 'sobrecimiento',
      opciones: [
        op('anclado', 'Sí, tiene anclajes visibles', 0),
        op('no_visible', 'No se alcanza a ver', 1),
        op('sin_anclaje', 'No tiene ningún anclaje', 2),
        op('desplazado', 'El muro se corrió de su base', 4, { banderaRoja: true }),
      ],
    },
  ],
}

const seccionMuroMamposteria: Seccion = {
  id: 'muros_mamposteria',
  titulo: 'Muros de ladrillo o bloque',
  subtitulo: 'Aquí es donde se ve mejor cómo trabajó la casa en el sismo.',
  intro:
    'Revisa muro por muro, por dentro y por fuera. Empieza por los muros largos sin ventanas y por las esquinas. Toma foto de cada grieta con algo al lado que dé escala (una moneda, un lápiz o tu dedo).',
  preguntas: [
    {
      id: 'mamp_grietas_diagonales',
      titulo: '¿Hay grietas diagonales o en forma de X en los muros?',
      ayuda:
        'Es la grieta más importante de todas. Nace en una esquina de puerta o ventana y sube en diagonal, o forma una X en el centro del muro. Significa que el muro trabajó resistiendo el sismo.',
      tipo: 'unica',
      componente: 'muros',
      dibujo: 'grietas-tipos',
      fotoSugerida: true,
      obligatoria: true,
      opciones: OPCIONES_ANCHO_GRIETA,
    },
    {
      id: 'mamp_extension_diagonales',
      titulo: '¿En cuántos muros ves esas grietas diagonales?',
      tipo: 'unica',
      componente: 'muros',
      visibleSi: (r) => !valorEs(r, 'mamp_grietas_diagonales', 'ninguna'),
      opciones: OPCIONES_EXTENSION,
    },
    {
      id: 'mamp_grietas_esquina',
      titulo: '¿Los muros se están separando en las esquinas?',
      ayuda:
        'Párate en la esquina interior y mira hacia arriba: si hay una grieta vertical donde se encuentran los dos muros, se están soltando.',
      tipo: 'unica',
      componente: 'muros',
      dibujo: 'separacion-muros',
      fotoSugerida: true,
      opciones: OPCIONES_ANCHO_GRIETA,
    },
    {
      id: 'mamp_grieta_horizontal',
      titulo: '¿Hay una grieta horizontal larga a lo largo del muro?',
      ayuda:
        'Suele aparecer en la base del muro o justo debajo del techo. Indica que el muro se está corriendo o volcando.',
      tipo: 'unica',
      componente: 'muros',
      dibujo: 'grietas-tipos',
      fotoSugerida: true,
      opciones: [
        op('no', 'No', 0),
        op('fina', 'Sí, fina', 2),
        op('ancha', 'Sí, ancha (más de 5 mm)', 3),
        op('corrida', 'Sí, y el muro se corrió sobre esa línea', 4, { banderaRoja: true }),
      ],
    },
    {
      id: 'mamp_desplome',
      titulo: '¿Algún muro está inclinado (desplomado)?',
      comoMedir:
        'Cuelga una plomada desde la parte de arriba del muro, dejando un espacio conocido (por ejemplo 5 cm) arriba. Mide el espacio abajo. La diferencia es el desplome. Anota la diferencia en centímetros.',
      tipo: 'numero',
      unidad: 'cm',
      min: 0,
      max: 50,
      componente: 'muros',
      dibujo: 'plomada',
      fotoSugerida: true,
      escala: [
        { hasta: 1, severidad: 0 },
        { hasta: 2.5, severidad: 1 },
        { hasta: 5, severidad: 2 },
        { hasta: 8, severidad: 3 },
        { hasta: 999, severidad: 4, banderaRoja: true },
      ],
    },
    {
      id: 'mamp_aplastamiento',
      titulo: '¿Hay ladrillos aplastados, reventados o que se pueden sacar con la mano?',
      ayuda:
        'Mira debajo de las vigas y en las esquinas. El ladrillo triturado quiere decir que ese punto está sobrecargado.',
      tipo: 'unica',
      componente: 'muros',
      fotoSugerida: true,
      opciones: [
        op('no', 'No', 0),
        op('pocos', 'Unos pocos ladrillos sueltos o rotos', 2),
        op('zona', 'Una zona completa está triturada', 4, { banderaRoja: true }),
      ],
    },
    {
      id: 'mamp_columnas',
      titulo: 'Si hay columnas de concreto, ¿cómo están?',
      ayuda:
        'Busca grietas en X en las columnas, concreto reventado o varillas de acero a la vista. Es de los daños más graves que existen.',
      tipo: 'unica',
      componente: 'muros',
      visibleSi: (r) => valorEs(r, 'material_muros', 'ladrillo_confinado'),
      dibujo: 'muro-confinado',
      fotoSugerida: true,
      opciones: [
        op('no_hay', 'No hay columnas de concreto', 2),
        op('bien', 'Sanas, sin grietas', 0),
        op('finas', 'Grietas finas', 2),
        op('x', 'Grietas en X o el concreto está reventado', 4, { banderaRoja: true }),
        op('acero', 'Se ven las varillas de acero, el concreto se desprendió', 4, { banderaRoja: true }),
      ],
    },
    {
      id: 'mamp_viga_amarre',
      titulo: '¿La casa tiene viga de amarre en la parte alta de los muros?',
      ayuda:
        'Es una viga de concreto que corre por encima de todos los muros y los amarra. Sin ella, los muros trabajan sueltos.',
      tipo: 'unica',
      componente: 'muros',
      visibleSi: hayMamposteria,
      dibujo: 'muro-confinado',
      opciones: [
        op('si', 'Sí, y se ve completa', 0),
        op('parcial', 'Solo en una parte de la casa', 2),
        op('no', 'No tiene', 3),
        op('no_sabe', 'No se alcanza a ver', 1),
      ],
    },
    {
      id: 'mamp_medida_grietas',
      titulo: 'Suma aproximada del largo de todas las grietas de más de 1 mm',
      comoMedir:
        'Mide cada grieta importante con el metro o con la cuerda y suma. Sirve para calcular cuánto material se necesita.',
      tipo: 'numero',
      unidad: 'm',
      min: 0,
      max: 500,
      soloMedicion: true,
      visibleSi: (r) => !valorEs(r, 'mamp_grietas_diagonales', 'ninguna', 'capilar'),
    },
    {
      id: 'mamp_medida_area_danada',
      titulo: 'Área aproximada de muro dañado que habría que reforzar',
      comoMedir:
        'Para cada muro dañado: largo × alto. Suma todos. Si un muro tiene grietas por los dos lados, cuenta solo una cara aquí.',
      tipo: 'numero',
      unidad: 'm²',
      min: 0,
      max: 800,
      dibujo: 'medir-area',
      soloMedicion: true,
      visibleSi: (r) => !valorEs(r, 'mamp_grietas_diagonales', 'ninguna', 'capilar'),
    },
  ],
}

const seccionMuroBahareque: Seccion = {
  id: 'muros_bahareque',
  titulo: 'Muros de bahareque',
  subtitulo: 'Guadua o madera con esterilla, malla y repello.',
  intro:
    'El bahareque bien hecho se comporta muy bien en un sismo porque es liviano y flexible. Los problemas casi siempre son de humedad, insectos o falta de amarres, no del sismo mismo. Golpea el muro con los nudillos: debe sonar hueco y firme, no blando.',
  preguntas: [
    {
      id: 'bah_recubrimiento',
      titulo: '¿Cómo está el repello (pañete) del muro?',
      ayuda:
        'El repello protege la guadua. Si se cae, entra el agua y se pudre la estructura.',
      tipo: 'unica',
      componente: 'muros',
      dibujo: 'muro-bahareque',
      fotoSugerida: true,
      obligatoria: true,
      opciones: [
        op('sano', 'Sano, sin desprendimientos', 0),
        op('fisuras', 'Con fisuras finas', 1),
        op('desprendido_poco', 'Se cayó en algunas zonas y se ve la malla', 2),
        op('desprendido_mucho', 'Se cayó en gran parte y se ve la guadua o la esterilla', 3),
      ],
    },
    {
      id: 'bah_estructura',
      titulo: 'Donde se ve la guadua o la madera, ¿en qué estado está?',
      ayuda:
        'Pícale con un destornillador o un cuchillo. Si se hunde fácil, está podrida o comida. Busca polvillo, huequitos y montoncitos de aserrín.',
      tipo: 'multiple',
      componente: 'muros',
      dibujo: 'guadua-patologias',
      fotoSugerida: true,
      opciones: [
        op('buena', 'Firme, seca y sana', 0),
        op('humedad', 'Con manchas de humedad', 2),
        op('pudricion', 'Podrida, se deshace al picarla', 4),
        op('insectos', 'Con huequitos, polvillo o comején', 3),
        op('rajada', 'Rajada a lo largo', 2),
        op('no_visible', 'No se alcanza a ver nada de la estructura', 1),
      ],
    },
    {
      id: 'bah_desprendimiento_estructura',
      titulo: '¿El muro se separó de la estructura de arriba o de al lado?',
      ayuda:
        'Mira la junta entre el muro y la solera de arriba, y entre el muro y las columnas. Un espacio que antes no estaba quiere decir que se soltó.',
      tipo: 'unica',
      componente: 'muros',
      dibujo: 'separacion-muros',
      fotoSugerida: true,
      opciones: [
        op('no', 'No, sigue unido', 0),
        op('leve', 'Se ve una separación pequeña', 2),
        op('clara', 'Se ve una separación de más de 1 cm', 3),
        op('suelto', 'El muro está suelto, se mueve al empujarlo', 4, { banderaRoja: true }),
      ],
    },
    {
      id: 'bah_diagonales',
      titulo: '¿Los muros tienen riostras o diagonales?',
      ayuda:
        'Son las guaduas o maderos puestos en diagonal dentro del muro. Son las que le dan la resistencia al sismo. Se ven donde el repello se cayó, o se detectan golpeando el muro.',
      tipo: 'unica',
      componente: 'muros',
      dibujo: 'muro-bahareque',
      opciones: [
        op('si', 'Sí, tiene diagonales', 0),
        op('algunas', 'Solo en algunos muros', 2),
        op('no', 'No tiene ninguna', 3),
        op('no_sabe', 'No se puede saber', 1),
      ],
    },
    {
      id: 'bah_uniones',
      titulo: '¿Cómo están las uniones entre guaduas?',
      ayuda:
        'Deben ser con pernos y arandelas, no con clavos. Los clavos rajan la guadua. Mira si hay guaduas rajadas justo en la unión.',
      tipo: 'unica',
      componente: 'muros',
      dibujo: 'guadua-uniones',
      fotoSugerida: true,
      opciones: [
        op('pernos', 'Con pernos y arandelas, firmes', 0),
        op('clavos', 'Con clavos', 2),
        op('rajadas', 'Rajadas en la unión', 3),
        op('sueltas', 'Sueltas o desarmadas', 4),
        op('no_visible', 'No se ven', 1),
      ],
    },
    {
      id: 'bah_medida_area_danada',
      titulo: 'Área aproximada de muro de bahareque a reparar',
      comoMedir: 'Largo × alto de cada paño dañado. Suma todos.',
      tipo: 'numero',
      unidad: 'm²',
      min: 0,
      max: 800,
      dibujo: 'medir-area',
      soloMedicion: true,
    },
  ],
}

const seccionMuroTierra: Seccion = {
  id: 'muros_tierra',
  titulo: 'Muros de tapia o adobe',
  subtitulo: 'Muros gruesos de tierra.',
  intro:
    'Los muros de tierra son pesados y frágiles: fallan volcándose hacia afuera. No golpees ni piques estos muros. Trátalos con mucho cuidado y nunca trabajes solo bajo un muro de tierra agrietado.',
  preguntas: [
    {
      id: 'tierra_grietas_verticales',
      titulo: '¿Hay grietas verticales en las esquinas de los muros de tierra?',
      ayuda: 'Es la falla típica: las esquinas se abren y el muro se vuelca hacia afuera.',
      tipo: 'unica',
      componente: 'muros',
      dibujo: 'tapia-fallas',
      fotoSugerida: true,
      opciones: OPCIONES_ANCHO_GRIETA,
    },
    {
      id: 'tierra_volcamiento',
      titulo: '¿Algún muro de tierra se está saliendo hacia afuera?',
      comoMedir: 'Plomada desde arriba. Si la separación abajo pasa de 3 cm, es grave.',
      tipo: 'unica',
      componente: 'muros',
      dibujo: 'tapia-fallas',
      fotoSugerida: true,
      opciones: [
        op('no', 'No, están rectos', 0),
        op('leve', 'Se ve una panza pequeña', 3),
        op('claro', 'Está claramente inclinado hacia afuera', 4, { banderaRoja: true }),
      ],
    },
    {
      id: 'tierra_erosion_base',
      titulo: '¿La base del muro de tierra está mojada o desmoronada?',
      tipo: 'unica',
      componente: 'cimentacion',
      opciones: [
        op('no', 'No, está seca y firme', 0),
        op('humeda', 'Húmeda', 2),
        op('erosionada', 'Desmoronada, se ve el material suelto', 3),
      ],
    },
  ],
}

const seccionEntrepiso: Seccion = {
  id: 'entrepiso',
  titulo: 'Entrepiso (segundo piso)',
  preguntas: [
    {
      id: 'entrepiso_material',
      titulo: '¿De qué es el entrepiso?',
      tipo: 'unica',
      componente: 'entrepiso',
      opciones: [
        op('madera', 'Madera o guadua con tablado', 0),
        op('losa', 'Losa de concreto', 1),
        op('mixto', 'Mixto', 1),
      ],
    },
    {
      id: 'entrepiso_estado',
      titulo: '¿Cómo se siente el entrepiso al caminar?',
      ayuda: 'Camina por el centro del vano más largo. Un piso que rebota o cruje mucho está fallando.',
      tipo: 'unica',
      componente: 'entrepiso',
      fotoSugerida: true,
      opciones: [
        op('firme', 'Firme', 0),
        op('cruje', 'Cruje o vibra un poco', 1),
        op('rebota', 'Rebota, se siente blando', 3),
        op('hundido', 'Está hundido o se ve pandeado', 4, { banderaRoja: true }),
      ],
    },
    {
      id: 'entrepiso_apoyos',
      titulo: '¿Las vigas del entrepiso se salieron de su apoyo en el muro?',
      ayuda: 'Mira dónde la viga entra al muro. Si se corrió y apoya menos de 5 cm, es peligroso.',
      tipo: 'unica',
      componente: 'entrepiso',
      fotoSugerida: true,
      opciones: [
        op('no', 'No, siguen bien apoyadas', 0),
        op('poco', 'Se corrieron un poco', 3),
        op('mucho', 'Están casi fuera del apoyo', 4, { banderaRoja: true }),
      ],
    },
    {
      id: 'entrepiso_escalera',
      titulo: '¿Cómo está la escalera?',
      tipo: 'unica',
      componente: 'entrepiso',
      opciones: [
        op('bien', 'Firme y sin daños', 0),
        op('grietas', 'Con grietas o peldaños sueltos', 2),
        op('separada', 'Se separó del muro o del piso', 3),
        op('sin_baranda', 'Sin baranda o con baranda suelta', 2),
      ],
    },
  ],
}

const seccionCubierta: Seccion = {
  id: 'cubierta',
  titulo: 'El techo',
  subtitulo: 'Estructura, tejas, aleros y culatas.',
  intro:
    'Mira el techo desde afuera y desde adentro. En un techo de teja de barro, lo primero que se mueve son las tejas y lo que primero se cae son las culatas (los muros triangulares de los extremos). Nunca te subas a un techo dañado.',
  preguntas: [
    {
      id: 'cub_estructura_estado',
      titulo: '¿Cómo está la estructura del techo por dentro?',
      ayuda: 'Alumbra con linterna desde adentro. Busca guaduas o maderos partidos, torcidos o descolgados.',
      tipo: 'unica',
      componente: 'cubierta',
      dibujo: 'cubierta-guadua',
      fotoSugerida: true,
      obligatoria: true,
      opciones: [
        op('bien', 'Derecha y firme', 0),
        op('leve', 'Algún elemento suelto o torcido', 1),
        op('partida', 'Hay guaduas o maderos partidos', 3),
        op('descolgada', 'El techo se descolgó o se ve hundido', 4, { banderaRoja: true }),
        op('colapsada', 'Se cayó una parte del techo', 4, { banderaRoja: true }),
      ],
    },
    {
      id: 'cub_apoyos',
      titulo: '¿Las vigas o correas del techo se salieron de su apoyo en los muros?',
      ayuda:
        'Es un daño muy común y muy peligroso: el techo se corre y deja de apoyarse. Mira cada punto donde el techo se apoya en un muro.',
      tipo: 'unica',
      componente: 'cubierta',
      dibujo: 'apoyo-cubierta',
      fotoSugerida: true,
      opciones: [
        op('no', 'No, siguen bien apoyadas y amarradas', 0),
        op('sin_amarre', 'Están apoyadas pero sin amarre visible', 2),
        op('corridas', 'Se corrieron de su sitio', 3),
        op('fuera', 'Alguna quedó casi fuera del apoyo', 4, { banderaRoja: true }),
      ],
    },
    {
      id: 'cub_tejas',
      titulo: '¿Cómo quedaron las tejas?',
      ayuda:
        'Mira desde el patio con distancia. Las tejas corridas dejan pasar el agua y pueden caer sobre alguien.',
      tipo: 'unica',
      componente: 'cubierta',
      dibujo: 'tejas',
      fotoSugerida: true,
      obligatoria: true,
      opciones: [
        op('bien', 'Completas y en su sitio', 0),
        op('pocas', 'Faltan o se corrieron unas pocas', 1),
        op('bastantes', 'Faltan o se corrieron bastantes', 2),
        op('caballete', 'Se cayó el caballete (la línea de arriba)', 2),
        op('gran_parte', 'Se cayó gran parte de las tejas', 3),
      ],
    },
    {
      id: 'cub_culatas',
      titulo: '¿Cómo están las culatas (los muros triangulares bajo el techo)?',
      ayuda:
        'Son los muros en punta en los extremos de la casa. Son altos, delgados, sin nada que los sostenga arriba, y se caen con mucha facilidad. Míralos siempre desde afuera y a distancia.',
      tipo: 'unica',
      componente: 'cubierta',
      dibujo: 'culata',
      fotoSugerida: true,
      obligatoria: true,
      opciones: [
        op('no_hay', 'La casa no tiene culatas', 0),
        op('bien', 'Sanas y bien amarradas', 0),
        op('grietas', 'Con grietas', 3),
        op('inclinada', 'Inclinada o separada del techo', 4, { banderaRoja: true }),
        op('caida', 'Ya se cayó', 4, { banderaRoja: true }),
      ],
    },
    {
      id: 'cub_aleros',
      titulo: '¿Cómo están los aleros?',
      ayuda: 'El alero es la parte del techo que sobresale. Si es muy largo y no tiene apoyo, se vence.',
      tipo: 'unica',
      componente: 'cubierta',
      opciones: [
        op('bien', 'Bien', 0),
        op('vencido', 'Vencido o descolgado', 2),
        op('roto', 'Roto o a punto de caer', 3),
      ],
    },
    {
      id: 'cub_humedad',
      titulo: '¿Hay goteras o humedad en el techo?',
      ayuda: 'Manchas oscuras, moho, madera hinchada. La humedad daña la guadua rápido.',
      tipo: 'unica',
      componente: 'cubierta',
      opciones: [
        op('no', 'No', 0),
        op('puntual', 'Alguna gotera puntual', 1),
        op('varias', 'Varias goteras', 2),
        op('generalizada', 'Se moja gran parte de la casa cuando llueve', 3),
      ],
    },
    {
      id: 'cub_cielo_raso',
      titulo: '¿El cielo raso está caído o suelto?',
      tipo: 'unica',
      componente: 'noEstructural',
      opciones: [
        op('no_hay', 'No hay cielo raso', 0),
        op('bien', 'Está bien', 0),
        op('suelto', 'Está suelto o pandeado', 2),
        op('caido', 'Se cayó', 2),
      ],
    },
    {
      id: 'cub_medida_area',
      titulo: 'Área aproximada del techo',
      comoMedir:
        'Área de la casa × 1,15 si el techo es de poca pendiente, × 1,3 si es empinado. O mide largo × ancho incluyendo los aleros.',
      tipo: 'numero',
      unidad: 'm²',
      min: 0,
      max: 1000,
      soloMedicion: true,
    },
    {
      id: 'cub_medida_tejas_faltantes',
      titulo: '¿Cuántas tejas faltan o están rotas, más o menos?',
      comoMedir: 'Cuenta las que faltan en un metro cuadrado y multiplica por el área afectada. Un m² lleva unas 28 tejas.',
      tipo: 'numero',
      unidad: 'tejas',
      min: 0,
      max: 5000,
      soloMedicion: true,
      visibleSi: (r) => !valorEs(r, 'cub_tejas', 'bien'),
    },
  ],
}

const seccionNoEstructural: Seccion = {
  id: 'no_estructural',
  titulo: 'Otros riesgos dentro y fuera',
  subtitulo: 'Cosas que no sostienen la casa pero pueden herir a alguien.',
  preguntas: [
    {
      id: 'ne_muros_divisorios',
      titulo: '¿Hay muros divisorios sueltos o inclinados?',
      ayuda: 'Los muros que no llegan hasta el techo se caen fácil. Empújalos suavemente con la mano abierta.',
      tipo: 'unica',
      componente: 'noEstructural',
      opciones: [
        op('no', 'No', 0),
        op('algunos', 'Alguno se mueve', 2),
        op('caidos', 'Alguno se cayó o está por caerse', 3),
      ],
    },
    {
      id: 'ne_elementos',
      titulo: '¿Qué otros elementos quedaron en riesgo de caer?',
      tipo: 'multiple',
      componente: 'noEstructural',
      fotoSugerida: true,
      opciones: [
        op('ninguno', 'Ninguno', 0),
        op('tanque', 'Tanque de agua elevado', 3),
        op('chimenea', 'Chimenea o ducto', 2),
        op('antepecho', 'Antepecho o muro de terraza', 2),
        op('vidrios', 'Vidrios rotos o sueltos', 1),
        op('muebles', 'Muebles altos o electrodomésticos sin asegurar', 1),
        op('poste', 'Poste o antena inclinada', 3),
      ],
    },
    {
      id: 'ne_salidas',
      titulo: '¿Las puertas de salida abren bien?',
      ayuda: 'Si una puerta quedó trancada, la familia puede quedar atrapada en otro sismo.',
      tipo: 'unica',
      componente: 'noEstructural',
      opciones: [
        op('bien', 'Todas abren', 0),
        op('rozan', 'Rozan pero abren', 1),
        op('trancada', 'Alguna quedó trancada', 2),
      ],
    },
  ],
}

const seccionCierre: Seccion = {
  id: 'cierre',
  titulo: 'Fotos y cierre',
  subtitulo: 'Lo que el ingeniero necesita ver desde lejos.',
  intro:
    'El profesional que revisa este reporte no va a estar en la casa. Las fotos son sus ojos. Tómalas con luz, de frente, y pon siempre algo que dé escala junto a las grietas.',
  preguntas: [
    {
      id: 'fotos_obligatorias',
      titulo: 'Fotos de la vivienda',
      ayuda:
        'Mínimo: las 4 fachadas, una foto general de cada ambiente, el techo por dentro, y una foto de cada daño con escala al lado.',
      tipo: 'fotos',
      dibujo: 'fotos-guia',
      obligatoria: true,
    },
    {
      id: 'observaciones_voluntario',
      titulo: '¿Algo más que el ingeniero deba saber?',
      ayuda:
        'Lo que te contó la familia, si el daño fue creciendo, si ya intentaron repararlo, si hay alguien con movilidad reducida, si llueve fuerte en la zona.',
      tipo: 'texto',
    },
    {
      id: 'urgencia_percibida',
      titulo: 'Según lo que viste, ¿qué tan urgente es atender esta casa?',
      tipo: 'unica',
      opciones: [
        op('baja', 'Puede esperar', 0),
        op('media', 'Debería atenderse en las próximas semanas', 1),
        op('alta', 'Necesita atención esta semana', 2),
        op('inmediata', 'Necesita atención hoy', 3),
      ],
    },
  ],
}

/* ------------------------------------------------------------------ */

export const SECCIONES: Seccion[] = [
  seccionSeguridad,
  seccionIdentificacion,
  seccionTerreno,
  seccionTipologia,
  seccionCimentacion,
  { ...seccionMuroMamposteria, preguntas: seccionMuroMamposteria.preguntas },
  seccionMuroBahareque,
  seccionMuroTierra,
  seccionEntrepiso,
  seccionCubierta,
  seccionNoEstructural,
  seccionCierre,
]

/** Secciones que solo aplican segun el sistema constructivo o el numero de pisos. */
const CONDICION_SECCION: Record<string, (r: Respuestas) => boolean> = {
  muros_mamposteria: hayMamposteria,
  muros_bahareque: hayBahareque,
  muros_tierra: hayTierra,
  entrepiso: dosPisos,
}

export function seccionVisible(seccion: Seccion, r: Respuestas): boolean {
  const cond = CONDICION_SECCION[seccion.id]
  return cond ? cond(r) : true
}

export function preguntaVisible(pregunta: Pregunta, r: Respuestas): boolean {
  return pregunta.visibleSi ? pregunta.visibleSi(r) : true
}

export function seccionesVisibles(r: Respuestas): Seccion[] {
  return SECCIONES.filter((s) => seccionVisible(s, r))
}

export function preguntasVisibles(seccion: Seccion, r: Respuestas): Pregunta[] {
  return seccion.preguntas.filter((p) => preguntaVisible(p, r))
}

const INDICE_PREGUNTAS: Map<string, Pregunta> = new Map(
  SECCIONES.flatMap((s) => s.preguntas.map((p) => [p.id, p] as const)),
)

export function buscarPregunta(id: string): Pregunta | undefined {
  return INDICE_PREGUNTAS.get(id)
}
