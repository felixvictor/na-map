// https://github.com/shakacode/react-webpack-rails-tutorial/blob/master/client%2Fwebpack.client.base.config.js

const webpack = require("webpack");

const path = require("path");
const // { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer"),
    CleanWebpackPlugin = require("clean-webpack-plugin"),
    CopyPlugin = require("copy-webpack-plugin"),
    HtmlPlugin = require("html-webpack-plugin"),
    MiniCssExtractPlugin = require("mini-css-extract-plugin"),
    MinifyPlugin = require("babel-minify-webpack-plugin"),
    PreloadWebpackPlugin = require("preload-webpack-plugin"),
    SitemapPlugin = require("sitemap-webpack-plugin").default,
    SriPlugin = require("webpack-subresource-integrity"),
    WebpackDeepScopeAnalysisPlugin = require("webpack-deep-scope-plugin").default,
    WebpackPwaManifest = require("webpack-pwa-manifest");
const PACKAGE = require("./package.json");

const libraryName = PACKAGE.name,
    gtagLink = "https://www.googletagmanager.com/gtag/js?id=UA-109520372-1",
    { TARGET } = process.env,
    isProd = process.env.NODE_ENV === "production",
    description =
        "Yet another map with in-game map, F11 coordinates, resources, ship and wood comparison. Port data is updated constantly from twitter and daily after maintenance.",
    sitemapPaths = ["/fonts/", "/icons", "/images"];
const backgroundColour = "#c9c0ab";
const themeColour = "#767a49";

const outputPath = path.resolve(__dirname, "public");

const babelOpt = {
    cacheDirectory: true,
    plugins: ["@babel/plugin-syntax-dynamic-import"],
    presets: [
        [
            "@babel/preset-env",
            {
                // debug: true,
                loose: true,
                modules: false,
                shippedProposals: true,
                targets: {
                    browsers: PACKAGE.browserslist
                },
                useBuiltIns: "usage"
            }
        ]
    ]
};

const cssOpt = {
    sourceMap: true
};

const minifyMinifyOpt = {
    numericLiterals: false,
    removeDebugger: true
};

const pluginMinifyOpt = { comments: false };

const htmlMinifyOpt = {
    collapseBooleanAttributes: true,
    collapseWhitespace: false,
    collapseInlineTagWhitespace: true,
    decodeEntities: true,
    html5: true,
    minifyURLs: true,
    removeComments: true,
    sortAttributes: true,
    sortClassName: true
};

const imagewebpackOpt = {
    gifsicle: {
        optimizationLevel: 3,
        interlaced: false
    },
    mozjpeg: {
        quality: 70,
        progressive: true
    },
    optipng: {
        optimizationLevel: 0
    },
    pngquant: {
        floyd: 0.5,
        speed: 2
    }
};

const postcssOpt = {
    config: {
        path: "build/postcss.config.js"
    },
    sourceMap: true
};

const sassOpt = {
    outputStyle: "expanded",
    sourceMap: true,
    sourceMapContents: true,
    precision: 6
};

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
};

const htmlOpt = {
    brand: "images/icons/icon_32x32.png",
    description,
    gtag: gtagLink,
    hash: false,
    inject: "body",
    lang: "en-GB",
    meta: { viewport: "width=device-width, initial-scale=1, shrink-to-fit=no" },
    minify: htmlMinifyOpt,
    template: "index.template.ejs",
    title: PACKAGE.description
};

const manifestOpt = {
    background_color: backgroundColour,
    description: PACKAGE.description,
    display: "standalone",
    fingerprints: false,
    icons: [
        {
            src: path.resolve("src/images/icons/logo.png"),
            sizes: [32, 72, 96, 128, 144, 168, 192, 256, 384, 512, 1024],
            destination: path.join("images", "icons")
        }
    ],
    ios: false,
    lang: "en-GB",
    name: PACKAGE.name,
    short_name: PACKAGE.name,
    theme_color: themeColour
};

