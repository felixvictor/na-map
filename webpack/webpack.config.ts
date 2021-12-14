// noinspection ES6PreferShortImport

/**
 * webpack.config
 */

import path from "path"
import webpack from "webpack"

// const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer")
import CssMinimizerPlugin from "css-minimizer-webpack-plugin"
import TerserPlugin from "terser-webpack-plugin"

import { loaders } from "./loader"
import { plugins } from "./plugin"

import { aliasPaths, dirJs, dirOutput } from "./dir"
import { isProduction, isQuiet, TARGET } from "./env"

const publicPath = TARGET || !isProduction ? "/" : `http://localhost/na/`

const config: webpack.Configuration = {
    devtool: false,

    entry: [path.resolve(dirJs, "browser/main.ts")],

    externals: {
        jquery: "jQuery",
        "popper.js": "Popper",
    },

    optimization: {
        runtimeChunk: "single",
        splitChunks: {
            chunks: "all",
        },
    },

    output: {
        crossOriginLoading: "anonymous",
        filename: isProduction ? "[name].[contenthash].mjs" : "[name].mjs",
        path: dirOutput,
        publicPath,
    },

    plugins: plugins,

    resolve: {
        alias: aliasPaths,
        extensions: [".ts", ".js", ".json"],
    },

    target: isProduction ? "browserslist" : "web",

    stats: {
        // Add chunk information (setting this to `false` allows for a less verbose output)
        chunks: true,

        // Add namedChunkGroups information
        chunkGroups: true,

        // Add built modules information to chunk information
        chunkModules: true,

        // Add the origins of chunks and chunk merging info
        chunkOrigins: true,

        excludeAssets: [/images\/map\/*/],
    },

    module: {
        rules: loaders,
    },
}

if (isQuiet) {
    config.stats = "errors-only"
}

/*
if (isProduction && !isQuiet) {
    config.plugins.push(
        new BundleAnalyzerPlugin.BundleAnalyzerPlugin({
            analyzerMode: "static",
            generateStatsFile: true,
            logLevel: "warn",
            openAnalyzer: true,
            statsFilename: path.resolve(__dirname, "webpack-stats.json"),
            reportFilename: path.resolve(__dirname, "report.html"),
        })
    )
}
*/

if (isProduction) {
    if (!config.optimization) {
        config.optimization = {}
    }

    config.optimization.minimize = true
    config.optimization.minimizer = [
        new CssMinimizerPlugin({
            minimizerOptions: {
                preset: [
                    "default",
                    {
                        discardComments: { removeAll: true },
                    },
                ],
            },
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
} else {
    config.devtool = "eval-source-map"
}

export default config
