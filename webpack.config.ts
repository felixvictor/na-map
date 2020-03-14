/**
 * webpack.config
 */

import webpack from "webpack"
import ToStringOptionsObject = webpack.Stats.ToStringOptionsObject

import path from "path"
import sass from "node-sass"
import css, { Declaration, Rule } from "css"
// const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer");
import { CleanWebpackPlugin } from "clean-webpack-plugin"
import CopyPlugin from "copy-webpack-plugin"
import HtmlPlugin from "html-webpack-plugin"
import HtmlMinifierPlugin from "html-minifier-terser"
import ExtractCssChunks from "extract-css-chunks-webpack-plugin"
import { default as SitemapPlugin } from "sitemap-webpack-plugin"
import SriPlugin from "webpack-subresource-integrity"
import TerserPlugin from "terser-webpack-plugin"
import FaviconsPlugin from "favicons-webpack-plugin"
import { servers as serverServers } from "./src/js/browser/servers"
import PACKAGE from "./package.json"
import repairs from "./lib/gen-generic/repairs.json"

// Environment
const { TARGET, QUIET } = process.env
import { isProduction } from "webpack-mode"
const isQuiet = Boolean(QUIET)
const target = TARGET ? `https://${TARGET}.netlify.com/` : ""

const libraryName = PACKAGE.name
const descriptionLong =
    "Yet another map with in-game map, resources, ship and wood comparisons. Port battle data is updated constantly from twitter and all data daily after maintenance."
const sitemapPaths = ["/fonts/", "/icons", "/images"]

const dirFlags = path.resolve(__dirname, "src/images/flags")
const dirFonts = path.resolve(__dirname, "src/fonts/")
const dirIcons = path.resolve(__dirname, "src/icons")
const dirOutput = path.resolve(__dirname, "public")
const dirPrefixIcons = path.join("images", "icons")

const fileLogo = path.resolve("src", "images", "icons", "logo.png")
const fileScssPreCompile = path.resolve("src", "scss", "pre-compile.scss")

type ColourMap = Map<string, string>
/** Set colours
 * @returns Colours
 */
const setColours = (): ColourMap => {
    const compiledCss = sass
        .renderSync({
            file: fileScssPreCompile
        })
        .css.toString()
    const parsedCss = css.parse(compiledCss)
    return new Map(
        (parsedCss.stylesheet?.rules.filter((rule: Rule) =>
            rule.selectors?.[0].startsWith(".colour-palette ")
        ) as Rule[])
            .filter((rule: Rule) =>
                rule?.declarations?.find((declaration: Declaration) => declaration.property === "background-color")
            )
            .map(rule => {
                const d = rule?.declarations?.find(
                    (declaration: Declaration) => declaration.property === "background-color"
                ) as Declaration
                return [rule.selectors?.[0].replace(".colour-palette .", "") ?? "", d.value ?? ""]
            })
    )
}

const colours = setColours()
const backgroundColour = colours.get("primary-500")
const themeColour = colours.get("secondary-500")
const primary700 = colours.get("primary-700")
const primary200 = colours.get("primary-200")
const primary300 = colours.get("primary-300")
const colourGreen = colours.get("green")
const colourGreenLight = colours.get("green-light")
const colourGreenDark = colours.get("green-dark")
const colourOrange = colours.get("orange")
const colourRed = colours.get("red")
const colourRedLight = colours.get("red-light")
const colourRedDark = colours.get("red-dark")
const colourWhite = colours.get("white")

const babelOpt = {
    cacheDirectory: true,
    plugins: ["@babel/plugin-proposal-nullish-coalescing-operator", "@babel/plugin-transform-spread"],
    presets: [
        [
            "@babel/preset-env",
            {
                // debug: true,
                corejs: 3,
                loose: true,
                modules: false,
                shippedProposals: true,
                targets: {
                    browsers: PACKAGE.browserslist
                },
                useBuiltIns: "usage"
            }
        ]
        //  "@babel/preset-typescript"
    ]
}

