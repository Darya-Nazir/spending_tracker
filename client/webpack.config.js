const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
    mode: 'development',
    entry: './src/app.js',
    output: {
        filename: 'app.js',
        path: path.resolve(__dirname, 'dist'),
    },
    devServer: {
        static: {
            directory: path.join(__dirname, 'styles'),
        },
        compress: true,
        port: 9000,
        historyApiFallback: true,
    },
    plugins: [new HtmlWebpackPlugin({
            template: "./index.html"
        }
    ),
        new CopyPlugin({
            patterns: [
                {from: "./src/markups", to: "templates"},
                {from: "styles", to: "styles"},
                {from: "images", to: "images"},
            ],
        }),
    ],
};