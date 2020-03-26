declare module "object-merge-advanced" {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type BaseType = any
    // noinspection JSDuplicatedDeclaration
    export default function mergeAdvanced(
        input1orig: BaseType,
        input2orig: BaseType,
        originalOpts?: Record<string, unknown>
    ): BaseType
}
