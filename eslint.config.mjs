import eslintConfigNext from 'eslint-config-next';

const [nextConfig, typescriptConfig, ...restConfigs] = eslintConfigNext;

export default [
  {
    ...nextConfig,
    rules: {
      ...nextConfig.rules,
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
    ...typescriptConfig,
    rules: {
      ...(typescriptConfig.rules ?? {}),
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrors: 'none',
        },
      ],
    },
  },
  ...restConfigs,
];
