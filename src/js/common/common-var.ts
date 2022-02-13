/*!
 * This file is part of na-map.
 *
 * @file      Common data and functions for node.
 * @module    src/node/common-var
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2022
 * @license   http://www.gnu.org/licenses/gpl.html
 */

export const GA_TRACKING_ID = "UA-109520372-1"
export const apiBaseFiles = ["ItemTemplates", "Ports", "Shops"]
export const serverTwitterNames = new Set(["eu1"])

export const serverMaintenanceHour = 10
export const portBattleCooldown = 48 // in hours
export const flagValidity = 7 // in days

export const mapSize = 8192
export const distanceMapSize = 8192
export const minMapScale = 1
export const maxMapScale = 256

export const maxTileZoom = 5
export const maxZoom = 8
export const tileSize = 256
export const minScale = tileSize
export const maxScale = minScale * Math.pow(2, maxZoom)
export const maxTileScale = minScale * Math.pow(2, maxTileZoom)
export const initScale = minScale << 3
export const labelScaleThreshold = minScale << 4
export const zoomAndPanScale = labelScaleThreshold
export const pbZoneScaleThreshold = minScale << 6
