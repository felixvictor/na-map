declare module "d3-voronoi-treemap" {
    type Point = import("../../common/common-math").Point

    interface ClippingPolygon {
        0: Point
        1: Point
        2: Point
        3: Point
    }

    interface VoronoiTreemapF extends Function {
        clip: (p: ClippingPolygon) => VoronoiTreemapF
    }

    export function voronoiTreemap(): VoronoiTreemapF
}
