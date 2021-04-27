/**
 * webpack.config
 */

const path = require("path")
const webpack = require("webpack")

// const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer")
const CopyPlugin = require("copy-webpack-plugin")
const FaviconsPlugin = require("favicons-webpack-plugin")
const HtmlPlugin = require("html-webpack-plugin")
const MiniCssExtractPlugin = require("mini-css-extract-plugin")
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin")
const parseCss = require("css")
const PreloadWebpackPlugin = require("preload-webpack-plugin")
const sass = require("sass")
const SitemapPlugin = require("sitemap-webpack-plugin").default
const { SubresourceIntegrityPlugin } = require("webpack-subresource-integrity")
const TerserPlugin = require("terser-webpack-plugin")
const svgToMiniDataURI = require("mini-svg-data-uri")
const { extendDefaultPlugins, optimize } = require("svgo")
const { TsconfigPathsPlugin } = require("tsconfig-paths-webpack-plugin")

const { getCommonPaths } = require("./dist/js/common/common-dir.cjs")
const commonPaths = getCommonPaths(__dirname)
const { dirLib, dirOutput, dirSrc } = commonPaths

const dirEjs = path.resolve(dirSrc, "ejs")
const dirFlags = path.resolve(dirSrc, "images", "flags")
const dirFonts = path.resolve(dirSrc, "fonts")
const dirIcons = path.resolve(dirSrc, "icons")
const dirJs = path.resolve(dirSrc, "js")
const dirMap = path.resolve(dirSrc, "images", "map")
const dirPrefixIcons = path.join("images", "icons")

const fileLogo = path.resolve(dirSrc, dirPrefixIcons, "logo.png")
const filePostcssProdConfig = path.resolve(dirSrc, "postcss.prod.config.js")
const filePostcssDevConfig = path.resolve(dirSrc, "postcss.dev.config.js")
const fileScssPreCompile = path.resolve(dirSrc, "scss", "pre-compile.scss")

// Variables
const PACKAGE = require("./package.json")
const TSCONFIG = require("./tsconfig.json")
const repairs = require(`${dirLib}/gen-generic/repairs.json`)
const { isProduction } = require("webpack-mode")
const servers = [
    { id: "eu1", name: "War", type: "PVP" },
    { id: "eu2", name: "Peace", type: "PVE" },
]
const { TARGET, QUIET } = process.env
const isQuiet = Boolean(QUIET)

const targetUrl = TARGET ? `https://${TARGET}.netlify.app/` : `http://localhost/na/`
const publicPath = TARGET || !isProduction ? "/" : `http://localhost/na/`

const libraryName = PACKAGE.name
const descriptionLong =
    "Yet another map with in-game map, resources, ship and wood comparisons. Port battle data is updated constantly from twitter and all data daily after maintenance."
const sitemapPaths = ["/fonts/", "/icons", "/images"]

const regExpFont = /\.(woff2?|ttf)$/
const regExpCss = /^map\.\w+\.css$/

const setColours = () => {
    const compiledCss = sass
        .renderSync({
            file: fileScssPreCompile,
        })
        .css.toString()
    const parsedCss = parseCss.parse(compiledCss)
    return new Map(
        parsedCss.stylesheet.rules
            .filter((rule) => rule.selectors && rule.selectors[0].startsWith(".colour-palette "))
            .filter(
                (rule) =>
                    rule &&
                    rule.declarations &&
                    rule.declarations.find((declaration) => declaration.property === "background-color")
            )
            .map((rule) => {
                const d =
                    rule &&
                    rule.declarations &&
                    rule.declarations.find((declaration) => declaration.property === "background-color")
                return [rule.selectors[0].replace(".colour-palette .", "") || "", d.value || ""]
            })
    )
}

const colours = setColours()
const backgroundColour = colours.get("primary-500")
const themeColour = colours.get("secondary-500")
const colourYellowDark = colours.get("yellow-dark")
const primary700 = colours.get("primary-700")
const primary200 = colours.get("primary-200")
const primary300 = colours.get("primary-300")
const colourGreen = colours.get("green")
const colourGreenLight = colours.get("green-light")
const colourGreenDark = colours.get("green-dark")
const colourRed = colours.get("red")
const colourRedLight = colours.get("red-light")
const colourRedDark = colours.get("red-dark")
const colourWhite = colours.get("white")
const colourLight = colours.get("light")

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
const htmlOpt = {
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
    template: path.resolve(__dirname, dirEjs, "index.ejs"),
    title: PACKAGE.description,
}

const faviconsOpt = {
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
        fingerprints: false,
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
        // eslint-disable-next-line camelcase
        start_url: "/",
        // eslint-disable-next-line camelcase
        theme_color: themeColour,
        version: PACKAGE.version,
    },
}

const MiniCssExtractPluginOpt = {
    esModule: true,
}

const config = {
    devServer: {
        host: "localhost",
        hot: true,
        open: true,
    },

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
        new PreloadWebpackPlugin({
            rel: "preload",
            include: "allAssets",
            fileWhitelist: [regExpFont, regExpCss],
            as(entry) {
                if (regExpCss.test(entry)) {
                    return "style"
                }

                if (regExpFont.test(entry)) {
                    return "font"
                }

                return "script"
            },
        }),
        new SitemapPlugin({ base: targetUrl, paths: sitemapPaths, options: { skipGzip: false } }),
        new SubresourceIntegrityPlugin(),
    ],

    resolve: {
        extensions: [".ts", ".js", ".json"],
        plugins: [
            new TsconfigPathsPlugin({
                /* options: see below */
            }),
        ],
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
                    dataUrl: (content) => {
                        let svg = content.toString()

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
                    dataUrl: (content) => {
                        let svg = content.toString()

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
    config.optimization.minimize = true
    config.optimization.minimizer = [
        new CssMinimizerPlugin({
            minimizerOptions: [{ comments: false, sourceMap: false }],
            minify: [CssMinimizerPlugin.cssoMinify],
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

module.exports = () => config
