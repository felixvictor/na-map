// https://github.com/shakacode/react-webpack-rails-tutorial/blob/master/client%2Fwebpack.client.base.config.js

const libraryName = "na-topo";

const webpack = require("webpack");
const ExtractTextPlugin = require("extract-text-webpack-plugin");
const MinifyPlugin = require("babel-minify-webpack-plugin");
const path = require("path");
const PACKAGE = require("./package.json");

const babelOpt = {
    cacheDirectory: true,
    presets: [
        [
            "env",
            {
                exclude: ["transform-es2015-typeof-symbol"],
                loose: true,
                modules: false,
                targets: {
                    browsers: PACKAGE.browserslist
                }
            }
        ],
        ["minify"]
    ]
};

const cssOpt = {
    sourceMap: true
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

let config = {
    context: path.resolve(__dirname, "src"),

    entry: [path.resolve(__dirname, PACKAGE.main), path.resolve(__dirname, PACKAGE.sass)],

    output: {
        path: __dirname + "/public/js",
        filename: libraryName + ".min.js"
    },

    plugins: [
        new ExtractTextPlugin({
            filename: "../css/" + libraryName + ".min.css",
            allChunks: true
        }),
        new webpack.ProvidePlugin({
            $: "jquery",
            jQuery: "jquery",
            "window.jQuery": "jquery"
        })
    ],

    stats: "normal",

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
                use: ExtractTextPlugin.extract({
                    fallback: "style-loader",
                    use: [
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
                })
            }
        ]
    }
};

if ("prod" === process.env.NODE_ENV) {
    config.devtool = "";
    config.plugins.push(
        new MinifyPlugin({
            mangle: { topLevel: true },
            removeDebugger: true
        })
    );
} else {
    config.devtool = "eval-source-map";
    config.plugins.push(new webpack.HotModuleReplacementPlugin(), new webpack.NoEmitOnErrorsPlugin());
}

module.exports = config;
