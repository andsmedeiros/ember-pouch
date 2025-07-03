import defaultConfig from '@ijlee2-frontend-configs/eslint-config-ember/v2-addon';
import node from 'eslint-plugin-n';

export default [
  ...defaultConfig,
  {
    ignores: [
      'blueprints/*/files/',
      'dist/'
    ],
  },

  {
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
    files: [ './blueprints/*/index.js' ],
    languageOptions: {
      sourceType: 'commonjs',
    },
    ...node.configs['flat/recommended-script']
  },
]
