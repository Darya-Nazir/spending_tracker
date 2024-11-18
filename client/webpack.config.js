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
    plugins: [new HtmlWebpackPlugin({
        template: "./index.html"
        }
    ),
        new CopyPlugin({
            patterns: [
                { from: "./src/markups", to: "templates" },
            ],
        }),
    ],
};