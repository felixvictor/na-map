/*!
 * This file is part of na-map.
 *
 * @file      Map init main file.
 * @module    map-init/index
 * @author    iB aka Felix Victor
 * @copyright 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { Bound, MinMaxCoord, SVGGDatum, SVGSVGDatum } from "../../common/interface"
import * as d3Zoom from "d3-zoom"
import * as d3Selection from "d3-selection"
import { range as d3Range } from "d3-array"
import { defaultFontSize, nearestPow2, roundToThousands } from "../../common/common-math"
import { mapSize } from "../../common/common-var"
import DisplayPorts from "./display-ports"

interface Tile {
    z: number
    row: number
    col: number
    id: string
}

/**
 * Init map
 */
class BaseMap {
    _currentTranslate!: d3Zoom.ZoomTransform
    _gMap!: d3Selection.Selection<SVGGElement, SVGGDatum, HTMLElement, unknown>
    _mainG!: d3Selection.Selection<SVGGElement, SVGGDatum, HTMLElement, unknown>
    _showGrid!: string
    _svg!: d3Selection.Selection<SVGSVGElement, SVGSVGDatum, HTMLElement, unknown>
    _zoom!: d3Zoom.ZoomBehavior<SVGSVGElement, SVGSVGDatum>
    _zoomLevel!: string
    gridOverlay: HTMLElement
    #currentScale = 0
    #coord: MinMaxCoord
    #height = 0
    #minScale = 0
    rem: number
    #serverName: string
    #width = 0
    xGridBackgroundHeight: number
    yGridBackgroundWidth: number
    #ports!: DisplayPorts
    #wheelDelta = 0.5
    #tileSize = 256
    #maxScale = 2 ** 3 // Power of 2

    /**
     * @param serverName - Naval action server name
     */
    constructor(serverName: string) {
        /**
         * Naval action server name
         */
        this.#serverName = serverName

        /**
         * Font size in px
         */
        this.rem = defaultFontSize

        /**
         * Left padding for brand icon
         */
        this.xGridBackgroundHeight = Math.floor(3 * this.rem)

        /**
         * Left padding for brand icon
         */
        this.yGridBackgroundWidth = Math.floor(4 * this.rem)

        /**
         * Outer bounds (world coordinates)
         */
        this.#coord = {
            min: 0, // Minimum world coordinate
            max: mapSize, // Maximum world coordinate
        }

        this.gridOverlay = document.querySelectorAll(".overlay")[0] as HTMLElement

