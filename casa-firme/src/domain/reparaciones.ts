import type { Componente, Diagnostico, Respuestas } from '../lib/tipos'
import { numero, valorEs } from './checklist'

/* ------------------------------------------------------------------ */
/* Coeficientes de consumo                                             */
/* ------------------------------------------------------------------ */
/**
 * Rendimientos usados para estimar materiales. Son valores de presupuesto
 * corrientes en obra en Colombia; sirven para ir a comprar, NO reemplazan el
 * despiece que haga el profesional. Todos incluyen desperdicio aparte.
 *
 * Mortero 1:4 (cemento : arena), por metro cubico de mortero:
 *   cemento 8,5 bultos de 50 kg  |  arena 1,05 m3  |  agua ~190 L
 */
export const RENDIMIENTOS = {
  /** Bultos de 50 kg de cemento por m3 de mortero 1:4. */
  cementoPorM3Mortero: 8.5,
  /** m3 de arena por m3 de mortero 1:4. */
  arenaPorM3Mortero: 1.05,
  /** Espesor del repello corriente (m). */
  espesorRepello: 0.025,
  /** Espesor del enchape estructural con malla (m). */
  espesorEnchape: 0.03,
  /** m2 de malla por m2 de muro, incluyendo traslapos. */
  mallaPorM2: 1.15,
  /** Conectores (clavo de acero + arandela) por m2 de muro, a 45 cm. */
  conectoresPorM2: 5,
  /** Metros de grieta que rinde un bulto de cemento en inyeccion. */
  grietaPorBultoCemento: 35,
  /** Tejas de barro por m2 de cubierta. */
  tejasPorM2: 28,
  /** Desperdicio general aplicado a materiales granulares y piezas. */
  desperdicio: 0.1,
} as const

const bultos = (m3Mortero: number) =>
  redondear(m3Mortero * RENDIMIENTOS.cementoPorM3Mortero * (1 + RENDIMIENTOS.desperdicio), 0.5)

const arena = (m3Mortero: number) =>
  redondear(m3Mortero * RENDIMIENTOS.arenaPorM3Mortero * (1 + RENDIMIENTOS.desperdicio), 0.25)

function redondear(valor: number, paso: number): number {
  if (valor <= 0) return 0
  // El +1e-9 absorbe el ruido de coma flotante (100 * 1,1 da 110,00000000000001
  // y sin esto se pediria un bulto o una teja de mas en cada calculo).
  return Math.round(Math.ceil(valor / paso - 1e-9) * paso * 100) / 100
}

/** Piezas enteras con desperdicio, sin que la coma flotante infle la cantidad. */
function piezas(cantidad: number, desperdicio = RENDIMIENTOS.desperdicio): number {
  return Math.ceil(cantidad * (1 + desperdicio) - 1e-9)
}

/* ------------------------------------------------------------------ */
/* Tipos                                                               */
/* ------------------------------------------------------------------ */

export interface Material {
  nombre: string
  unidad: string
  cantidad: number
  nota?: string
}

export interface Paso {
  titulo: string
  detalle: string
  dibujo?: string
  advertencia?: string
}

export type QuienLoHace = 'voluntario' | 'oficial' | 'profesional'

export const ETIQUETA_QUIEN: Record<QuienLoHace, string> = {
  voluntario: 'Lo puede hacer un voluntario con instrucciones',
  oficial: 'Necesita un oficial de construcción con experiencia',
  profesional: 'Debe diseñarlo y dirigirlo un ingeniero o arquitecto',
}

/** 1 = ahora mismo (seguridad) · 2 = reparación · 3 = mejora recomendada */
export type Prioridad = 1 | 2 | 3

export const ETIQUETA_PRIORIDAD: Record<Prioridad, string> = {
  1: 'Urgente — antes de cualquier otra cosa',
  2: 'Reparación del daño',
  3: 'Mejora recomendada',
}

export interface Medida {
  cantidad: number
  unidad: string
}

export interface Reparacion {
  id: string
  titulo: string
  /** Que es y por que se hace, en lenguaje corriente. */
  resumen: string
  componente: Componente
  prioridad: Prioridad
  quienLoHace: QuienLoHace
  dibujo?: string
  /** Condicion para que el sistema la proponga. */
  aplicaSi: (r: Respuestas, d: Diagnostico) => boolean
  /** Cantidad de obra que dispara los materiales. */
  medir: (r: Respuestas) => Medida
  materiales: (m: Medida) => Material[]
  herramientas: string[]
  pasos: Paso[]
  seguridad?: string[]
  /** Jornales estimados (1 jornal = 1 persona 1 dia). */
  jornales?: (m: Medida) => number
}

/* ------------------------------------------------------------------ */
/* Catalogo                                                            */
/* ------------------------------------------------------------------ */

const sinMedida = (): Medida => ({ cantidad: 1, unidad: 'global' })

