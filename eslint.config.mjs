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
      ecmaVersion: 2018,
      sourceType: 'module',

      parserOptions: {
        ecmaFeatures: {
          legacyDecorators: true,
        },
        requireConfigFile: false,
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
      'qunit/resolve-async': 0,
      'ember/no-test-module-for': 0,
      'ember/no-classic-classes': 0,
    },
  },

  {
    files: [
      './eslint.config.js',
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
      'node/no-unpublished-require': 'off',
    }),
  },

  {
    files: ['tests/**/*-test.{js,ts}'],
    extends: compat.extends('plugin:qunit/recommended'),

    rules: {
      'qunit/resolve-async': 0,
      'qunit/no-assert-logical-expression': 0,
      'qunit/no-ok-equality': 0,
      'qunit/no-negated-ok': 0,
    },
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