        this._setHeightWidth()
        this._setupScale()
        this._setupSvg()
        this._setSvgSize()
    }

    _getZoomTransform(): d3Zoom.ZoomTransform {
        const currentTranslate = {
            x: Math.floor(d3Selection.event.transform.x),
            y: Math.floor(d3Selection.event.transform.y),
        } as d3Zoom.ZoomTransform

        /**
         * Current transform
         */
        return d3Zoom.zoomIdentity
            .translate(currentTranslate.x, currentTranslate.y)
            .scale(roundToThousands(d3Selection.event.transform.k))
    }

    async init(): Promise<void> {
        await this._setupData()
        this.initialZoomAndPan()
    }

    async _setupData(): Promise<void> {
        this.#ports = new DisplayPorts(this.#serverName, this.#minScale, this.#coord)
        await this.#ports.init()
    }

    _setupScale(): void {
        this.#minScale = nearestPow2(Math.min(this.#width / this.#coord.max, this.#height / this.#coord.max))

        /**
         * Current map scale
         */
        this.#currentScale = this.#minScale
    }

    _setupSvg(): void {
        this._zoom = d3Zoom
            .zoom<SVGSVGElement, SVGSVGDatum>()
            .wheelDelta(() => -this.#wheelDelta * Math.sign(d3Selection.event.deltaY))
            .translateExtent([
                [
                    this.#coord.min - this.yGridBackgroundWidth * this.#minScale,
                    this.#coord.min - this.xGridBackgroundHeight * this.#minScale,
                ],
                [this.#coord.max, this.#coord.max],
            ])
            .scaleExtent([this.#minScale, this.#maxScale])
            .on("zoom", () => this._naZoomed())

        this._svg = d3Selection
            .select<SVGSVGElement, SVGSVGDatum>("#na-map")
            .append<SVGSVGElement>("svg")
            .attr("id", "na-svg")
            .call(this._zoom)

        this._svg.append<SVGDefsElement>("defs")
        this._gMap = this._svg.append("g").attr("class", "map-tiles")
        this._mainG = this._svg.append("g").attr("id", "map")
    }

    /**
     * Zoom svg groups
     */
    _naZoomed(): void {
        const zoomTransform = this._getZoomTransform()
        /**
         * Top left coordinates of current viewport
         */
        const lowerBound = this._getLowerBound(zoomTransform)

        /**
         * Bottom right coordinates of current viewport
         */
        const upperBound = this._getUpperBound(zoomTransform)

        this.#ports.setBounds(lowerBound, upperBound)
        // this._pbZone.setBounds(lowerBound, upperBound)
        // this.showTrades.setBounds(lowerBound, upperBound)

        this._displayMap(zoomTransform)
        // this._grid.transform()
        // this.showTrades.transform(zoomTransform)
        this._mainG.attr("transform", zoomTransform.toString())

        this._setZoomLevelAndData()
    }

    _setZoomLevelAndData(): void {
        if (d3Selection.event.transform.k !== this.#currentScale) {
            this.#currentScale = d3Selection.event.transform.k
        }

        this.#ports.update(this.#currentScale)
    }

    /**
     * Top left coordinates of current viewport
     */
    _getLowerBound(zoomTransform: d3Zoom.ZoomTransform): Bound {
        return zoomTransform.invert([this.#coord.min, this.#coord.min])
    }

    /**
     * Bottom right coordinates of current viewport
     */
    _getUpperBound(zoomTransform: d3Zoom.ZoomTransform): Bound {
        return zoomTransform.invert([this.#width, this.#height])
    }

    initialZoomAndPan(): void {
        this._svg.call(this._zoom.scaleTo, this.#minScale)
    }

    zoomAndPan(x: number, y: number, scale: number): void {
        const transform = d3Zoom.zoomIdentity
            .scale(scale)
            .translate(Math.round(-x + this.#width / 2 / scale), Math.round(-y + this.#height / 2 / scale))

        this._svg.call(this._zoom.transform, transform)
    }

    _displayMap(transform: d3Zoom.ZoomTransform): void {
        // Based on d3-tile v0.0.3
        // https://github.com/d3/d3-tile/blob/0f8cc9f52564d4439845f651c5fab2fcc2fdef9e/src/tile.js
        const { x: tx, y: ty, k: tk } = transform
        const log2tileSize = Math.log2(this.#tileSize)
        const maxTileZoom = Math.log2(this.#coord.max) - log2tileSize
        const maxCoordScaled = this.#coord.max * tk
        const x0 = 0
        const y0 = 0
        const x1 = this.#width
        const y1 = this.#height
        const width = Math.floor(maxCoordScaled < x1 ? x1 - 2 * tx : maxCoordScaled)
        const height = Math.floor(maxCoordScaled < y1 ? y1 - 2 * ty : maxCoordScaled)
        const scale = Math.log2(tk)

        const tileZoom = Math.min(maxTileZoom, Math.ceil(Math.log2(Math.max(width, height))) - log2tileSize)
        const p = Math.round((tileZoom - scale - maxTileZoom) * 10) / 10
        const k = this.#wheelDelta ** p
        const tileSizeScaled = this.#tileSize * k

        const // Crop right side
            dx = maxCoordScaled < x1 ? tx : 0
        // Crop bottom
        const dy = maxCoordScaled < y1 ? ty : 0
        const cols = d3Range(
            Math.max(0, Math.floor((x0 - tx) / tileSizeScaled)),
            Math.max(0, Math.min(Math.ceil((x1 - tx - dx) / tileSizeScaled), 2 ** tileZoom))
        )
        const rows = d3Range(
            Math.max(0, Math.floor((y0 - ty) / tileSizeScaled)),
            Math.max(0, Math.min(Math.ceil((y1 - ty - dy) / tileSizeScaled), 2 ** tileZoom))
        )
        const tiles = []

        for (const row of rows) {
            for (const col of cols) {
                tiles.push({
                    z: tileZoom,
                    row,
                    col,
                    id: `${tileZoom.toString()}-${row.toString()}-${col.toString()}`,
                } as Tile)
            }
        }

        const transformNew = d3Zoom.zoomIdentity.translate(tx, ty).scale(roundToThousands(k))

        this._updateMap(tiles, transformNew)
    }

    _updateMap(tiles: Tile[], transform: d3Zoom.ZoomTransform): void {
        this._gMap
            .attr("transform", transform.toString())
            .selectAll<HTMLImageElement, Tile>("image")
            .data(tiles, (d) => d.id)
            .join((enter) =>
                enter
                    .append("image")
                    .attr("xlink:href", (d) => `images/map/${d.z}/${d.row}/${d.col}.webp`)
                    .attr("x", (d) => d.col * this.#tileSize)
                    .attr("y", (d) => d.row * this.#tileSize)
                    .attr("width", this.#tileSize + 1)
                    .attr("height", this.#tileSize + 1)
            )
    }

    getDimensions(): DOMRect {
        const selector = document.querySelectorAll(".overlay")[0]

        return selector.getBoundingClientRect()
    }

    _getWidth(): number {
        const { width } = this.getDimensions()

        return Math.floor(width)
    }

    _getHeight(): number {
        const { top } = this.getDimensions()
        const fullHeight = document.documentElement.clientHeight - this.rem

        return Math.floor(fullHeight - top)
    }

    _setHeightWidth(): void {
        /**
         * Width of map svg (screen coordinates)
         */
        this.#width = this._getWidth()

        /**
         * Height of map svg (screen coordinates)
         */
        this.#height = this._getHeight()
    }

    _setSvgSize(): void {
        this._svg.attr("width", this.#width).attr("height", this.#height)
    }
}

export { BaseMap }
