import * as L from 'leaflet'
import { READING_STATUS, type ReadingStatus } from './reading-status'

export { READING_STATUS, type ReadingStatus }

// Shared Leaflet pieces for maps that draw readings on the water.

export const OSM_TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
export const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

/** A pin that ripples outward from the exact collection point. */
export function rippleIcon(status: ReadingStatus, options: { size?: number; selected?: boolean } = {}): L.DivIcon {
  const size = options.size ?? 44
  const color = READING_STATUS[status].color
  return L.divIcon({
    className: 'water-reading-pin',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<span class="water-reading-ripple${options.selected ? ' is-selected' : ''}" style="--pin:${color}"><i></i><i></i><b></b></span>`,
  })
}
