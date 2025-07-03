import defaultConfig from '@ijlee2-frontend-configs/eslint-config-ember/v2-app';

export default [
  ...defaultConfig,
  {
    ignores: [
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
]