export const CATALOGO: Reparacion[] = [
  /* ---------------- Prioridad 1: seguridad inmediata --------------- */
  {
    id: 'evacuar_senalizar',
    titulo: 'Desalojar, acordonar y señalizar la vivienda',
    resumen:
      'La casa no es segura. Lo primero es que nadie entre, ni siquiera "un momentico por las cosas". Se acordona, se pone el aviso rojo y se avisa al comité de emergencia del municipio.',
    componente: 'muros',
    prioridad: 1,
    quienLoHace: 'voluntario',
    dibujo: 'acordonar',
    aplicaSi: (_r, d) => d.habitabilidadSugerida === 'rojo',
    medir: (r) => ({ cantidad: Math.max(20, Math.round(Math.sqrt(numero(r, 'medida_area') || 60) * 4 * 1.5)), unidad: 'm' }),
    materiales: (m) => [
      { nombre: 'Cinta de peligro (rollo de 100 m)', unidad: 'rollo', cantidad: Math.max(1, Math.ceil(m.cantidad / 100)) },
      { nombre: 'Estacas de madera 1,2 m', unidad: 'und', cantidad: Math.max(4, Math.ceil(m.cantidad / 5)) },
      { nombre: 'Aviso impreso "NO HABITABLE"', unidad: 'und', cantidad: 2 },
    ],
    herramientas: ['Martillo', 'Marcador'],
    pasos: [
      {
        titulo: 'Saca a todo el mundo',
        detalle:
          'Incluidos animales. Ayuda a la familia a recuperar documentos, medicamentos y ropa SOLO si el ingreso es claramente seguro y rápido. Si hay duda, no se entra.',
        advertencia: 'Nunca entres a una casa con riesgo de colapso para recuperar objetos.',
      },
      {
        titulo: 'Acordona a distancia segura',
        detalle:
          'La cinta va a una distancia igual a la altura de la casa. Si la casa mide 4 m de alto, la cinta va a 4 m de la pared. Así, si algo cae, no alcanza a nadie.',
        dibujo: 'acordonar',
      },
      {
        titulo: 'Pon el aviso rojo en la puerta',
        detalle: 'Escribe la fecha, el código de la vivienda y el teléfono del comité. El aviso no lo puede quitar nadie sin autorización.',
      },
      {
        titulo: 'Reporta el mismo día',
        detalle:
          'Avisa al consejo municipal de gestión del riesgo y al coordinador del grupo. Registra a dónde se va la familia a dormir.',
      },
    ],
    seguridad: ['No trabajes solo.', 'Casco siempre.', 'No pases bajo aleros ni culatas agrietadas.'],
    jornales: () => 0.5,
  },
  {
    id: 'cortar_servicios',
    titulo: 'Cortar gas y electricidad',
    resumen:
      'Un escape de gas o un cable pelado dentro de una casa dañada es tan peligroso como el sismo. Se cortan los dos hasta que un técnico revise.',
    componente: 'redes',
    prioridad: 1,
    quienLoHace: 'voluntario',
    aplicaSi: (r) =>
      valorEs(r, 'peligro_servicios', 'cables', 'gas', 'pipeta') || valorEs(r, 'servicios_estado', 'sanitario'),
    medir: sinMedida,
    materiales: () => [
      { nombre: 'Cinta aislante', unidad: 'rollo', cantidad: 1 },
      { nombre: 'Tapón para tubería', unidad: 'und', cantidad: 1, nota: 'Solo si hay tubo roto' },
    ],
    herramientas: ['Guantes dieléctricos', 'Llave de tubo'],
    pasos: [
      {
        titulo: 'Gas primero',
        detalle:
          'Cierra la válvula de la pipeta o la llave de paso. Saca la pipeta al patio, parada y a la sombra. NO prendas luces, no uses celular adentro, no fumes.',
        advertencia: 'Si el olor a gas es fuerte, no entres. Ventila desde afuera y llama a bomberos.',
      },
      {
        titulo: 'Luego la electricidad',
        detalle: 'Baja el totalizador (el breaker principal) del tablero. Si el tablero está mojado o hay cables caídos, NO lo toques: llama al operador de red.',
      },
      {
        titulo: 'Agua',
        detalle: 'Cierra el registro si hay tubos rotos, para no perder el agua ni mojar más los muros.',
      },
    ],
    jornales: () => 0.25,
  },
  {
    id: 'apuntalar',
    titulo: 'Apuntalar lo que está por caerse',
    resumen:
      'Un puntal es un palo que sostiene provisionalmente un muro, una viga o un techo que se descolgó. No repara nada: solo evita que se caiga mientras llega la solución definitiva.',
    componente: 'muros',
    prioridad: 1,
    quienLoHace: 'oficial',
    dibujo: 'apuntalamiento',
    aplicaSi: (r, d) =>
      d.habitabilidadSugerida === 'rojo' ||
      valorEs(r, 'cub_estructura_estado', 'partida', 'descolgada') ||
      valorEs(r, 'cub_apoyos', 'corridas', 'fuera') ||
      valorEs(r, 'entrepiso_estado', 'rebota', 'hundido') ||
      valorEs(r, 'cub_culatas', 'grietas', 'inclinada') ||
      valorEs(r, 'peligro_colapso', 'parcial'),
    medir: (r) => ({ cantidad: Math.max(4, Math.round((numero(r, 'medida_area') || 60) / 12)), unidad: 'puntales' }),
    materiales: (m) => [
      { nombre: 'Puntal de madera rolliza o guadua Ø10 cm × 3 m', unidad: 'und', cantidad: m.cantidad },
      { nombre: 'Tabla de 30 × 2,5 cm × 1 m (para reparto de carga)', unidad: 'und', cantidad: m.cantidad * 2 },
      { nombre: 'Cuñas de madera', unidad: 'und', cantidad: m.cantidad * 2 },
      { nombre: 'Puntilla de 3"', unidad: 'kg', cantidad: redondear(m.cantidad * 0.15, 0.5) },
      { nombre: 'Alambre galvanizado calibre 12', unidad: 'kg', cantidad: redondear(m.cantidad * 0.3, 0.5) },
    ],
    herramientas: ['Serrucho', 'Martillo', 'Nivel', 'Metro', 'Escalera'],
    pasos: [
      {
        titulo: 'Decide de dónde a dónde va el puntal',
        detalle:
          'El puntal siempre va de un piso firme a la parte que se está cayendo. Si el piso es de tierra, entierra una tabla o una base de concreto para que el puntal no se hunda.',
        dibujo: 'apuntalamiento',
      },
      {
        titulo: 'Ponlo lo más vertical posible',
        detalle:
          'Un puntal inclinado más de 15° resbala. Si tienes que inclinarlo, ponle un tope clavado en el piso para que no se corra.',
      },
      {
        titulo: 'Reparte la carga arriba y abajo',
        detalle:
          'Nunca apoyes el puntal directo contra el muro: pon una tabla de 30 cm arriba y otra abajo para repartir la fuerza.',
      },
      {
        titulo: 'Aprieta con cuñas, sin forzar',
        detalle:
          'Mete dos cuñas encontradas y golpéalas suave hasta que el puntal quede firme. NO trates de "levantar" el techo con el puntal: solo sostenerlo donde quedó.',
        advertencia: 'Forzar un puntal puede reventar el muro. Firme, no apretado.',
      },
      {
        titulo: 'Arriostra los puntales entre sí',
        detalle: 'Si pones varios, amárralos con tablas en diagonal para que no se vayan todos juntos hacia un lado.',
      },
    ],
    seguridad: [
      'Mínimo dos personas, una siempre mirando la parte que puede caer.',
      'Casco y botas.',
      'Si el muro se mueve mientras trabajas, salgan de inmediato.',
    ],
    jornales: (m) => Math.max(1, m.cantidad * 0.4),
  },
  {
    id: 'cubierta_provisional',
    titulo: 'Cubierta provisional contra la lluvia',
    resumen:
      'Mientras se repara el techo, el agua es el segundo enemigo: pudre la guadua, ablanda el bahareque y desmorona la tapia. Un plástico bien puesto salva la casa.',
    componente: 'cubierta',
    prioridad: 1,
    quienLoHace: 'voluntario',
    dibujo: 'cubierta-provisional',
    aplicaSi: (r) =>
      valorEs(r, 'cub_tejas', 'bastantes', 'caballete', 'gran_parte') ||
      valorEs(r, 'cub_humedad', 'varias', 'generalizada') ||
      valorEs(r, 'cub_estructura_estado', 'partida', 'descolgada', 'colapsada'),
    medir: (r) => ({
      cantidad: Math.max(12, Math.round((numero(r, 'cub_medida_area') || numero(r, 'medida_area') || 60) * 0.4)),
      unidad: 'm²',
    }),
    materiales: (m) => [
      { nombre: 'Plástico calibre 6 o lona impermeable', unidad: 'm²', cantidad: redondear(m.cantidad * 1.2, 1) },
      { nombre: 'Listón de madera 4 × 4 cm × 3 m', unidad: 'und', cantidad: Math.ceil(m.cantidad / 6) },
      { nombre: 'Puntilla con arandela', unidad: 'kg', cantidad: redondear(m.cantidad * 0.02, 0.5) },
      { nombre: 'Cuerda de polipropileno', unidad: 'm', cantidad: redondear(m.cantidad * 1.5, 5) },
    ],
    herramientas: ['Martillo', 'Tijeras', 'Escalera', 'Cuerda de vida'],
    pasos: [
      {
        titulo: 'No te subas al techo',
        detalle:
          'Trabaja desde una escalera o desde adentro. Un techo con tejas corridas no aguanta el peso de una persona.',
        advertencia: 'Las tejas de barro sueltas se resbalan. Nunca pises sobre teja.',
      },
      {
        titulo: 'Empieza por arriba',
        detalle:
          'El plástico se pone desde el caballete hacia abajo, para que el agua escurra por encima y no se meta por las uniones, como si fueran tejas.',
        dibujo: 'cubierta-provisional',
      },
      {
        titulo: 'Traslapa 30 cm',
        detalle: 'Cada tira de plástico monta 30 cm sobre la de abajo.',
      },
      {
        titulo: 'Sujeta con listones, no con puntillas sueltas',
        detalle:
          'Clava un listón encima del plástico cada 2 m. La puntilla sola rasga el plástico con el primer viento.',
      },
      {
        titulo: 'Deja que el agua caiga lejos del muro',
        detalle: 'El plástico debe sobresalir 50 cm de la pared. El agua que cae al pie del muro es la que descalza la casa.',
      },
    ],
    jornales: (m) => Math.max(0.5, m.cantidad / 40),
  },
  {
    id: 'asegurar_culata',
    titulo: 'Bajar o asegurar la culata en riesgo',
    resumen:
      'La culata es el muro triangular del extremo del techo. Es alto, delgado y no tiene nada que lo agarre arriba: es lo que primero se cae y lo que más gente ha matado en los sismos de Colombia.',
    componente: 'cubierta',
    prioridad: 1,
    quienLoHace: 'oficial',
    dibujo: 'culata',
    aplicaSi: (r) => valorEs(r, 'cub_culatas', 'grietas', 'inclinada', 'caida'),
    medir: (r) => ({ cantidad: valorEs(r, 'cub_culatas', 'caida') ? 1 : 2, unidad: 'culatas' }),
    materiales: (m) => [
      { nombre: 'Listón de madera 4 × 8 cm × 3 m (marco liviano)', unidad: 'und', cantidad: m.cantidad * 6 },
      { nombre: 'Lámina de fibrocemento o madera para cerramiento liviano', unidad: 'm²', cantidad: m.cantidad * 6 },
      { nombre: 'Tornillos autoperforantes', unidad: 'caja', cantidad: m.cantidad },
      { nombre: 'Platina metálica de anclaje', unidad: 'und', cantidad: m.cantidad * 6 },
    ],
    herramientas: ['Barra', 'Martillo', 'Taladro', 'Escalera', 'Cuerda'],
    pasos: [
      {
        titulo: 'Acordona por fuera',
        detalle: 'Nadie puede estar del lado hacia donde puede caer la culata.',
        advertencia: 'Se desmonta desde adentro o desde andamio, nunca parado debajo.',
      },
      {
        titulo: 'Desmonta de arriba hacia abajo, pieza por pieza',
        detalle:
          'No se tumba de un solo empujón: se van bajando los ladrillos o el material desde la punta, por hiladas, pasándolos de mano en mano.',
      },
      {
        titulo: 'Reemplázala por una culata liviana',
        detalle:
          'La solución buena no es volverla a levantar en ladrillo, sino cerrar ese triángulo con un marco de madera y lámina liviana, amarrado a la estructura del techo. Pesa 10 veces menos y no se cae.',
        dibujo: 'culata',
      },
      {
        titulo: 'Amárrala arriba y abajo',
        detalle: 'El marco se atornilla a la viga del techo arriba y a la viga de amarre del muro abajo, con platinas.',
      },
    ],
    seguridad: ['Casco obligatorio.', 'Área despejada abajo.', 'Nunca desmontar con viento fuerte.'],
    jornales: (m) => m.cantidad * 1.5,
  },

  /* ---------------- Prioridad 2: reparacion ------------------------ */
  {
    id: 'sellar_fisuras',
    titulo: 'Sellar fisuras finas',
    resumen:
      'Las fisuras de menos de 1 mm casi siempre son solo del pañete. No debilitan la casa, pero por ahí se mete el agua. Se sellan y se pintan.',
    componente: 'muros',
    prioridad: 2,
    quienLoHace: 'voluntario',
    dibujo: 'sellar-fisura',
    aplicaSi: (r) =>
      valorEs(r, 'mamp_grietas_diagonales', 'capilar', 'fina') ||
      valorEs(r, 'grietas_zocalo', 'capilar', 'fina') ||
      valorEs(r, 'bah_recubrimiento', 'fisuras'),
    medir: (r) => ({ cantidad: Math.max(5, numero(r, 'mamp_medida_grietas') || 10), unidad: 'm' }),
    materiales: (m) => [
      { nombre: 'Masilla o estuco exterior', unidad: 'kg', cantidad: redondear(m.cantidad * 0.35, 0.5) },
      { nombre: 'Sellante elástico (para fisuras vivas)', unidad: 'tubo', cantidad: Math.ceil(m.cantidad / 12) },
      { nombre: 'Pintura de acabado', unidad: 'galón', cantidad: Math.ceil(m.cantidad / 40) },
    ],
    herramientas: ['Espátula', 'Brocha', 'Cepillo de alambre', 'Balde'],
    pasos: [
      {
        titulo: 'Abre la fisura en V',
        detalle:
          'Con la punta de la espátula o un destornillador, abre la fisura un poquito en forma de V, de unos 5 mm. Suena raro, pero la masilla necesita dónde agarrarse.',
        dibujo: 'sellar-fisura',
      },
      { titulo: 'Limpia y humedece', detalle: 'Saca el polvo con cepillo y moja con brocha. Sobre polvo no pega nada.' },
      { titulo: 'Rellena y alisa', detalle: 'Aprieta la masilla contra el fondo de la fisura, no solo por encima. Alisa al ras.' },
      {
        titulo: 'Marca la fecha al lado',
        detalle:
          'Con lápiz, escribe la fecha junto a la fisura reparada. Si vuelve a abrirse en las siguientes semanas, ya no es del pañete: avisa al ingeniero.',
      },
    ],
    jornales: (m) => Math.max(0.5, m.cantidad / 25),
  },
  {
    id: 'inyeccion_grietas',
    titulo: 'Inyectar las grietas del muro',
    resumen:
      'Para grietas de 1 a 5 mm en muros de ladrillo o bloque. Se rellenan con lechada de cemento a presión para devolverle al muro la continuidad que perdió. Es la reparación clásica y probada.',
    componente: 'muros',
    prioridad: 2,
    quienLoHace: 'oficial',
    dibujo: 'inyeccion-grieta',
    aplicaSi: (r) =>
      valorEs(r, 'mamp_grietas_diagonales', 'media', 'ancha') ||
      valorEs(r, 'mamp_grietas_esquina', 'media', 'ancha') ||
      valorEs(r, 'grietas_zocalo', 'media', 'ancha'),
    medir: (r) => ({ cantidad: Math.max(3, numero(r, 'mamp_medida_grietas') || 12), unidad: 'm' }),
    materiales: (m) => [
      {
        nombre: 'Cemento gris',
        unidad: 'bulto 50 kg',
        cantidad: Math.max(1, Math.ceil(m.cantidad / RENDIMIENTOS.grietaPorBultoCemento)),
        nota: 'Para la lechada de inyección',
      },
      { nombre: 'Aditivo expansivo / no retráctil', unidad: 'kg', cantidad: redondear(m.cantidad * 0.05, 0.5) },
      { nombre: 'Arena fina cernida', unidad: 'm³', cantidad: redondear(m.cantidad * 0.004, 0.25) },
      { nombre: 'Boquillas o tubos plásticos Ø10 mm', unidad: 'und', cantidad: Math.ceil(m.cantidad / 0.3) },
      { nombre: 'Mortero de sello (cemento-arena 1:4)', unidad: 'bulto 50 kg', cantidad: Math.max(1, Math.ceil(m.cantidad / 25)) },
    ],
    herramientas: ['Jeringa grande o bomba manual de inyección', 'Espátula', 'Taladro', 'Balde', 'Cepillo de alambre'],
    pasos: [
      {
        titulo: 'Antes que nada: ¿por qué se rajó?',
        detalle:
          'Si la grieta viene de un asentamiento del terreno que sigue activo, inyectar no sirve de nada: se vuelve a rajar. Esto solo se hace cuando el ingeniero ya confirmó que la causa está controlada.',
        advertencia: 'No inyectes grietas si la casa se sigue moviendo o el terreno está fallando.',
      },
      {
        titulo: 'Pica el pañete a lado y lado',
        detalle: 'Retira el pañete 10 cm a cada lado de la grieta, hasta ver el ladrillo. Necesitas ver por dónde va realmente.',
      },
      {
        titulo: 'Pon las boquillas cada 30 cm',
        detalle:
          'Mete un tubito plástico dentro de la grieta cada 30 cm, empezando por la parte más baja. Por ahí va a entrar la lechada.',
        dibujo: 'inyeccion-grieta',
      },
      {
        titulo: 'Sella la grieta por fuera',
        detalle:
          'Tapa toda la grieta con mortero, dejando salir solo las boquillas. Espera un día a que endurezca. Si no sellas bien, la lechada se sale por donde quiera.',
      },
      {
        titulo: 'Inyecta de abajo hacia arriba',
        detalle:
          'Prepara la lechada (agua + cemento + aditivo, consistencia de leche condensada). Inyecta por la boquilla más baja hasta que salga lechada por la siguiente. Tapa esa y sigue subiendo.',
      },
      {
        titulo: 'Espera y luego repella',
        detalle: 'Deja curar 7 días mojando el sello. Después corta las boquillas y repella toda la zona.',
      },
    ],
    seguridad: ['Gafas de seguridad: la lechada salta.', 'Guantes: el cemento quema la piel.'],
    jornales: (m) => Math.max(1, m.cantidad / 8),
  },
  {
    id: 'enchape_malla',
    titulo: 'Reforzar el muro con malla y mortero',
    resumen:
      'Es la reparación más eficaz y más económica que existe para un muro agrietado: se le pone al muro una "camisa" de malla de acero cubierta con mortero. Los ensayos muestran que devuelve casi toda la resistencia perdida y además le da al muro capacidad de aguantar sin partirse.',
    componente: 'muros',
    prioridad: 2,
    quienLoHace: 'profesional',
    dibujo: 'malla-mortero',
    aplicaSi: (r, d) => {
      const compMuros = d.porComponente.find((c) => c.componente === 'muros')
      return (
        (compMuros?.severidad ?? 0) >= 2 ||
        valorEs(r, 'mamp_grietas_diagonales', 'ancha', 'muy_ancha', 'desplazada') ||
        valorEs(r, 'material_muros', 'ladrillo_sin_confinar')
      )
    },
    medir: (r) => ({
      cantidad: Math.max(6, numero(r, 'mamp_medida_area_danada') || Math.round((numero(r, 'medida_area') || 60) * 0.5)),
      unidad: 'm²',
    }),
    materiales: (m) => {
      const volMortero = m.cantidad * RENDIMIENTOS.espesorEnchape
      return [
        {
          nombre: 'Malla electrosoldada 4 mm, cuadrícula 15 × 15 cm',
          unidad: 'm²',
          cantidad: redondear(m.cantidad * RENDIMIENTOS.mallaPorM2, 1),
          nota: 'Cerrar la malla en las esquinas, doblándola 45 cm sobre el muro perpendicular',
        },
        { nombre: 'Cemento gris', unidad: 'bulto 50 kg', cantidad: bultos(volMortero) },
        { nombre: 'Arena de pega lavada', unidad: 'm³', cantidad: arena(volMortero) },
        {
          nombre: 'Conectores (clavo de acero 2½" + arandela)',
          unidad: 'und',
          cantidad: piezas(m.cantidad * RENDIMIENTOS.conectoresPorM2),
          nota: 'Uno cada 45 cm en las dos direcciones',
        },
        { nombre: 'Alambre negro para amarres', unidad: 'kg', cantidad: redondear(m.cantidad * 0.05, 0.5) },
        { nombre: 'Agua', unidad: 'L', cantidad: redondear(volMortero * 190, 10) },
      ]
    },
    herramientas: ['Pulidora o cincel', 'Taladro percutor', 'Tijera para malla', 'Palustre', 'Boquillera', 'Nivel', 'Andamio'],
    pasos: [
      {
        titulo: 'Esto lo diseña el ingeniero',
        detalle:
          'Cuáles muros se enchapan, por una cara o por las dos, y hasta dónde llega la malla: eso lo define el profesional que revisó el reporte. Aquí solo va la ejecución.',
        advertencia: 'Enchapar solo un muro puede desbalancear la casa. Nunca improvises cuáles muros reforzar.',
      },
      {
        titulo: 'Pica todo el pañete del muro',
        detalle:
          'Se retira el pañete completo hasta dejar el ladrillo a la vista y se rayan las juntas 1 cm. El mortero nuevo tiene que agarrarse del ladrillo, no del pañete viejo.',
      },
      {
        titulo: 'Repara primero las grietas grandes',
        detalle: 'Las grietas de más de 5 mm se rellenan con mortero antes de poner la malla.',
      },
      {
        titulo: 'Clava la malla cada 45 cm',
        detalle:
          'La malla se separa 1 cm del muro (usa tapas plásticas o pedacitos de mortero) para que el mortero la envuelva por los dos lados. Se fija con clavo de acero y arandela cada 45 cm.',
        dibujo: 'malla-mortero',
      },
      {
        titulo: 'Dobla la malla en las esquinas',
        detalle:
          'En cada esquina, la malla se pasa 45 cm al muro vecino. Es el detalle que hace que funcione: si la malla se corta en la esquina, el refuerzo no sirve.',
      },
      {
        titulo: 'Amarra abajo y arriba',
        detalle:
          'La malla debe anclarse al sobrecimiento abajo y a la viga de amarre arriba. Si no hay viga de amarre, hay que hacerla (ver la mejora correspondiente).',
      },
      {
        titulo: 'Lanza el mortero, 3 cm',
        detalle:
          'Mortero 1:4. Se lanza con fuerza contra la malla para que penetre y no queden huecos. Se hace en dos capas: una de 1,5 cm, y cuando "tire", la segunda hasta 3 cm.',
      },
      {
        titulo: 'Cura 7 días',
        detalle:
          'Mójalo dos veces al día durante una semana. El mortero que se seca rápido se raja y no coge resistencia. Este paso es gratis y es el que más se salta la gente.',
      },
    ],
    seguridad: ['Gafas y tapabocas al picar.', 'Guantes al cortar malla.', 'Andamio amarrado, no escaleras improvisadas.'],
    jornales: (m) => Math.max(2, m.cantidad / 4),
  },
  {
    id: 'viga_amarre',
    titulo: 'Construir la viga de amarre en la parte alta de los muros',
    resumen:
      'Es un "cinturón" de concreto que corre por encima de todos los muros y los amarra entre sí. Sin ella cada muro trabaja solo y se vuelca. Es la mejora que más cambia el comportamiento de una casa vieja.',
    componente: 'muros',
    prioridad: 2,
    quienLoHace: 'profesional',
    dibujo: 'viga-amarre',
    aplicaSi: (r) => valorEs(r, 'mamp_viga_amarre', 'no', 'parcial') || valorEs(r, 'material_muros', 'ladrillo_sin_confinar'),
    medir: (r) => {
      const area = numero(r, 'medida_area') || 60
      // Perimetro estimado de una planta compacta + un muro interior por cada 6 m de lado.
      const lado = Math.sqrt(area)
      return { cantidad: Math.round(lado * 4 + lado), unidad: 'm' }
    },
    materiales: (m) => {
      // Viga 15 x 20 cm = 0,03 m3/m de concreto de 21 MPa.
      const volConcreto = m.cantidad * 0.03
      return [
        { nombre: 'Cemento gris', unidad: 'bulto 50 kg', cantidad: redondear(volConcreto * 7.5 * 1.1, 0.5) },
        { nombre: 'Arena de río', unidad: 'm³', cantidad: redondear(volConcreto * 0.55 * 1.1, 0.25) },
        { nombre: 'Grava (triturado ¾")', unidad: 'm³', cantidad: redondear(volConcreto * 0.85 * 1.1, 0.25) },
        {
          nombre: 'Varilla corrugada Ø3/8" (n.° 3), tramos de 6 m',
          unidad: 'und',
          cantidad: Math.ceil((m.cantidad * 4 * 1.1) / 6),
          nota: '4 varillas longitudinales',
        },
        {
          nombre: 'Varilla lisa Ø1/4" para estribos',
          unidad: 'und',
          cantidad: Math.ceil((m.cantidad * 0.8 * 1.1) / 6),
          nota: 'Estribos cada 20 cm',
        },
        { nombre: 'Alambre negro', unidad: 'kg', cantidad: redondear(m.cantidad * 0.1, 0.5) },
        { nombre: 'Tabla de formaleta 30 cm', unidad: 'm', cantidad: redondear(m.cantidad * 2.2, 1) },
      ]
    },
    herramientas: ['Cincel y maceta', 'Cortadora de varilla', 'Alicate', 'Vibrador o varilla de chuzar', 'Nivel de manguera'],
    pasos: [
      {
        titulo: 'El ingeniero define la sección y el acero',
        detalle: 'Las cantidades de aquí son para presupuestar. El despiece real lo entrega el profesional.',
        advertencia: 'Nunca cortes un muro para hacer la viga sin apuntalar primero el techo.',
      },
      {
        titulo: 'Apuntala el techo',
        detalle: 'Vas a quitar la parte de arriba del muro: el techo tiene que quedar sostenido por puntales antes de empezar.',
      },
      {
        titulo: 'Trabaja por tramos cortos',
        detalle:
          'Nunca descabeces todo el muro de una vez. Se hacen tramos de máximo 1,5 m, dejando tramos completos entre medio, y se van alternando.',
      },
      {
        titulo: 'Amarra el acero de forma continua',
        detalle:
          'Las varillas deben ser continuas y doblarse en las esquinas para amarrar los dos muros. Los traslapos van de 50 cm mínimo y nunca en la esquina.',
        dibujo: 'viga-amarre',
      },
      { titulo: 'Funde y cura', detalle: 'Concreto bien chuzado, sin hormigueros. Mojar 7 días.' },
    ],
    jornales: (m) => Math.max(4, m.cantidad * 0.6),
  },
  {
    id: 'reparar_bahareque',
    titulo: 'Reparar el paño de bahareque',
    resumen:
      'Se retira el repello dañado, se revisa y se cura la guadua por dentro, se pone malla nueva y se vuelve a repellar. El bahareque bien mantenido dura generaciones.',
    componente: 'muros',
    prioridad: 2,
    quienLoHace: 'oficial',
    dibujo: 'muro-bahareque',
    aplicaSi: (r) =>
      valorEs(r, 'bah_recubrimiento', 'desprendido_poco', 'desprendido_mucho') ||
      valorEs(r, 'bah_estructura', 'humedad', 'rajada'),
    medir: (r) => ({ cantidad: Math.max(4, numero(r, 'bah_medida_area_danada') || 15), unidad: 'm²' }),
    materiales: (m) => {
      const vol = m.cantidad * RENDIMIENTOS.espesorRepello
      return [
        { nombre: 'Malla de gallinero calibre 20 o malla con venas', unidad: 'm²', cantidad: redondear(m.cantidad * 1.15, 1) },
        { nombre: 'Cemento gris', unidad: 'bulto 50 kg', cantidad: bultos(vol) },
        { nombre: 'Arena de pega', unidad: 'm³', cantidad: arena(vol) },
        { nombre: 'Cal hidratada', unidad: 'kg', cantidad: redondear(m.cantidad * 1.5, 1), nota: 'Da plasticidad al mortero' },
        { nombre: 'Grapas o puntillas de 1½"', unidad: 'kg', cantidad: redondear(m.cantidad * 0.06, 0.5) },
        { nombre: 'Esterilla de guadua', unidad: 'm²', cantidad: redondear(m.cantidad * 0.3, 1), nota: 'Solo donde haya que reponer' },
      ]
    },
    herramientas: ['Palustre', 'Martillo', 'Grapadora', 'Tijera para malla', 'Cepillo', 'Brocha'],
    pasos: [
      {
        titulo: 'Retira el repello suelto',
        detalle:
          'Golpea suave con el mango del martillo: donde suene hueco, el repello ya se despegó y hay que quitarlo, aunque se vea entero. Retíralo hasta llegar a zona firme.',
      },
      {
        titulo: 'Revisa la guadua que quedó a la vista',
        detalle:
          'Pícale con un destornillador. Si se hunde, está podrida y hay que reemplazar esa pieza (ver "reemplazar guadua"). Si está sana, sigue.',
        dibujo: 'guadua-patologias',
      },
      {
        titulo: 'Deja secar y protege la guadua',
        detalle:
          'Si estaba húmeda, ventila y espera a que seque antes de tapar. Aplica el inmunizante. Tapar guadua húmeda es garantizar que se pudra.',
        advertencia: 'Nunca repelles sobre guadua mojada.',
      },
      {
        titulo: 'Clava la malla nueva',
        detalle:
          'La malla se grapa a los pie derechos cada 15 cm, y monta 15 cm sobre la zona sana que quedó. Debe quedar tensa: si se pandea, el repello se raja.',
      },
      {
        titulo: 'Repella en dos capas',
        detalle:
          'Primera capa delgada, apretada contra la malla, sin alisar. Cuando pegue, la segunda hasta completar 2,5 cm y ahí sí se alisa.',
      },
      { titulo: 'Cura 5 días', detalle: 'Mojar en la mañana y en la tarde.' },
    ],
    jornales: (m) => Math.max(1, m.cantidad / 6),
  },
  {
    id: 'reemplazo_guadua',
    titulo: 'Reemplazar las piezas de guadua podridas o comidas',
    resumen:
      'Una guadua podrida no se repara: se cambia. Se hace pieza por pieza, apuntalando lo que esa pieza sostiene.',
    componente: 'muros',
    prioridad: 2,
    quienLoHace: 'oficial',
    dibujo: 'guadua-patologias',
    aplicaSi: (r) =>
      valorEs(r, 'bah_estructura', 'pudricion', 'insectos') ||
      valorEs(r, 'guadua_contacto_suelo', 'podrida') ||
      valorEs(r, 'bah_uniones', 'rajadas', 'sueltas'),
    medir: (r) => ({
      cantidad: Math.max(4, Math.round((numero(r, 'bah_medida_area_danada') || 15) * 0.6)),
      unidad: 'm',
    }),
    materiales: (m) => [
      { nombre: 'Guadua rolliza seca e inmunizada, Ø10 cm, tramos de 4 m', unidad: 'und', cantidad: Math.ceil((m.cantidad * 1.15) / 4 - 1e-9) },
      { nombre: 'Perno galvanizado Ø3/8" con tuerca y arandela', unidad: 'und', cantidad: Math.ceil(m.cantidad * 1.5) },
      { nombre: 'Mortero de relleno para los canutos', unidad: 'bulto 50 kg', cantidad: Math.max(1, Math.ceil(m.cantidad / 20)) },
      { nombre: 'Inmunizante (sales de boro)', unidad: 'kg', cantidad: redondear(m.cantidad * 0.15, 0.5) },
      { nombre: 'Zuncho metálico', unidad: 'm', cantidad: redondear(m.cantidad * 0.3, 1) },
    ],
    herramientas: ['Serrucho de diente fino', 'Taladro con broca larga', 'Llave fija', 'Formón', 'Puntales'],
    pasos: [
      {
        titulo: 'Apuntala lo que sostiene esa pieza',
        detalle: 'Antes de cortar cualquier guadua, sostén con puntal lo que está cargando.',
        advertencia: 'Nunca retires dos piezas contiguas al mismo tiempo.',
      },
      {
        titulo: 'Corta por el nudo',
        detalle:
          'La guadua se corta siempre a 3-5 cm después de un nudo. Si cortas por la mitad de un canuto, la pieza se raja al apretarla.',
        dibujo: 'guadua-uniones',
      },
      {
        titulo: 'Usa pernos, nunca clavos',
        detalle:
          'El clavo raja la guadua a lo largo de la fibra. Las uniones van con perno de 3/8" mínimo, con arandela grande a lado y lado. Perfora primero con broca, sin golpear.',
      },
      {
        titulo: 'Rellena el canuto de la unión',
        detalle:
          'El canuto donde va el perno se rellena con mortero para que no se aplaste al apretar. Se hace un huequito, se llena y se deja fraguar antes de apretar.',
      },
      {
        titulo: 'Inmuniza los cortes',
        detalle: 'Todo corte nuevo se pinta con inmunizante. Es la puerta de entrada de los insectos.',
      },
    ],
    jornales: (m) => Math.max(1, m.cantidad / 5),
  },
  {
    id: 'amarre_cubierta',
    titulo: 'Amarrar el techo a los muros',
    resumen:
      'En un sismo el techo se mueve distinto que los muros y se corre de su apoyo. Amarrarlo es barato, rápido, y evita el daño más común de todos.',
    componente: 'cubierta',
    prioridad: 2,
    quienLoHace: 'oficial',
    dibujo: 'apoyo-cubierta',
    aplicaSi: (r) =>
      valorEs(r, 'cub_apoyos', 'sin_amarre', 'corridas', 'fuera') ||
      valorEs(r, 'cub_estructura_estado', 'leve', 'partida'),
    medir: (r) => {
      const area = numero(r, 'medida_area') || 60
      return { cantidad: Math.max(8, Math.round((Math.sqrt(area) * 2) / 0.8)), unidad: 'apoyos' }
    },
    materiales: (m) => [
      { nombre: 'Platina metálica en L, 2 mm, galvanizada', unidad: 'und', cantidad: m.cantidad },
      { nombre: 'Chazo expansivo con tornillo ⅜"', unidad: 'und', cantidad: m.cantidad * 2 },
      { nombre: 'Tornillo tirafondo 3"', unidad: 'und', cantidad: m.cantidad * 2 },
      { nombre: 'Alambre galvanizado calibre 12', unidad: 'kg', cantidad: redondear(m.cantidad * 0.08, 0.5) },
      { nombre: 'Anticorrosivo', unidad: 'galón', cantidad: Math.ceil(m.cantidad / 60) },
    ],
    herramientas: ['Taladro percutor', 'Llave', 'Escalera', 'Arnés'],
    pasos: [
      {
        titulo: 'Revisa cuánto apoya cada viga',
        detalle:
          'Cada correa o viga del techo debe apoyar mínimo 10 cm sobre el muro. Si apoya menos, primero hay que devolverla a su sitio con gato o palanca, apuntalando.',
        dibujo: 'apoyo-cubierta',
      },
      {
        titulo: 'Pon una platina en L en cada apoyo',
        detalle:
          'Un ala de la platina se atornilla a la madera o guadua, la otra se ancla con chazo al muro o a la viga de amarre.',
      },
      {
        titulo: 'Si el muro no tiene viga de amarre, no ancles ahí',
        detalle:
          'Anclar el techo a un muro suelto solo cambia el problema de sitio. Primero la viga de amarre, después el anclaje.',
        advertencia: 'Este orden importa. No lo inviertas.',
      },
      {
        titulo: 'Amarra también en diagonal',
        detalle:
          'Pon un alambre o platina en diagonal en las esquinas del techo para que no se "abra" como una caja sin tapa.',
      },
    ],
    seguridad: ['Arnés amarrado a punto firme cuando trabajes en altura.', 'Nunca pises sobre teja.'],
    jornales: (m) => Math.max(1, m.cantidad * 0.15),
  },
  {
    id: 'reponer_tejas',
    titulo: 'Reponer y amarrar las tejas',
    resumen:
      'Las tejas de barro sueltas se corren con cualquier réplica y caen. Se reponen las que faltan y se amarran las de los bordes y el caballete.',
    componente: 'cubierta',
    prioridad: 2,
    quienLoHace: 'oficial',
    dibujo: 'tejas',
    aplicaSi: (r) => !valorEs(r, 'cub_tejas', 'bien') || valorEs(r, 'cub_humedad', 'puntual', 'varias', 'generalizada'),
    medir: (r) => ({
      cantidad:
        numero(r, 'cub_medida_tejas_faltantes') ||
        Math.round((numero(r, 'cub_medida_area') || numero(r, 'medida_area') || 60) * 0.15 * RENDIMIENTOS.tejasPorM2),
      unidad: 'tejas',
    }),
    materiales: (m) => [
      { nombre: 'Teja de barro', unidad: 'und', cantidad: piezas(m.cantidad), nota: 'Incluye 10% de rotura' },
      { nombre: 'Alambre galvanizado calibre 16', unidad: 'kg', cantidad: redondear(m.cantidad * 0.01, 0.5) },
      { nombre: 'Mortero para caballete', unidad: 'bulto 50 kg', cantidad: Math.max(1, Math.ceil(m.cantidad / 120)) },
      { nombre: 'Listón de amarre 4 × 4 cm', unidad: 'm', cantidad: redondear(m.cantidad / 12, 1) },
    ],
    herramientas: ['Escalera', 'Arnés', 'Alicate', 'Palustre', 'Tabla de reparto para caminar'],
    pasos: [
      {
        titulo: 'Nunca camines directo sobre las tejas',
        detalle:
          'Pon una tabla ancha apoyada sobre dos correas y camina sobre ella. Una teja de barro no aguanta el peso de una persona.',
        advertencia: 'Es la causa más común de accidentes graves en reparación de techos.',
      },
      { titulo: 'Empieza por abajo', detalle: 'Las tejas se colocan de abajo hacia arriba, cada hilada montando sobre la anterior.' },
      {
        titulo: 'Amarra la primera y la última hilada',
        detalle:
          'Las tejas del borde (alero), las del caballete y las de los limatones se amarran con alambre a la correa. Son las que se vuelan y las que caen sobre la gente.',
        dibujo: 'tejas',
      },
      {
        titulo: 'Pega el caballete con mortero, sin exagerar',
        detalle:
          'Solo un cordón de mortero. Un caballete cargado de mortero es peso muerto en la parte más alta de la casa, justo donde más sacude el sismo.',
      },
    ],
    seguridad: ['Arnés siempre.', 'No trabajar con lluvia ni con el techo mojado.', 'Nadie parado abajo.'],
    jornales: (m) => Math.max(0.5, m.cantidad / 150),
  },
  {
    id: 'recuperar_sobrecimiento',
    titulo: 'Levantar el muro del suelo (sobrecimiento)',
    resumen:
      'La guadua y la madera no pueden tocar la tierra. Se construye o se recupera un sobrecimiento de concreto de 30 cm mínimo para que la humedad no suba.',
    componente: 'cimentacion',
    prioridad: 2,
    quienLoHace: 'oficial',
    dibujo: 'sobrecimiento',
    aplicaSi: (r) => valorEs(r, 'guadua_contacto_suelo', 'bajo', 'suelo', 'podrida') || valorEs(r, 'tierra_erosion_base', 'humeda', 'erosionada'),
    medir: (r) => ({ cantidad: Math.max(6, Math.round(Math.sqrt(numero(r, 'medida_area') || 60) * 4)), unidad: 'm' }),
    materiales: (m) => {
      const vol = m.cantidad * 0.15 * 0.3 // 15 cm de ancho x 30 cm de alto
      return [
        { nombre: 'Cemento gris', unidad: 'bulto 50 kg', cantidad: redondear(vol * 7.5 * 1.1, 0.5) },
        { nombre: 'Arena de río', unidad: 'm³', cantidad: redondear(vol * 0.55 * 1.1, 0.25) },
        { nombre: 'Grava (triturado ¾")', unidad: 'm³', cantidad: redondear(vol * 0.85 * 1.1, 0.25) },
        { nombre: 'Varilla Ø3/8" tramos de 6 m', unidad: 'und', cantidad: Math.ceil((m.cantidad * 2) / 6) },
        { nombre: 'Manto o pintura impermeabilizante', unidad: 'm²', cantidad: redondear(m.cantidad * 0.6, 1) },
        { nombre: 'Tabla de formaleta', unidad: 'm', cantidad: redondear(m.cantidad * 2, 1) },
      ]
    },
    herramientas: ['Pala', 'Pica', 'Nivel de manguera', 'Carretilla', 'Palustre'],
    pasos: [
      { titulo: 'Apuntala el muro por tramos', detalle: 'Se trabaja en tramos de 1 m alternados, nunca todo el muro de una vez.', advertencia: 'Descalzar un muro completo lo tumba.' },
      { titulo: 'Excava y limpia', detalle: 'Retira la tierra húmeda y la madera podrida que esté en contacto.' },
      { titulo: 'Funde el sobrecimiento', detalle: 'Mínimo 30 cm sobre el nivel del piso terminado exterior, con varilla longitudinal.' },
      { titulo: 'Impermeabiliza la cara superior', detalle: 'Un manto o pintura asfáltica entre el concreto y la madera corta el ascenso de humedad.' },
      { titulo: 'Ancla la solera', detalle: 'Deja pernos embebidos cada 1 m para amarrar la solera inferior del muro.' },
      { titulo: 'Haz que el agua se vaya', detalle: 'Un andén o zanja en el perímetro con pendiente hacia afuera. Sin esto, todo lo demás se pierde.' },
    ],
    jornales: (m) => Math.max(2, m.cantidad * 0.5),
  },
  {
    id: 'recuperar_apoyos_entrepiso',
    titulo: 'Recuperar los apoyos del entrepiso',
    resumen: 'Las vigas del segundo piso que se corrieron se devuelven a su sitio y se amarran para que no vuelva a pasar.',
    componente: 'entrepiso',
    prioridad: 2,
    quienLoHace: 'profesional',
    aplicaSi: (r) => valorEs(r, 'entrepiso_apoyos', 'poco', 'mucho') || valorEs(r, 'entrepiso_estado', 'rebota', 'hundido'),
    medir: (r) => ({ cantidad: Math.max(4, Math.round((numero(r, 'medida_area') || 60) / 8)), unidad: 'apoyos' }),
    materiales: (m) => [
      { nombre: 'Platina metálica en L, 3 mm', unidad: 'und', cantidad: m.cantidad },
      { nombre: 'Chazo expansivo ⅜"', unidad: 'und', cantidad: m.cantidad * 3 },
      { nombre: 'Madera para ménsula de apoyo', unidad: 'm', cantidad: redondear(m.cantidad * 0.6, 1) },
      { nombre: 'Puntal provisional', unidad: 'und', cantidad: Math.ceil(m.cantidad / 2) },
    ],
    herramientas: ['Gato hidráulico', 'Taladro percutor', 'Nivel', 'Puntales'],
    pasos: [
      { titulo: 'Apuntala antes de tocar nada', detalle: 'El entrepiso se sostiene con puntales desde el piso de abajo.', advertencia: 'Nadie puede estar en el segundo piso mientras se trabaja.' },
      { titulo: 'Devuelve la viga a su apoyo', detalle: 'Con gato, muy despacio. Si no vuelve fácil, para: hay algo más pasando y lo tiene que ver el ingeniero.' },
      { titulo: 'Pon una ménsula debajo', detalle: 'Un pedazo de madera anclado al muro debajo de la viga, para que aunque se corra, tenga en qué apoyarse.' },
      { titulo: 'Amarra con platina', detalle: 'Platina en L que una la viga al muro.' },
    ],
    jornales: (m) => Math.max(2, m.cantidad * 0.5),
  },
  {
    id: 'asegurar_no_estructural',
    titulo: 'Asegurar tanques, muros divisorios y objetos que pueden caer',
    resumen:
      'En los sismos, mucha gente se hiere con cosas que no sostienen la casa: un tanque, un muro divisorio, un armario. Asegurarlos es barato y rápido.',
    componente: 'noEstructural',
    prioridad: 2,
    quienLoHace: 'voluntario',
    aplicaSi: (r) =>
      !valorEs(r, 'ne_elementos', 'ninguno') ||
      valorEs(r, 'ne_muros_divisorios', 'algunos', 'caidos') ||
      valorEs(r, 'cub_cielo_raso', 'suelto', 'caido'),
    medir: sinMedida,
    materiales: () => [
      { nombre: 'Platina metálica y chazos', unidad: 'juego', cantidad: 4 },
      { nombre: 'Cinta o fleje metálico', unidad: 'm', cantidad: 10 },
      { nombre: 'Ángulo metálico para amarre superior de muros', unidad: 'm', cantidad: 6 },
      { nombre: 'Tornillos y chazos', unidad: 'caja', cantidad: 1 },
    ],
    herramientas: ['Taladro', 'Destornillador', 'Nivel'],
    pasos: [
      {
        titulo: 'Amarra los muros que no llegan al techo',
        detalle:
          'Un muro divisorio que termina antes del techo se cae solo. Se ancla con ángulos metálicos a la estructura de arriba, dejando una junta de 1 cm rellena de material blando para que el muro no reciba la carga del techo.',
      },
      { titulo: 'Ancla el tanque', detalle: 'Fleje metálico rodeando el tanque, anclado a dos puntos firmes de la estructura, no al muro divisorio.' },
      { titulo: 'Baja lo que esté alto y pesado', detalle: 'Lo pesado va abajo. Los estantes altos se anclan al muro por detrás.' },
      { titulo: 'Retira el cielo raso suelto', detalle: 'Si está pandeado, mejor bajarlo que esperar a que caiga.' },
    ],
    jornales: () => 1,
  },
  {
    id: 'refuerzo_tapia',
    titulo: 'Reforzar los muros de tapia o adobe',
    resumen:
      'Los muros de tierra fallan volcándose hacia afuera. Se refuerzan con malla en las dos caras, amarrada de lado a lado del muro, y una viga de coronamiento en la parte alta.',
    componente: 'muros',
    prioridad: 2,
    quienLoHace: 'profesional',
    dibujo: 'tapia-fallas',
    aplicaSi: (r) => valorEs(r, 'material_muros', 'tapia_adobe'),
    medir: (r) => ({ cantidad: Math.max(10, Math.round((numero(r, 'medida_area') || 60) * 0.8)), unidad: 'm²' }),
    materiales: (m) => {
      const vol = m.cantidad * 2 * 0.025 // dos caras
      return [
        { nombre: 'Malla (electrosoldada fina o polimérica de refuerzo)', unidad: 'm²', cantidad: redondear(m.cantidad * 2 * 1.15, 1) },
        { nombre: 'Cemento gris', unidad: 'bulto 50 kg', cantidad: bultos(vol) },
        { nombre: 'Arena', unidad: 'm³', cantidad: arena(vol) },
        { nombre: 'Cal hidratada', unidad: 'kg', cantidad: redondear(m.cantidad * 2, 1) },
        { nombre: 'Conectores pasantes (alambre o varilla que atraviesa el muro)', unidad: 'und', cantidad: Math.ceil(m.cantidad * 4) },
      ]
    },
    herramientas: ['Taladro con broca larga', 'Palustre', 'Tijera para malla', 'Andamio'],
    pasos: [
      {
        titulo: 'Diseño obligatorio del profesional',
        detalle:
          'Un muro de tierra reforzado mal puede quedar peor que antes, porque el refuerzo rígido concentra el daño. Esta intervención no se improvisa nunca.',
        advertencia: 'No piques, no perfores y no cargues un muro de tapia sin diseño.',
      },
      { titulo: 'Los conectores atraviesan el muro', detalle: 'Lo que hace que funcione es que las dos mallas queden cosidas entre sí a través del muro, cada 50 cm.' },
      { titulo: 'Viga de coronamiento liviana', detalle: 'En la parte alta va un amarre continuo (madera o concreto liviano) que abraza todos los muros.' },
      { titulo: 'Protege la base y la cabeza del muro del agua', detalle: 'El agua es lo que mata la tapia. Alero generoso arriba y zócalo impermeable abajo.' },
    ],
    jornales: (m) => Math.max(4, m.cantidad / 3),
  },

  /* ---------------- Prioridad 3: mejoras --------------------------- */
  {
    id: 'diagonales_bahareque',
    titulo: 'Agregar diagonales a los muros de bahareque',
    resumen:
      'Las diagonales son las que le dan al muro de bahareque su resistencia al sismo. Si los muros no las tienen, agregarlas es sencillo y muy efectivo.',
    componente: 'muros',
    prioridad: 3,
    quienLoHace: 'oficial',
    dibujo: 'muro-bahareque',
    aplicaSi: (r) => valorEs(r, 'bah_diagonales', 'no', 'algunas'),
    medir: (r) => ({ cantidad: Math.max(4, Math.round((numero(r, 'medida_area') || 60) / 10)), unidad: 'diagonales' }),
    materiales: (m) => [
      { nombre: 'Guadua o listón de madera para diagonal (3 m)', unidad: 'und', cantidad: m.cantidad },
      { nombre: 'Perno galvanizado ⅜" con arandela', unidad: 'und', cantidad: m.cantidad * 4 },
      { nombre: 'Malla para repello', unidad: 'm²', cantidad: redondear(m.cantidad * 3, 1) },
      { nombre: 'Mortero de repello', unidad: 'bulto 50 kg', cantidad: Math.max(1, Math.ceil(m.cantidad / 3)) },
    ],
    herramientas: ['Serrucho', 'Taladro', 'Llave', 'Palustre'],
    pasos: [
      { titulo: 'Abre el repello en la línea de la diagonal', detalle: 'Solo una franja de 25 cm de ancho, en diagonal de esquina a esquina del paño.' },
      { titulo: 'Corta la diagonal a medida', detalle: 'Debe entrar apretada entre la solera de abajo y la de arriba, tocando ambas.' },
      { titulo: 'Pernea en los dos extremos', detalle: 'Dos pernos en cada extremo. La diagonal solo sirve si está bien pegada arriba y abajo.' },
      { titulo: 'Pon diagonales en las dos direcciones', detalle: 'En cada muro, una en un sentido y otra en el contrario (una X), o alternadas entre paños vecinos.' },
      { titulo: 'Cierra con malla y repello', detalle: 'Igual que en la reparación del paño.' },
    ],
    jornales: (m) => Math.max(1, m.cantidad * 0.4),
  },
  {
    id: 'inmunizar_guadua',
    titulo: 'Inmunizar y proteger la guadua',
    resumen:
      'La guadua bien seca, inmunizada y protegida del agua dura décadas. Sin eso, se la come el comején en pocos años. Es la mejora más barata de todas.',
    componente: 'muros',
    prioridad: 3,
    quienLoHace: 'voluntario',
    aplicaSi: (r) => valorEs(r, 'material_muros', 'bahareque_encementado', 'bahareque_tradicional') || valorEs(r, 'material_cubierta', 'guadua', 'guadua_madera'),
    medir: (r) => ({ cantidad: Math.max(20, Math.round((numero(r, 'medida_area') || 60) * 1.2)), unidad: 'm²' }),
    materiales: (m) => [
      { nombre: 'Sales de boro (bórax + ácido bórico)', unidad: 'kg', cantidad: redondear(m.cantidad * 0.08, 0.5) },
      { nombre: 'Pintura o barniz de protección', unidad: 'galón', cantidad: Math.ceil(m.cantidad / 35) },
      { nombre: 'Brocha', unidad: 'und', cantidad: 2 },
    ],
    herramientas: ['Brocha', 'Balde', 'Guantes', 'Tapabocas'],
    pasos: [
      { titulo: 'Solo sobre guadua seca', detalle: 'Si está húmeda, el producto no penetra y encima le sellas la humedad adentro.' },
      { titulo: 'Prepara la solución', detalle: 'Sigue las proporciones del envase. Mezcla en un balde plástico, nunca metálico.' },
      { titulo: 'Aplica dos manos', detalle: 'La segunda cuando la primera esté seca. Insiste en los cortes, los nudos y las uniones.' },
      { titulo: 'Nunca dejes que el agua se pose', detalle: 'Revisa que ningún canuto quede abierto hacia arriba: se llena de agua y se pudre desde adentro.' },
    ],
    seguridad: ['Guantes y tapabocas.', 'Mantener lejos de niños, animales y alimentos.'],
    jornales: (m) => Math.max(0.5, m.cantidad / 60),
  },
  {
    id: 'manejo_aguas',
    titulo: 'Manejo de aguas alrededor de la casa',
    resumen:
      'Muchísimos daños que parecen de sismo son en realidad de agua. Sacar el agua lejos de la casa es lo más rentable que se puede hacer.',
    componente: 'terreno',
    prioridad: 3,
    quienLoHace: 'voluntario',
    aplicaSi: (r) =>
      r['agua_socavacion'] === true ||
      valorEs(r, 'pendiente', 'fuerte', 'borde') ||
      valorEs(r, 'cub_humedad', 'varias', 'generalizada'),
    medir: (r) => ({ cantidad: Math.max(8, Math.round(Math.sqrt(numero(r, 'medida_area') || 60) * 4)), unidad: 'm' }),
    materiales: (m) => [
      { nombre: 'Canal de aguas lluvias', unidad: 'm', cantidad: redondear(m.cantidad * 0.6, 1) },
      { nombre: 'Bajante Ø3"', unidad: 'und', cantidad: Math.max(2, Math.ceil(m.cantidad / 12)) },
      { nombre: 'Tubería sanitaria Ø4" para desagüe', unidad: 'm', cantidad: redondear(m.cantidad * 0.5, 1) },
      { nombre: 'Cemento para andén perimetral', unidad: 'bulto 50 kg', cantidad: Math.ceil(m.cantidad * 0.5) },
      { nombre: 'Arena', unidad: 'm³', cantidad: redondear(m.cantidad * 0.05, 0.25) },
    ],
    herramientas: ['Pala', 'Pica', 'Nivel de manguera', 'Carretilla'],
    pasos: [
      { titulo: 'Pon canal y bajante al techo', detalle: 'Sin canal, toda el agua del techo cae al pie del muro y descalza la casa.' },
      { titulo: 'Lleva el agua lejos', detalle: 'La bajante debe descargar a mínimo 3 m de la casa, o conectarse a un desagüe. Nunca al pie del muro.' },
      { titulo: 'Haz un andén perimetral con pendiente', detalle: 'Una franja de 60 cm de concreto alrededor de la casa, inclinada hacia afuera 2 cm por metro.' },
      { titulo: 'Zanja de coronación si hay ladera arriba', detalle: 'Una zanja arriba del talud que recoja el agua antes de que llegue a la casa.' },
    ],
    jornales: (m) => Math.max(2, m.cantidad * 0.4),
  },
  {
    id: 'estudio_terreno',
    titulo: 'Estudio del terreno antes de reparar',
    resumen:
      'Si el terreno está fallando, reparar la casa es botar la plata: se vuelve a rajar. Primero hay que saber qué está pasando abajo.',
    componente: 'terreno',
    prioridad: 1,
    quienLoHace: 'profesional',
    aplicaSi: (r) =>
      valorEs(r, 'grietas_suelo', 'finas', 'anchas') ||
      valorEs(r, 'deslizamiento', 'cerca', 'toca') ||
      valorEs(r, 'muro_contencion', 'grietas', 'volcado') ||
      valorEs(r, 'asentamiento', 'claro', 'fuerte'),
    medir: sinMedida,
    materiales: () => [
      { nombre: 'Estudio geotécnico', unidad: 'global', cantidad: 1, nota: 'Solicitar a la alcaldía o al consejo de gestión del riesgo' },
    ],
    herramientas: [],
    pasos: [
      { titulo: 'Reporta al municipio', detalle: 'El estudio del terreno normalmente lo asume la administración municipal en zonas declaradas en emergencia. Radica la solicitud con el reporte de esta app adjunto.' },
      { titulo: 'Instala testigos mientras tanto', detalle: 'Pega un pedacito de vidrio o de yeso atravesando la grieta del suelo, con la fecha. Si se parte, la grieta sigue moviéndose. Revísalo cada semana y toma foto.' },
      { titulo: 'No inviertas en reparaciones definitivas todavía', detalle: 'Mientras no se sepa si el terreno es apto, solo se hacen obras de emergencia y de protección contra el agua.' },
      { titulo: 'Considera la reubicación', detalle: 'Si el terreno no es apto, la solución no es reforzar la casa. Es una conversación difícil, pero hay que tenerla temprano.' },
    ],
    jornales: () => 0,
  },
]

export function buscarReparacion(id: string): Reparacion | undefined {
  return CATALOGO.find((x) => x.id === id)
}

/** Reparaciones que el sistema sugiere a partir del diagnostico. */
export function sugerirReparaciones(respuestas: Respuestas, diagnostico: Diagnostico): Reparacion[] {
  return CATALOGO.filter((rep) => {
    try {
      return rep.aplicaSi(respuestas, diagnostico)
    } catch {
      return false
    }
  }).sort((a, b) => a.prioridad - b.prioridad)
}
