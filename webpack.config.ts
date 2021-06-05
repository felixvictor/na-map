// noinspection ES6PreferShortImport

/**
 * webpack.config
 */

import path from "path"
import webpack from "webpack"

// const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer")
import CopyPlugin from "copy-webpack-plugin"
import FaviconsPlugin from "favicons-webpack-plugin"
import { FaviconWebpackPlugionOptions } from "favicons-webpack-plugin/src/options"
import HtmlPlugin from "html-webpack-plugin"
import MiniCssExtractPlugin from "mini-css-extract-plugin"
import CssMinimizerPlugin from "css-minimizer-webpack-plugin"
import { SubresourceIntegrityPlugin } from "webpack-subresource-integrity"
import SitemapPlugin from "sitemap-webpack-plugin"
import TerserPlugin from "terser-webpack-plugin"
import svgToMiniDataURI from "mini-svg-data-uri"
import { extendDefaultPlugins, optimize } from "svgo"

import PACKAGE from "./package.json"
import { argv } from "yargs"
import { servers } from "./src/js/common/servers"
import {
    backgroundColour,
    colourGreen,
    colourGreenDark,
    colourGreenLight,
    colourLight,
    colourRed,
    colourRedDark,
    colourRedLight,
    colourWhite,
    colourYellowDark,
    primary200,
    primary300,
    primary700,
    themeColour,
} from "./src/js/webpack/colours"
import { repairs } from "./src/js/webpack/repairs"
import {
    aliasPaths,
    dirEjs,
    dirFlags,
    dirFonts,
    dirIcons,
    dirJs,
    dirLib,
    dirMap,
    dirOutput,
    dirPrefixIcons,
    dirSrc,
    fileLogo,
    filePostcssDevConfig,
    filePostcssProdConfig,
} from "./src/js/webpack/dir"

const isProduction = argv.mode === "production"
const { TARGET, QUIET } = process.env
const isQuiet = Boolean(QUIET)

const targetUrl = TARGET ? `https://${TARGET}.netlify.app/` : `http://localhost/na/`
const publicPath = TARGET || !isProduction ? "/" : `http://localhost/na/`

const libraryName = PACKAGE.name
const descriptionLong =
    "Yet another map with in-game map, resources, ship and wood comparisons. Port battle data is updated constantly from twitter and all data daily after maintenance."
const sitemapPaths = ["/fonts/", "/icons", "/images"]

const regExpFont = /\.(woff2?|ttf)$/

const babelOpt = {
    cacheDirectory: true,
    plugins: ["@babel/plugin-proposal-class-properties"],
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

const htmlMinifyOpt = {
    collapseBooleanAttributes: true,
    collapseInlineTagWhitespace: true,
    collapseWhitespace: false,
    decodeEntities: true,
    html5: true,
    minifyURLs: true,
    removeComments: true,
    removeRedundantAttributes: true,
    removeScriptTypeAttributes: true,
    removeStyleLinkTypeAttributes: true,
    sortAttributes: true,
    sortClassName: true,
    useShortDoctype: true,
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
        sourceMap: !isProduction,
        sourceMapContents: !isProduction,
    },
}

const svgoOpt = {
    multipass: true,
    plugins: extendDefaultPlugins([
        {
            name: "removeScriptElement",
            active: true,
        },
        {
            name: "removeViewBox",
            active: false,
        },
    ]),
}

// noinspection JSIncompatibleTypesComparison
const htmlOpt: HtmlPlugin.Options = {
    iconSmall: `${dirPrefixIcons}/android-chrome-48x48.png`,
    iconLarge: `${dirPrefixIcons}/firefox_app_512x512.png`,
    canonicalUrl: TARGET === "na-map" ? targetUrl : "",
    name: libraryName,
    description: descriptionLong,
    hash: false,
    inject: "body",
    lang: "en-GB",
    meta: { viewport: "width=device-width, initial-scale=1, shrink-to-fit=no" },
    minify: htmlMinifyOpt,
    scriptLoading: "defer",
    servers,
    template: path.resolve(dirEjs, "index.ejs"),
    title: PACKAGE.description,
}

