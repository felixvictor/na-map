declare module "tablesort" {
    interface Options {
        descending: string
    }
    // eslint-disable-next-line @typescript-eslint/no-extraneous-class
    export class Tablesort {
        constructor(el: HTMLElement, options?: Options)
    }
    export function extend(
        name: string,
        pattern: (item: string) => RegExpMatchArray | null,
        sort: (a: string, b: string) => number
    ): void
}
