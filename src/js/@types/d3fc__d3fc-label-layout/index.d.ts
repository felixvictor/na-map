declare module "@d3fc/d3fc-label-layout" {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface Strategy {}

    type Point = import("../../common/common-math").Point
    type Segment = import("../../browser/map/make-journey").Segment
    type ArrayLike = import("d3-selection").ArrayLike<SVGSVGElement | SVGGElement>

    type SizeF = (d: Segment, i: number, nodes: Array<SVGSVGElement | SVGGElement> | ArrayLike) => Point
    type PositionF = (d: Segment) => Point
    type ValueF = (d: Segment) => string

    interface LayoutTextLabelF extends Function {
        padding: (padding: number) => LayoutTextLabelF
        value: (f: ValueF) => LayoutTextLabelF
    }
    interface LayoutLabelF extends Function {
        size: (f: SizeF) => LayoutLabelF
        position: (f: PositionF) => LayoutLabelF
        component: (textLabel: LayoutTextLabelF) => LayoutLabelF
    }

    export function layoutTextLabel(): LayoutTextLabelF
    export function layoutAnnealing(): Strategy
    export function layoutLabel(strategy: Strategy): LayoutLabelF
}