const faviconsOpt: FaviconWebpackPlugionOptions = {
    logo: fileLogo,
    cache: true,
    devMode: "webapp",
    inject: true,
    prefix: `${dirPrefixIcons}/`,
    favicons: {
        appDescription: PACKAGE.description,
        appName: PACKAGE.name,
        appShortName: PACKAGE.name,
        background: backgroundColour,
        icons: {
            android: true,
            appleIcon: false,
            appleStartup: false,
            coast: false,
            favicons: true,
            firefox: true,
            windows: true,
            yandex: false,
        },
        lang: "en-GB",
        start_url: "/",
        theme_color: themeColour,
        version: PACKAGE.version,
    },
}

const MiniCssExtractPluginOpt = {
    esModule: true,
}

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

    plugins: [
        new MiniCssExtractPlugin({
            filename: isProduction ? "[name].[contenthash].css" : "[name].css",
        }),
        new webpack.DefinePlugin({
            CGREEN: JSON.stringify(colourGreen),
            CGREENDARK: JSON.stringify(colourGreenDark),
            CGREENLIGHT: JSON.stringify(colourGreenLight),
            CLIGHT: JSON.stringify(colourLight),
            CPRIMARY300: JSON.stringify(primary300),
            CRED: JSON.stringify(colourRed),
            CREDDARK: JSON.stringify(colourRedDark),
            CREDLIGHT: JSON.stringify(colourRedLight),
            CWHITE: JSON.stringify(colourWhite),
            DESCRIPTION: JSON.stringify(descriptionLong),
            ICONSMALL: JSON.stringify(`${dirPrefixIcons}/android-chrome-48x48.png`),
            NAME: JSON.stringify(libraryName),
            TITLE: JSON.stringify(PACKAGE.description),
            VERSION: JSON.stringify(PACKAGE.version),
            REPAIR_ARMOR_VOLUME: JSON.stringify(repairs.armorRepair.volume),
            REPAIR_ARMOR_PERCENT: JSON.stringify(repairs.armorRepair.percent),
            REPAIR_ARMOR_TIME: JSON.stringify(repairs.armorRepair.time),
            REPAIR_SAIL_VOLUME: JSON.stringify(repairs.sailRepair.volume),
            REPAIR_SAIL_PERCENT: JSON.stringify(repairs.sailRepair.percent),
            REPAIR_CREW_VOLUME: JSON.stringify(repairs.crewRepair.volume),
            REPAIR_CREW_PERCENT: JSON.stringify(repairs.crewRepair.percent),
        }),
        new webpack.ProvidePlugin({
            $: "jquery",
            jQuery: "jquery",
            "window.jQuery": "jquery",
            "bootstrap.Dropdown": "bootstrap/js/dist/dropdown",
        }),
        new CopyPlugin({
            patterns: [
                { from: "netlify.toml" },
                { from: `${dirLib}/gen-generic/*.xlsx`, to: `${dirOutput}/data/[name][ext]` },
                { from: `${dirLib}/gen-server`, to: `${dirOutput}/data` },
                { from: `${dirSrc}/google979f2cf3bed204d6.html` },
                { from: dirMap, to: `${dirOutput}/images/map` },
            ],
        }),
        new HtmlPlugin(htmlOpt),
        new FaviconsPlugin(faviconsOpt),
        new SitemapPlugin({ base: targetUrl, paths: sitemapPaths, options: { skipgzip: false } }),
        new SubresourceIntegrityPlugin(),
    ],

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
        rules: [
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

                        // Replace with custom colours
                        svg = svg.replace('fill="#fff" fill-opacity="0"/>', `fill="${primary700}" fill-opacity="0.3"/>`)
                        svg = svg.replace('fill="#fff" fill-opacity="1"/>', `fill="${primary200}" fill-opacity="1"/>`)

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
        ],
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
            // @ts-expect-error
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