const cssOpt = {
    sourceMap: true
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
    useShortDoctype: true
} as HtmlMinifierPlugin.Options

const postcssCleanOpt = {
    level: { 1: { specialComments: 0 }, 2: {} }
}

const postcssOpt = {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    plugins: [require("autoprefixer"), isProduction ? require("postcss-clean")({ postcssCleanOpt }) : {}],
    sourceMap: true
}

const sassOpt = {
    sourceMap: !isProduction,
    sassOptions: {
        outputStyle: "expanded",
        precision: 6,
        sourceMap: !isProduction,
        sourceMapContents: !isProduction
    }
}

const svgoOpt = {
    plugins: [
        { cleanupAttrs: true },
        { removeDoctype: true },
        { removeXMLProcInst: true },
        { removeComments: true },
        { removeMetadata: true },
        { removeTitle: true },
        { removeDesc: true },
        { removeUselessDefs: true },
        { removeXMLNS: false },
        { removeEditorsNSData: true },
        { removeEmptyAttrs: true },
        { removeHiddenElems: true },
        { removeEmptyText: true },
        { removeEmptyContainers: true },
        { removeViewBox: false },
        { cleanupEnableBackground: true },
        { minifyStyles: true },
        { convertStyleToAttrs: true },
        { convertColors: true },
        { convertPathData: true },
        { convertTransform: true },
        { removeUnknownsAndDefaults: true },
        { removeNonInheritableGroupAttrs: true },
        { removeUselessStrokeAndFill: true },
        { removeUnusedNS: true },
        { cleanupIDs: true },
        { cleanupNumericValues: true },
        { cleanupListOfValues: false },
        { moveElemsAttrsToGroup: true },
        { moveGroupAttrsToElems: true },
        { collapseGroups: true },
        { removeRasterImages: false },
        { mergePaths: true },
        { convertShapeToPath: true },
        { sortAttrs: false },
        { transformsWithOnePath: false },
        { removeDimensions: true },
        { removeAttrs: false },
        { removeElementsByAttr: true },
        { removeStyleElement: true },
        { addClassesToSVGElement: false },
        { addAttributesToSVGElement: false },
        { removeStyleElement: false },
        { removeScriptElement: false }
    ]
}

const htmlOpt = {
    iconSmall: `${dirPrefixIcons}/android-chrome-48x48.png`,
    iconLarge: `${dirPrefixIcons}/firefox_app_512x512.png`,
    canonicalUrl: TARGET === "na-map" ? target : "",
    name: libraryName,
    description: descriptionLong,
    hash: false,
    inject: "body",
    lang: "en-GB",
    meta: { viewport: "width=device-width, initial-scale=1, shrink-to-fit=no" },
    minify: htmlMinifyOpt,
    servers: serverServers,
    template: "index.template.ejs",
    title: PACKAGE.description
} as HtmlPlugin.Options

const faviconsOpt = {
    logo: fileLogo,
    cache: true,
    devMode: "webapp",
    inject: true,
    prefix: dirPrefixIcons,
    favicons: {
        appDescription: PACKAGE.description,
        appName: PACKAGE.name,
        appShortName: PACKAGE.name,
        background: backgroundColour,
        fingerprints: false,
        icons: {
            android: true,
            appleIcon: false,
            appleStartup: false,
            coast: false,
            favicons: false,
            firefox: true,
            windows: true,
            yandex: false
        },
        lang: "en-GB",
        // eslint-disable-next-line @typescript-eslint/camelcase
        start_url: "/",
        // eslint-disable-next-line @typescript-eslint/camelcase
        theme_color: themeColour,
        version: PACKAGE.version
    }
} as any

