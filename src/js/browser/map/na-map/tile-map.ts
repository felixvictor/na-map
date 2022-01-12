import { select as d3Select, Selection } from "d3-selection"
import { zoomIdentity as d3ZoomIdentity, ZoomTransform } from "d3-zoom"
import { maxTileZoom, tileSize } from "common/common-var"
import { Extent } from "common/common-math"
import { MinMaxCoord } from "common/interface"

type Tile = [number, number, number]

interface Tiles {
    tiles: Tile[]
    translate: [number, number]
    scale: number
}

export default class TileMap {
    #x0 = 0
    #x1 = 0
    #y0 = 0
    #y1 = 0
    #coord: MinMaxCoord
    #gMap = {} as Selection<SVGGElement, Event, HTMLElement, unknown>
    #viewport = {} as Extent
    #currentTranslate = [0, 0]

    constructor(extent: Extent, coord: MinMaxCoord) {
        this.#x0 = extent[0][0]
        this.#x1 = extent[1][0]
        this.#y0 = extent[0][1]
        this.#y1 = extent[1][1]
        this.#coord = coord

        this.#setup()
    }

    get viewport(): Extent {
        return this.#viewport
    }

    static getMapScale(scale: number): number {
        return 2 ** (Math.log2(scale) - maxTileZoom)
    }

    #setup(): void {
        const svg = d3Select<SVGSVGElement, Event>("#na-map svg")
        this.#gMap = svg.insert("g", "#map").attr("class", "map-tiles")
    }

    #updateMap(tiles: Tiles): void {
        const {
            translate: [tx, ty],
            scale: k,
            tiles: data,
        } = tiles

        this.#gMap
            .attr("transform", `translate(${tx * k},${ty * k}) scale(${k})`)
            .selectAll<HTMLImageElement, Tile>("image")
            // @ts-expect-error
            .data<Tile>(data, (d: Tile) => d)
            .join((enter) =>
                enter
                    .append("image")
                    .attr("xlink:href", ([x, y, z]) => `images/map/${z}/${y}/${x}.webp`)
                    .attr("x", ([x]) => x)
                    .attr("y", ([, y]) => y)
                    .attr("width", 1)
                    .attr("height", 1)
            )
    }

    drawMap(transform: ZoomTransform): void {
        // Zoom in at scale larger than maxTileZoom
        const zoomDelta = Math.log2(transform.k) <= maxTileZoom ? 0 : maxTileZoom - Math.log2(transform.k)
        const scale = tileSize * transform.k
        const tiles = {} as Tiles
        tiles.tiles = []

        // Copied from d3-tile
        const z = Math.log2(scale / tileSize)
        const z0 = Math.round(Math.max(z + zoomDelta, 0))
        const k = 2 ** (z - z0) * tileSize
        const x = transform.x - scale / 2
        const y = transform.y - scale / 2
        const xMin = Math.max(0, Math.floor((this.#x0 - x) / k))
        const xMax = Math.min(Number(1 << z0), Math.ceil((this.#x1 - x) / k))
        const yMin = Math.max(0, Math.floor((this.#y0 - y) / k))
        const yMax = Math.min(Number(1 << z0), Math.ceil((this.#y1 - y) / k))
        for (let y = yMin; y < yMax; ++y) {
            for (let x = xMin; x < xMax; ++x) {
                tiles.tiles.push([x, y, z0])
            }
        }

        tiles.translate = [x / k, y / k]
        tiles.scale = k

        if (tiles.tiles.length > 0) {
            const tileZoomLevel = z0 + Math.abs(zoomDelta)
            const tilesPerZoomLevel = 2 ** tileZoomLevel
            const tileCoverage = this.#coord.max / tilesPerZoomLevel
            const scale = tileCoverage * 2 ** Math.abs(zoomDelta)
            const vx0 = xMin * scale
            const vx1 = xMax * scale
            const vy0 = yMin * scale
            const vy1 = yMax * scale
            this.#viewport = [
                [vx0, vy0],
                [vx1, vy1],
            ]
            this.#currentTranslate = [tiles.translate[0] * tiles.scale, tiles.translate[1] * tiles.scale]

            this.#updateMap(tiles)
        }
    }

    getMapTransform(transform: ZoomTransform): ZoomTransform {
        const scale = TileMap.getMapScale(transform.k)
        return d3ZoomIdentity
            .scale(scale)
            .translate(this.#currentTranslate[0] / scale, this.#currentTranslate[1] / scale)
    }
}
