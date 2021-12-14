import CssMinimizerPlugin from "css-minimizer-webpack-plugin"
import TerserPlugin from "terser-webpack-plugin"

export const minimiser = [
    new CssMinimizerPlugin({
        // @ts-ignore
        minimizerOptions: { comments: false },
        minify: CssMinimizerPlugin.cssoMinify,
    }),
    new TerserPlugin({
        parallel: true,
        terserOptions: {
            ecma: 2020,
            module: true,
            mangle: {
                properties: false,
            },
            output: {
                beautify: false,
            },
            toplevel: false,
        },
    }),
]
