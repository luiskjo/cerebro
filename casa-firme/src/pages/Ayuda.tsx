import { useState } from 'react'
import { Dibujo } from '../components/Dibujo'
import { DIBUJOS } from '../components/diagramas/catalogo'

const GLOSARIO: [string, string][] = [
  ['Bahareque', 'Muro liviano hecho con un esqueleto de guadua o madera, relleno o cubierto con esterilla, y revocado. El "encementado" lleva malla y repello de mortero de cemento.'],
  ['Guadua', 'El bambú de la región. Es el material estructural más noble que tenemos: liviano, resistente y flexible. Su enemigo es el agua y el comején, no el sismo.'],
  ['Esterilla', 'Guadua abierta y aplanada, que se usa como base para el repello del muro.'],
  ['Solera', 'El madero o guadua horizontal que corre arriba y abajo del muro y amarra todos los parales.'],
  ['Pie derecho', 'Cada uno de los parales verticales del muro de bahareque.'],
  ['Riostra o diagonal', 'Pieza puesta en diagonal dentro del muro. Es la que le da al muro la resistencia contra el sismo.'],
  ['Sobrecimiento', 'El pedazo de muro de concreto entre el cimiento y el muro. Levanta la madera del suelo para que no se pudra.'],
  ['Mampostería confinada', 'Muro de ladrillo o bloque rodeado por columnas y vigas de concreto fundidas después del muro. Es el sistema que exige la norma para casas nuevas.'],
  ['Viga de amarre', 'La viga de concreto que corre por encima de todos los muros y los amarra entre sí. Sin ella cada muro trabaja solo.'],
  ['Columna de confinamiento', 'Columna de concreto en las esquinas y encuentros de muros, que "abraza" el muro de ladrillo.'],
  ['Culata', 'El muro triangular que queda bajo las aguas del techo, en los extremos de la casa. Es lo que más se cae en un sismo.'],
  ['Desplome', 'Cuánto se inclinó un muro respecto a la vertical. Se mide con plomada.'],
  ['Tapia pisada', 'Muro grueso de tierra apisonada dentro de un molde. Pesado y frágil.'],
  ['Habitabilidad', 'La decisión de si la casa se puede usar o no: verde (habitable), amarillo (uso restringido) o rojo (no habitable).'],
  ['Jornal', 'Una persona trabajando un día.'],
]

const REGLAS_SEGURIDAD = [
  'Nunca entres solo a una casa dañada. Siempre de a dos, y alguien afuera sabiendo que estás adentro.',
  'Casco, botas y guantes. Sin eso no se entra.',
  'Primero mira la casa completa desde afuera, dándole la vuelta. Después decides si entras.',
  'Si hay olor a gas, cables caídos, o la casa está inclinada: no entras. Punto.',
  'No te subas a los techos. Nunca pises sobre teja de barro.',
  'No pases por debajo de aleros, culatas ni muros agrietados.',
  'Si hay una réplica mientras estás adentro, sal de inmediato por la ruta que ya tenías vista.',
  'Si algo se ve mal y no sabes qué es, no lo toques: tómale foto y pregunta.',
  'Tu trabajo es evaluar, no reparar. No piques, no empujes, no descargues muros.',
  'Nunca le digas a una familia que su casa "está bien" o "se cae". Eso lo decide el profesional. Tú levantas la información.',
]

export function Ayuda() {
  const [seccion, setSeccion] = useState<'seguridad' | 'dibujos' | 'glosario' | 'como'>('seguridad')

  return (
    <div className="pila">
      <h1>Ayuda para el voluntario</h1>

      <div className="filtros">
        {(
          [
            ['seguridad', 'Seguridad'],
            ['como', 'Cómo funciona'],
            ['dibujos', 'Guía visual'],
            ['glosario', 'Glosario'],
          ] as const
        ).map(([id, texto]) => (
          <button key={id} type="button" className={`chip ${seccion === id ? 'activo' : ''}`} onClick={() => setSeccion(id)}>
            {texto}
          </button>
        ))}
      </div>

      {seccion === 'seguridad' && (
        <section className="tarjeta pila">
          <h2>Diez reglas que no se rompen</h2>
          <ol className="lista-numerada">
            {REGLAS_SEGURIDAD.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ol>
          <p className="aviso aviso-peligro">
            Un voluntario herido convierte una emergencia en dos. La casa puede esperar; tú no eres reemplazable.
          </p>
        </section>
      )}

      {seccion === 'como' && (
        <section className="tarjeta pila">
          <h2>Cómo funciona esto</h2>
          <ol className="lista-numerada">
            <li>
              <strong>Tú evalúas en campo.</strong> Recorres la casa con la lista de chequeo. Cada pregunta trae un
              dibujo de qué mirar y cómo medirlo. Todo funciona sin señal.
            </li>
            <li>
              <strong>La app calcula un semáforo preliminar.</strong> Verde, amarillo o rojo, según lo que marcaste.
              Es automático y provisional: sirve para priorizar, no para decidir.
            </li>
            <li>
              <strong>Un ingeniero o arquitecto revisa el reporte.</strong> Desde donde esté. Confirma o cambia el
              semáforo, elige las reparaciones y firma.
            </li>
            <li>
              <strong>La app arma el plan de reparación.</strong> Paso a paso, con dibujos, con la lista de
              materiales y las cantidades ya calculadas a partir de tus medidas.
            </li>
            <li>
              <strong>Se ejecuta la obra.</strong> En el orden del plan: primero seguridad, después reparación,
              después mejoras.
            </li>
          </ol>
          <h3>Sobre las medidas</h3>
          <p>
            No necesitas ser exacto. Un paso de adulto son unos 70 cm, un ladrillo unos 24 cm, y un adulto con el
            brazo levantado llega a 2,20 m. Aproximado está bien: sirve para comprar material, no para calcular
            una estructura.
          </p>
          <h3>Sobre las fotos</h3>
          <p>
            Son lo más importante que dejas. El profesional que revisa no va a estar allá. Foto de frente, con luz,
            y siempre con algo al lado que dé escala.
          </p>
        </section>
      )}

      {seccion === 'dibujos' && (
        <section className="pila">
          <p className="tenue">
            Todos los dibujos de la app en un solo lugar. Toca cualquiera para verlo grande.
          </p>
          {Object.keys(DIBUJOS).map((id) => (
            <div key={id} className="tarjeta">
              <Dibujo id={id} />
            </div>
          ))}
        </section>
      )}

      {seccion === 'glosario' && (
        <section className="tarjeta pila">
          <h2>Glosario</h2>
          <dl className="glosario">
            {GLOSARIO.map(([termino, definicion]) => (
              <div key={termino}>
                <dt>{termino}</dt>
                <dd>{definicion}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </div>
  )
}
