declare module "d3-weighted-voronoi" {
    import { ClippingPolygon } from "d3-voronoi-treemap"
    type Point = import("common/common-math").Point
    type ConflictList = undefined

    interface Vertex {
        x: number
        y: number
        weight: number
        index: number
        conflicts: ConflictList
        neighbours: null
        nonClippedPolygon: null
        polygon: ClippingPolygon
        originalObject: null
        isDummy: boolean
    }
}
