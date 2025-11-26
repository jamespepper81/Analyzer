import eslintConfigNext from 'eslint-config-next';

const [nextConfig, typescriptConfig, ...restConfigs] = eslintConfigNext;

export default [
  {
    ...nextConfig,
    rules: {
      ...nextConfig.rules,
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/purity': 'off',
      'react/no-unescaped-entities': 'off',
    },
  },
  {
    ...typescriptConfig,
    rules: {
      ...(typescriptConfig.rules ?? {}),
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'off',
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