const config = {
    context: path.resolve(__dirname, "src"),

    devServer: {
        contentBase: outputPath
    },

    entry: [path.resolve(__dirname, PACKAGE.main), path.resolve(__dirname, PACKAGE.sass)],

    externals: {
        jquery: "jQuery",
        "popper.js": "Popper"
    },

    resolve: {
        alias: {
            Fonts: path.resolve(__dirname, "src/fonts/"),
            Icons: path.resolve(__dirname, "src/icons/"),
            Images: path.resolve(__dirname, "src/images/"),
            "@fortawesome/fontawesome-free-regular$": "@fortawesome/fontawesome-free-regular/shakable.es.js",
            "@fortawesome/fontawesome-free-solid$": "@fortawesome/fontawesome-free-solid/shakable.es.js"
        },
        mainFields: ["module", "main"]
    },

    optimization: {
        runtimeChunk: "single",
        splitChunks: {
            chunks: "all"
        }
    },

    output: {
        chunkFilename: isProd ? "[name].[chunkhash].js" : "[name].js",
        filename: isProd ? "[name].[contenthash].js" : "[name].js",
        path: outputPath,
        crossOriginLoading: "anonymous"
    },

    plugins: [
        /*
        new BundleAnalyzerPlugin({
            analyzerMode: isProd ? "static" : "disabled",
            generateStatsFile: true,
            logLevel: "warn",
            openAnalyzer: isProd,
            statsFilename: path.resolve(__dirname, "webpack-stats.json"),
            reportFilename: path.resolve(__dirname, "report.html")
        }),
        */
        new CleanWebpackPlugin(outputPath, {
            verbose: false
        }),
        new MiniCssExtractPlugin({ filename: isProd ? "[name].[contenthash].css" : "[name].css" }),
        new webpack.DefinePlugin({
            DESCRIPTION: JSON.stringify(description),
            TITLE: JSON.stringify(PACKAGE.description),
            VERSION: JSON.stringify(PACKAGE.version)
        }),
        new webpack.HashedModuleIdsPlugin(),
        new webpack.ProvidePlugin({
            $: "jquery",
            jQuery: "jquery",
            "window.jQuery": "jquery",
            moment: "moment",
            "window.moment": "moment",
            Popper: ["popper.js", "default"],
            // Alert: "exports-loader?Alert!bootstrap/js/dist/alert",
            Button: "exports-loader?Button!bootstrap/js/dist/button",
            Collapse: "exports-loader?Collapse!bootstrap/js/dist/collapse",
            Dropdown: "exports-loader?Dropdown!bootstrap/js/dist/dropdown",
            Modal: "exports-loader?Modal!bootstrap/js/dist/modal",
            // Popover: "exports-loader?Popover!bootstrap/js/dist/popover",
            Tooltip: "exports-loader?Tooltip!bootstrap/js/dist/tooltip",
            Util: "exports-loader?Util!bootstrap/js/dist/util"
        }),
        // Do not include all moment locale files, certain locales are loaded by import
        new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),
        new CopyPlugin([
            { from: "google979f2cf3bed204d6.html", to: "google979f2cf3bed204d6.html", toType: "file" },
            { from: "images/map", to: `${outputPath}/images/map` },
            { from: "gen/*.json", to: `${outputPath}/data`, flatten: true },
            { from: "gen/*.xlsx", flatten: true },
            { from: "../netlify.toml" },
            { from: "images/icons/favicon.ico", flatten: true }
        ]),
        new HtmlPlugin(htmlOpt),
        new PreloadWebpackPlugin({
            include: "allAssets",
            fileWhitelist: [/\.woff2$/]
        }),
        new SitemapPlugin(`https://${TARGET}.netlify.com/`, sitemapPaths, { skipGzip: false }),
        new SriPlugin({
            hashFuncNames: ["sha256", "sha384"],
            enabled: isProd
        }),
        new WebpackDeepScopeAnalysisPlugin(),
        new WebpackPwaManifest(manifestOpt)
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
    },

    module: {
        rules: [
            {
                test: /\.js$/,
                include: path.resolve(__dirname, "src/js"),
                loader: "babel-loader",
                options: babelOpt
            },
            {
                test: /\.scss$/,
                include: path.resolve(__dirname, "src/scss"),
                use: [
                    MiniCssExtractPlugin.loader,
                    {
                        loader: "css-loader",
                        options: cssOpt
                    },
                    {
                        loader: "postcss-loader",
                        options: postcssOpt
                    },
                    {
                        loader: "sass-loader",
                        options: sassOpt
                    }
                ]
            },
            {
                test: /\.css$/,
                use: [
                    MiniCssExtractPlugin.loader,
                    {
                        loader: "css-loader",
                        options: cssOpt
                    },
                    {
                        loader: "postcss-loader",
                        options: postcssOpt
                    }
                ]
            },
            {
                test: /\.(woff2?|ttf|eot|svg)$/,
                include: path.resolve(__dirname, "src/fonts"),
                use: {
                    loader: "file-loader",
                    options: {
                        name: "[name].[ext]",
                        outputPath: "fonts/"
                    }
                }
            },
            {
                test: /\.(gif|png|jpe?g)$/i,
                include: path.resolve(__dirname, "src/images"),
                use: [
                    {
                        loader: "file-loader",
                        options: {
                            name: "[name].[ext]",
                            outputPath: "images/"
                        }
                    },
                    {
                        loader: "image-webpack-loader",
                        options: imagewebpackOpt
                    }
                ]
            },
            {
                test: /\.svg$/,
                include: path.resolve(__dirname, "src/images"),
                use: [
                    {
                        loader: "svg-url-loader",
                        options: {
                            limit: 1,
                            name: "[name].[ext]",
                            outputPath: "images/"
                        }
                    },
                    {
                        loader: "image-webpack-loader",
                        options: {
                            svgo: svgoOpt
                        }
                    }
                ]
            },
            {
                test: /\.svg$/,
                include: path.resolve(__dirname, "src/icons"),
                use: [
                    {
                        loader: "svg-url-loader",
                        options: {
                            limit: 1,
                            name: "[name].[ext]",
                            outputPath: "icons/"
                        }
                    },
                    {
                        loader: "image-webpack-loader",
                        options: {
                            svgo: svgoOpt
                        }
                    }
                ]
            }
        ]
    }
};

module.exports = (env, argv) => {
    if (argv.mode === "production") {
        config.devtool = "";
        config.plugins.push(new MinifyPlugin(minifyMinifyOpt, pluginMinifyOpt));
    } else {
        config.devtool = "eval-source-map";
        config.plugins.push(new webpack.HotModuleReplacementPlugin());
    }

    return config;
};
