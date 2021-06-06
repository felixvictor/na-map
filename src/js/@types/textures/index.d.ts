declare module "textures" {
    type Colour = string

    export type Textures = TexturesCircles | TexturesLines | TexturesPath

    export interface TexturesBase extends Function {
        heavier(strokeWidth?: number): this
        lighter(strokeWidth?: number): this
        thinner(size?: number): this
        thicker(size?: number): this
        background(background: string): this
        size(size: number): this
        stroke(stroke?: Colour): this
        strokeWidth(strokeWidth?: number): this
        id(id?: string): this
        url(id?: string): string
    }

    export interface TexturesCircles extends TexturesBase {
        complement(complement: boolean): this
        radius(radius: number): this
        fill(fill?: Colour): this
    }

    export interface TexturesLines extends TexturesBase {
        shapeRendering(shapeRendering: string): this
        orientation(orientation: string[]): this
    }

    export interface TexturesPath extends TexturesBase {
        shapeRendering(shapeRendering: string): this
        fill(fill?: Colour): this
        d(d: () => string): this
    }

    export function circles(): TexturesCircles
    export function lines(): TexturesLines
    export function path(): TexturesPath
}
