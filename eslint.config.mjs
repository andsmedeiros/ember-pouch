'use strict';

import { defineConfig, globalIgnores } from 'eslint/config';
import babelParser from '@babel/eslint-parser';
import ember from 'eslint-plugin-ember';
import globals from 'globals';
import node from 'eslint-plugin-n';
import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';
import { fileURLToPath } from 'node:url';

const workingDirectory = fileURLToPath(new URL('.', import.meta.url));

const compat = new FlatCompat({
  baseDirectory: workingDirectory,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default defineConfig([
  {
    languageOptions: {
      parser: babelParser,
      ecmaVersion: 'latest',
      sourceType: 'module',

      parserOptions: {
        requireConfigFile: false,
        babelOptions: {
          plugins: [
            [
              '@babel/plugin-proposal-decorators',
              {
                version: '2018-09',
                decoratorsBeforeExport: true,
              },
            ],
          ],
        },
      },

      globals: {
        ...globals.browser,
      },
    },

    plugins: {
      ember,
    },

    extends: compat.extends(
      'eslint:recommended',
      'plugin:ember/recommended',
      'plugin:prettier/recommended',
    ),

    rules: {
      'no-unused-vars': [
        'error',
        {
          varsIgnorePattern: '^_',
          argsIgnorePattern: '^_',
        },
      ],
    },
  },

  {
    files: [
      './eslint.config.mjs',
      './.prettierrc.js',
      './.template-lintrc.js',
      './ember-cli-build.js',
      './index.js',
      './testem.js',
      './blueprints/*/index.js',
      './config/**/*.js',
      './tests/dummy/config/**/*.js',
    ],

    languageOptions: {
      sourceType: 'script',
      parserOptions: {},

      globals: {
        ...Object.fromEntries(
          Object.entries(globals.browser).map(([key]) => [key, 'off']),
        ),
        ...globals.node,
      },
    },

    plugins: {
      node,
    },

    extends: compat.extends('plugin:n/recommended'),

    rules: Object.assign({}, node.configs.recommended.rules, {
      'n/no-unpublished-require': 'off',
      'n/no-unpublished-import': 'off',
    }),
  },

  {
    files: ['tests/**/*-test.{js,ts}'],
    extends: compat.extends('plugin:qunit/recommended'),
  },

  globalIgnores([
    'blueprints/*/files/',
    'vendor/',
    'dist/',
    'tmp/',
    'bower_components/',
    'node_modules/',
    'coverage/',
    '!**/.*',
    '**/.*/',
    '**/.eslintcache',
    '.node_modules.ember-try/',
    'bower.json.ember-try',
    'package.json.ember-try',
  ]),
]);