const config: webpack.Configuration = {
    context: path.resolve(__dirname, "src"),

    devServer: {
        contentBase: dirOutput,
        disableHostCheck: true
    },

    devtool: false,

    entry: [path.resolve(__dirname, PACKAGE.main), path.resolve(__dirname, PACKAGE.sass)],

    externals: {
        jquery: "jQuery",
        "popper.js": "Popper"
    },

    resolve: {
        extensions: [".ts", ".js"],
        mainFields: ["module", "main"]
    },

    optimization: {
        moduleIds: "hashed",
        runtimeChunk: "single",
        splitChunks: {
            chunks: "all"
        }
    },

    output: {
        chunkFilename: isProduction ? "[name].[chunkhash].js" : "[name].js",
        filename: isProduction ? "[name].[contenthash].js" : "[name].js",
        path: dirOutput,
        crossOriginLoading: "anonymous"
    },

    plugins: [
        /*
        new BundleAnalyzerPlugin({
            analyzerMode: isProduction ? "static" : "disabled",
            generateStatsFile: true,
            logLevel: "warn",
            openAnalyzer: isProduction,
            statsFilename: path.resolve(__dirname, "webpack-stats.json"),
            reportFilename: path.resolve(__dirname, "report.html")
        }),
        */
        new CleanWebpackPlugin({
            verbose: false
        }),
        new ExtractCssChunks({
            filename: isProduction ? "[name].[contenthash].css" : "[name].css",
            orderWarning: true
        }),
        new webpack.DefinePlugin({
            CPRIMARY300: JSON.stringify(primary300),
            CGREEN: JSON.stringify(colourGreen),
            CGREENLIGHT: JSON.stringify(colourGreenLight),
            CGREENDARK: JSON.stringify(colourGreenDark),
            CORANGE: JSON.stringify(colourOrange),
            CRED: JSON.stringify(colourRed),
            CREDLIGHT: JSON.stringify(colourRedLight),
            CREDDARK: JSON.stringify(colourRedDark),
            CWHITE: JSON.stringify(colourWhite),
            NAME: JSON.stringify(libraryName),
            DESCRIPTION: JSON.stringify(descriptionLong),
            TITLE: JSON.stringify(PACKAGE.description),
            VERSION: JSON.stringify(PACKAGE.version),
            ICONSMALL: JSON.stringify("images/icons/android-chrome-48x48.png"),
            REPAIR_ARMOR_VOLUME: JSON.stringify(repairs.armorRepair.volume),
            REPAIR_ARMOR_PERCENT: JSON.stringify(repairs.armorRepair.percent),
            REPAIR_ARMOR_TIME: JSON.stringify(repairs.armorRepair.time),
            REPAIR_SAIL_VOLUME: JSON.stringify(repairs.sailRepair.volume),
            REPAIR_SAIL_PERCENT: JSON.stringify(repairs.sailRepair.percent),
            REPAIR_CREW_VOLUME: JSON.stringify(repairs.crewRepair.volume),
            REPAIR_CREW_PERCENT: JSON.stringify(repairs.crewRepair.percent)
        }),
        new webpack.ProvidePlugin({
            $: "jquery",
            jQuery: "jquery",
            "window.jQuery": "jquery",
            moment: "moment",
            "window.moment": "moment",
            Popper: ["popper.js", "default"]
        }),
        // Do not include all moment locale files, certain locales are loaded by import
        new webpack.IgnorePlugin({
            resourceRegExp: /^\.\/locale$/,
            contextRegExp: /moment$/
        }),
        new CopyPlugin([
            { from: "../netlify.toml" },
            {
                from: "gen-server",
                to: `${dirOutput}/data`,
                flatten: true
            },
            { from: "google979f2cf3bed204d6.html", to: "google979f2cf3bed204d6.html", toType: "file" },
            { from: "images/map", to: `${dirOutput}/images/map` }
        ]),
        new HtmlPlugin(htmlOpt),
        new SitemapPlugin(target, sitemapPaths, { skipGzip: false }),
        new FaviconsPlugin(faviconsOpt),
        new SriPlugin({
            hashFuncNames: ["sha384"],
            enabled: isProduction
        })
    ],

    stats: {
        // Add chunk information (setting this to `false` allows for a less verbose output)
        chunks: true,

        // Add namedChunkGroups information
        chunkGroups: true,

        // Add built modules information to chunk information
        chunkModules: true,

        // Add the origins of chunks and chunk merging info
        chunkOrigins: true,

        excludeAssets: [/images\/map\/*/]
    } as ToStringOptionsObject,

    module: {
        rules: [
            {
                test: /\.ts$/,
                include: path.resolve(__dirname, "src/js"),
                use: [
                    { loader: require.resolve("babel-loader"), options: babelOpt },
                    { loader: require.resolve("ts-loader") }
                ]
            },
            {
                test: /\.js$/,
                include: path.resolve(__dirname, "src/js"),
                use: [{ loader: require.resolve("babel-loader"), options: babelOpt }]
            },
            {
                test: /\.scss$/,
                include: path.resolve(__dirname, "src/scss"),
                use: [
                    ExtractCssChunks.loader,
                    {
                        loader: require.resolve("css-loader"),
                        options: cssOpt
                    },
                    {
                        loader: require.resolve("postcss-loader"),
                        options: postcssOpt
                    },
                    {
                        loader: require.resolve("sass-loader"),
                        options: sassOpt
                    }
                ]
            },
            {
                test: /\.css$/,
                use: [
                    ExtractCssChunks.loader,
                    {
                        loader: require.resolve("css-loader"),
                        options: cssOpt
                    },
                    {
                        loader: require.resolve("postcss-loader"),
                        options: postcssOpt
                    }
                ]
            },
            {
                test: /\.(woff2?|ttf|eot|svg)$/,
                include: dirFonts,
                use: {
                    loader: require.resolve("file-loader"),
                    options: {
                        name: "[name].[ext]",
                        outputPath: "fonts/"
                    }
                }
            },
            {
                test: /\.svg$/,
                include: dirFlags,
                use: [
                    {
                        loader: require.resolve("svg-url-loader"),
                        options: {
                            limit: 1000,
                            name: "[name].[ext]",
                            outputPath: "images/flags/"
                        }
                    },
                    {
                        loader: require.resolve("image-webpack-loader"),
                        options: {
                            svgo: svgoOpt
                        }
                    },
                    {
                        loader: require.resolve("string-replace-loader"),
                        options: {
                            search: 'fill="#fff" fill-opacity="0"/>',
                            replace: `fill="${primary700}" fill-opacity="0.3"/>`
                        }
                    },
                    {
                        loader: require.resolve("string-replace-loader"),
                        options: {
                            search: 'fill="#fff" fill-opacity="1"/>',
                            replace: `fill="${primary200}" fill-opacity="1"/>`
                        }
                    },
                    {
                        loader: require.resolve("string-replace-loader"),
                        options: {
                            search: 'fill="#fff" fill-opacity=".7"/>',
                            replace: `fill="${primary300}" fill-opacity=".7"/>`
                        }
                    }
                ]
            },
            {
                test: /\.svg$/,
                include: dirIcons,
                use: [
                    {
                        loader: require.resolve("svg-url-loader"),
                        options: {
                            limit: 1000,
                            name: "[name].[ext]",
                            outputPath: "icons/"
                        }
                    },
                    {
                        loader: require.resolve("image-webpack-loader"),
                        options: {
                            svgo: svgoOpt
                        }
                    },
                    {
                        loader: require.resolve("string-replace-loader"),
                        options: {
                            search: 'fill="$themeColour"',
                            replace: `fill="${themeColour}"`
                        }
                    }
                ]
            }
        ]
    }
}

if (isQuiet) {
    config.stats = "errors-only"
}

if (isProduction) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    config.optimization!.minimizer = [
        new TerserPlugin({
            cache: true,
            parallel: true,
            terserOptions: {
                output: { comments: false }
            }
        })
    ]
} else {
    config.devtool = "eval-source-map"
    config.plugins?.push(new webpack.HotModuleReplacementPlugin())
}

export default config
