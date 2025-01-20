import path from 'path';
import { fileURLToPath } from 'url';

import HtmlWebpackPlugin from 'html-webpack-plugin';
import CopyPlugin from 'copy-webpack-plugin';
import webpack from 'webpack';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
    mode: 'development',
    entry: './src/app.js',
    output: {
        filename: 'app.js',
        path: path.resolve(__dirname, 'dist'),
    },
    devServer: {
        static: { directory: path.join(__dirname, 'dist'), },
        compress: true,
        port: 9000,
        historyApiFallback: true,
    },
    plugins: [
        new HtmlWebpackPlugin({ template: "./index.html" }),
        new CopyPlugin({
            patterns: [
                { from: "./src/markups", to: "templates" },
                { from: "styles", to: "styles" },
                { from: "images", to: "images" },
                // JS библиотеки
                {
                    from: "node_modules/jquery/dist/jquery.min.js",
                    to: "scripts/lib/jquery-3.6.4.min.js" // Изменили имя файла согласно старому пути
                },
                {
                    from: "node_modules/@popperjs/core/dist/umd/popper.js",
                    to: "scripts/lib/popper.js"
                },
                {
                    from: "node_modules/bootstrap/dist/js/bootstrap.min.js",
                    to: "scripts/lib/bootstrap.min.js"
                },
                {
                    from: "node_modules/bootstrap-datepicker/dist/js/bootstrap-datepicker.min.js",
                    to: "scripts/lib/bootstrap-datepicker.min.js"
                },
                {
                    from: "node_modules/bootstrap-datepicker/dist/locales/bootstrap-datepicker.ru.min.js",
                    to: "scripts/lib/bootstrap-datepicker.ru.min.js" // Добавили русскую локализацию
                },
                {
                    from: "node_modules/chart.js/dist/chart.umd.js",
                    to: "scripts/lib/chart.js"
                },
                // CSS файлы
                {
                    from: "node_modules/bootstrap/dist/css/bootstrap.min.css",
                    to: "styles/bootstrap.min.css"
                },
                {
                    from: "node_modules/bootstrap-datepicker/dist/css/bootstrap-datepicker.min.css",
                    to: "styles/bootstrap-datepicker.min.css"
                }
            ],
        }),
        new webpack.ProvidePlugin({
            $: 'jquery',
            jQuery: 'jquery',
            bootstrap: 'bootstrap'
        })
    ],
};