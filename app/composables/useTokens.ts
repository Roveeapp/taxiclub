/**
 * Lee un color del tema desde JavaScript.
 *
 * Hay dos sitios donde una `var(--token)` de CSS no sirve, porque quien recibe
 * el color es una librería que espera una cadena: el objeto `appearance` de
 * Stripe Elements y el color de los círculos de Leaflet en el mapa de zonas.
 * Los cinco últimos hexadecimales escritos a mano del proyecto estaban ahí, y
 * uno de ellos era el oro de marca — que es exactamente el valor que no
 * conviene tener repetido, porque cuando la marca cambie nadie va a buscarlo
 * dentro de la configuración de Stripe.
 *
 * Lee el valor calculado de `:root`, así que sigue al tema sin duplicarlo. El
 * valor de reserva cubre el renderizado en servidor y el caso de que el token
 * no exista: sin él, Stripe recibiría una cadena vacía y pintaría sus colores
 * por defecto, que no son los de la marca.
 */
export function colorDeToken(token: `--${string}`, reserva: string): string {
  if (import.meta.server || typeof document === 'undefined') return reserva
  const valor = getComputedStyle(document.documentElement).getPropertyValue(token).trim()
  if (!valor) return reserva
  // La paleta se guarda en canales RGB —«18 18 28»— porque es el único formato
  // con el que Tailwind puede aplicar opacidad. Stripe y Leaflet esperan un
  // color CSS, así que hay que envolverlo. Sin esto recibirían la cadena de
  // canales tal cual, que no es un color válido, y pintarían sus valores por
  // defecto sin dar ningún error.
  return /^\d[\d\s]*$/.test(valor) ? `rgb(${valor})` : valor
}
