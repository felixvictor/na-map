declare module "@d3fc/d3fc-label-layout" {
    interface Strategy {}

    type Point = import("../../common/common-math").Point
    type Segment = import("../../browser/map-tools/make-journey").Segment

    type SizeF = (d: Segment, i: number, nodes: any) => Point
    type PositionF = (d: Segment) => Point
    type ValueF = (d: Segment) => string

    interface LayoutTextLabelF extends Function {
        padding(padding: number): LayoutTextLabelF
        value(f: ValueF): LayoutTextLabelF
    }
    interface LayoutLabelF extends Function {
        size(f: SizeF): LayoutLabelF
        position(f: PositionF): LayoutLabelF
        component(textLabel: LayoutTextLabelF): LayoutLabelF
    }

    export function layoutTextLabel(): LayoutTextLabelF
    export function layoutAnnealing(): Strategy
    export function layoutLabel(strategy: Strategy): LayoutLabelF
}
