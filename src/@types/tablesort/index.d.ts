declare module "tablesort" {
    interface Options {
        descending: string
    }
    export function Tablesort(el: HTMLElement, options?: Options): void
    export function extend(
        name: string,
        pattern: (item: string) => RegExpMatchArray | null,
        sort: (a: string, b: string) => {}
    ): void
}
