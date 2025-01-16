import globals from "globals";
import pluginJs from "@eslint/js";
import importPlugin from "eslint-plugin-import";

/** @type {import('eslint').Linter.Config[]} */
export default [
    {
        ignores: [
            '**/src/lib/**',    // игнорируем библиотеки
            '**/node_modules/**',
            '**/dist/**',       // добавляем игнорирование всего в dist
            'dist/',
            '**/*.min.js',
            'eslint.config.mjs'
        ]
    },
    {
        files: ['webpack.config.js'],     // конфиг для webpack
        languageOptions: {
            globals: {
                ...globals.node
            },
            sourceType: 'commonjs'
        }
    },
    {
        files: ['**/*.js', '**/*.mjs'],  // общая конфигурация для остальных файлов
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.jquery,
            },
        }
    },
    pluginJs.configs.recommended,
    {
        rules: {
            "object-curly-spacing": ["error", "always"],
            "import/order": ["error", {
                groups: ["builtin", "external", "internal"],
                "newlines-between": "always"
            }],
            "keyword-spacing": ["error", {
                before: true,
                after: true
            }],
            "comma-spacing": ["error", {
                before: false,
                after: true
            }],
            "object-curly-newline": ["error", { multiline: true }]
        }
    },
    {
        plugins: { import: importPlugin },
        settings: { "import/resolver": { node: true } }
    }
];

