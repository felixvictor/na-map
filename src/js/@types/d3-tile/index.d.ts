declare module "d3-tile" {
    import { ZoomTransform } from "d3-zoom"

    export type Tile = [number, number, number]

    export interface Tiles extends Array<Tile> {
        [index: number]: Tile
        readonly translate: [number, number]
        readonly scale: number
    }

    export interface TileFn extends Function {
        tile(scale?: number, translate?: ZoomTransform): Tiles

        size(): [number, number]
        size(size: [number, number]): this

        extent(): [[number, number], [number, number]]
        extent(extent: [[number, number], [number, number]]): this

        scale(scale: number): this
        scale(scale?: () => number): number

        translate(translate?: () => ZoomTransform): [number, number]
        translate(translate: [number, number]): this

        zoomDelta(): number
        zoomDelta(zoomDelta: number): this

        tileSize(): number
        tileSize(tileSize: number): this

        clamp(): boolean
        clamp(clamp: boolean): this

        clampX(): boolean
        clampX(clamp: boolean): this

        clampY(): boolean
        clampY(clamp: boolean): this
    }

    export function tile(): TileFn
}
