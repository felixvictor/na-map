import MiniCssExtractPlugin from "mini-css-extract-plugin"
import svgToMiniDataURI from "mini-svg-data-uri"
import { DefaultPlugin, DefaultPlugins, optimize } from "svgo"

import PACKAGE from "../package.json"
import { dirFlags, dirFonts, dirIcons, dirJs, filePostcssDevConfig, filePostcssProdConfig } from "./dir"
import { colourYellowDark, themeColour } from "./colours"
import { isProduction } from "./env"

const babelOpt = {
    cacheDirectory: true,
    plugins: ["@babel/plugin-proposal-class-properties", "@babel/plugin-proposal-private-methods"],
    presets: [
        [
            "@babel/preset-env",
            {
                // debug: true,
                corejs: { version: 3 },
                modules: false,
                shippedProposals: true,
                targets: PACKAGE.browserslist,
                useBuiltIns: "usage",
            },
        ],
        "@babel/typescript",
    ],
}

const cssLoaderOpt = {
    sourceMap: !isProduction,
}

const postcssLoaderOpt = {
    postcssOptions: {
        config: isProduction ? filePostcssProdConfig : filePostcssDevConfig,
    },
    sourceMap: true,
}

const sassLoaderOpt = {
    sourceMap: !isProduction,
    sassOptions: {
        outputStyle: "expanded",
        precision: 6,
        quietDeps: true,
        sourceMap: !isProduction,
        sourceMapContents: !isProduction,
    },
}

const svgoOpt = {
    multipass: true,
    plugins: [
        {
            name: "preset-default",
            params: {
                overrides: {
                    removeViewBox: false,
                },
            },
        } as DefaultPlugins,
        { name: "removeScriptElement" } as DefaultPlugin<"removeScriptElement">,
    ],
}

const MiniCssExtractPluginOpt = {
    esModule: true,
}

const regExpFont = /\.(woff2?|ttf)$/

export const loaders = [
    {
        test: /\.(ts|js)$/,
        include: dirJs,
        use: [{ loader: "babel-loader", options: babelOpt }],
    },
    {
        test: /\.scss$/,
        use: [
            {
                loader: MiniCssExtractPlugin.loader,
                options: MiniCssExtractPluginOpt,
            },
            {
                loader: "css-loader",
                options: cssLoaderOpt,
            },
            {
                loader: "postcss-loader",
                options: postcssLoaderOpt,
            },
            {
                loader: "sass-loader",
                options: sassLoaderOpt,
            },
        ],
    },
    {
        test: /\.css$/,
        use: [
            {
                loader: MiniCssExtractPlugin.loader,
                options: MiniCssExtractPluginOpt,
            },
            {
                loader: "css-loader",
                options: cssLoaderOpt,
            },
            {
                loader: "postcss-loader",
                options: postcssLoaderOpt,
            },
        ],
    },
    {
        test: regExpFont,
        include: dirFonts,
        type: "asset/resource",
        generator: {
            filename: "fonts/[name][ext]",
        },
    },
    {
        test: /\.svg$/,
        include: dirFlags,
        type: "asset/inline",
        generator: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any,@typescript-eslint/explicit-module-boundary-types
            dataUrl: (content: any): string => {
                let svg: string = content.toString() as string

                // svgo
                svg = optimize(svg, svgoOpt).data

                // Compress
                return svgToMiniDataURI(svg)
            },
        },
    },
    {
        test: /\.svg$/,
        include: dirIcons,
        type: "asset/inline",
        generator: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any,@typescript-eslint/explicit-module-boundary-types
            dataUrl: (content: any): string => {
                let svg: string = content.toString() as string

                // Replace with custom colours
                svg = svg.replace('fill="$themeColour"', `fill="${themeColour}"`)
                svg = svg.replace('fill="$darkYellow"', `fill="${colourYellowDark}"`)

                // svgo
                svg = optimize(svg, svgoOpt).data

                // Compress
                return svgToMiniDataURI(svg)
            },
        },
    },
]
