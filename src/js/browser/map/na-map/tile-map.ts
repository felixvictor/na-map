import { select as d3Select, Selection } from "d3-selection"
import { tile as d3Tile, TileFn, Tiles } from "d3-tile"
import { zoomIdentity as d3ZoomIdentity, ZoomTransform } from "d3-zoom"

import { maxTileScale, tileSize } from "common/common-var"

import { Point } from "common/common-math"

type TileKey = string

export default class TileMap {
    #currentScale = 0
    #currentTiles = new Map<TileKey, Point>()
    #gMap = {} as Selection<SVGGElement, Event, HTMLElement, unknown>
    #mapTileTransform = {} as ZoomTransform
    #tileG = {} as Selection<SVGImageElement, [TileKey, Point], SVGGElement, unknown>
    #tiler: TileFn

    constructor(width: number, height: number) {
        this.#tiler = d3Tile()
            .extent([
                [0, 0],
                [width, height],
            ])
            .tileSize(tileSize)
    }

    get mapTileTransform(): ZoomTransform {
        return this.#mapTileTransform
    }

    setupSvg(): void {
        const svg = d3Select<SVGSVGElement, Event>("#na-map svg")
        this.#gMap = svg.insert("g", "#map").attr("class", "map-tiles")
        this.#tileG = this.#gMap.selectAll("image")
    }

    #updateMap(data: Map<TileKey, Point>): void {
        this.#tileG = this.#tileG
            .data([...data].sort(), ([key]) => key)
            .join((enter) =>
                enter
                    .append("image")
                    .attr("xlink:href", ([key]) => `images/map/${key}.webp`)
                    .attr("x", ([, [x]]) => x)
                    .attr("y", ([, [, y]]) => y)
                    .attr("width", 1)
                    .attr("height", 1)
            )
    }

    drawMap(transform: ZoomTransform): void {
        // Zoom in at scale larger than maxTileZoom
        const zoomDelta = transform.k <= maxTileScale ? 0 : Math.log2(maxTileScale) - Math.log2(transform.k)

        this.#tiler.zoomDelta(zoomDelta)
        const tiles = this.#tiler(transform) as Tiles

        this.#mapTileTransform = d3ZoomIdentity.scale(tiles.scale).translate(tiles.translate[0], tiles.translate[1])
        this.#gMap.attr("transform", this.#mapTileTransform.toString())

        const map = tiles.map(([x, y, z]): [TileKey, Point] => [`${z}/${y}/${x}`, [x, y]])
        if (transform.k !== this.#currentScale) {
            this.#currentScale = transform.k
            this.#tileG.selectAll("image").remove()
            this.#currentTiles = new Map(map)
        } else {
            // Join all old and new tiles
            const join = new Map([...map, ...this.#currentTiles])
            this.#currentTiles = join
        }

        this.#updateMap(this.#currentTiles)
    }
}
