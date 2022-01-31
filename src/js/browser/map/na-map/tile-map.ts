import { select as d3Select, Selection } from "d3-selection"
import { Tile, tile as d3Tile, TileFn, Tiles } from "d3-tile"
import { zoomIdentity as d3ZoomIdentity, ZoomTransform } from "d3-zoom"
import { maxTileScale, tileSize } from "common/common-var"

export default class TileMap {
    #gMap = {} as Selection<SVGGElement, Event, HTMLElement, unknown>
    #mapTileTransform = {} as ZoomTransform
    #tileG = {} as Selection<SVGImageElement, Tile, SVGGElement, unknown>
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

    #updateMap(data: Tile[]): void {
        this.#gMap.attr("transform", this.#mapTileTransform.toString())
        this.#tileG = this.#tileG
            .data(data, ([x, y, z]) => `${z}/${y}/${x}`)
            .join("image")
            .attr("xlink:href", ([x, y, z]) => `images/map/${z}/${y}/${x}.webp`)
            .attr("x", ([x]) => x)
            .attr("y", ([, y]) => y)
            .attr("width", 1)
            .attr("height", 1)
    }

    drawMap(transform: ZoomTransform): void {
        // Zoom in at scale larger than maxTileZoom
        const zoomDelta = transform.k <= maxTileScale ? 0 : Math.log2(maxTileScale) - Math.log2(transform.k)
        this.#tiler.zoomDelta(zoomDelta)

        const tiles = this.#tiler(transform) as Tiles
        this.#mapTileTransform = d3ZoomIdentity.scale(tiles.scale).translate(tiles.translate[0], tiles.translate[1])

        this.#updateMap(tiles)
    }
}
