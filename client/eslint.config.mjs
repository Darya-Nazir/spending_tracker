import globals from "globals";
import pluginJs from "@eslint/js";
import importPlugin from "eslint-plugin-import";

/** @type {import('eslint').Linter.Config[]} */
export default [
    pluginJs.configs.recommended,
    {
        plugins: { import: importPlugin },
        settings: { "import/resolver": { node: true } }
    },
    {
        // Ignore rules
        ignores: [
            '**/node_modules/**',
            '**/dist/**',
            'dist/',
            '**/*.min.js',
            'eslint.config.mjs',
        ]
    },
    {
        // JS files
        files: ['**/*.js', '**/*.mjs'],  // общая конфигурация для остальных файлов
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.jquery,
                bootstrap: 'readonly',
                Chart: 'readonly',
            },
            sourceType: 'module',
        }
    },
    {
        // Test files
        files: [
            '**/*.test.js', '**/*.spec.js', '**/__tests__/**/*.js',
            '**/setup.test.js', '**/setup.js'
        ],
        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.jest,
            },
        },
    },
    {
        // Webpack config
        files: ['webpack.config.js'],
        languageOptions: {
            globals: {
                ...globals.node,
            },
            sourceType: 'module'
        }
    },
    {
        rules: {
            "object-curly-spacing": ["error", "always"],
            "import/order": ["error", {
                groups: [
                    "builtin",
                    "external",
                    "internal",
                    ["parent", "sibling", "index"]
                ],
                "newlines-between": "always",
                alphabetize: {
                    order: 'asc',
                    caseInsensitive: true
                }
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
];

