module.exports = {
  extends: 'erb',
  plugins: ['@typescript-eslint'],
  rules: {
    // A temporary hack related to IDE not resolving correct package.json
    'import/no-extraneous-dependencies': 'off',
    'react/react-in-jsx-scope': 'off',
    'react/jsx-filename-extension': 'off',
    'import/extensions': 'off',
    'import/no-unresolved': 'off',
    'import/no-import-module-exports': 'off',
    'no-shadow': 'off',
    'no-unused-vars': 'off',

    // ===== 本專案放寬的規則 =====
    // 純風格 / 與 TypeScript 重複 / 對內部工具無實質意義者 → 關閉
    'no-use-before-define': 'off',
    'no-underscore-dangle': 'off',
    'no-plusplus': 'off',
    'no-restricted-syntax': 'off',
    'class-methods-use-this': 'off',
    camelcase: 'off',
    'default-case': 'off',
    'max-classes-per-file': 'off',
    'no-useless-constructor': 'off',
    'import/prefer-default-export': 'off',
    'import/no-named-as-default': 'off',
    'react/function-component-definition': 'off',
    'react/require-default-props': 'off',
    'react/prop-types': 'off',
    'react/jsx-props-no-spreading': 'off',
    'react/jsx-no-useless-fragment': 'off',
    'react/jsx-no-constructed-context-values': 'off',
    'react/no-array-index-key': 'off',
    'react/no-unstable-nested-components': 'off',
    'react/button-has-type': 'off',
    'jsx-a11y/label-has-associated-control': 'off',
    'jsx-a11y/no-noninteractive-element-interactions': 'off',
    'jsx-a11y/no-static-element-interactions': 'off',
    'jsx-a11y/click-events-have-key-events': 'off',

    // 有參考價值但大量既有違規 → 降為 warn（保留提示、不阻斷 CI）
    '@typescript-eslint/no-unused-vars': 'warn',
    '@typescript-eslint/no-shadow': 'warn',
    'react-hooks/exhaustive-deps': 'warn',
    'no-undef': 'warn',
    'no-useless-escape': 'warn',
    'no-restricted-globals': 'warn',
    'no-unused-expressions': 'warn',
    'no-empty': 'warn',
    'no-empty-function': 'warn',
    'no-throw-literal': 'warn',
    'no-return-await': 'warn',
    'no-await-in-loop': 'warn',
    'no-case-declarations': 'warn',
    'no-loop-func': 'warn',
    'no-prototype-builtins': 'warn',
    'default-param-last': 'warn',
    'prefer-promise-reject-errors': 'warn',
    'promise/always-return': 'warn',
    'promise/catch-or-return': 'warn',
    'promise/param-names': 'warn',
    'jest/no-conditional-expect': 'warn',
  },
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  settings: {
    'import/resolver': {
      // See https://github.com/benmosher/eslint-plugin-import/issues/1396#issuecomment-575727774 for line below
      node: {},
      webpack: {
        config: require.resolve('./.erb/configs/webpack.config.eslint.ts'),
        // {
        //   ...require.resolve('./.erb/configs/webpack.config.eslint.ts'),
        //   module: {
        //     ...require.resolve('./.erb/configs/webpack.config.eslint.ts').module,
        //     rules: [
        //       ...require.resolve('./.erb/configs/webpack.config.eslint.ts').module.rules,
        //       { test: /\.node$/, use: 'node-loader' },
        //     ],
        //   },
        // },
      },
      typescript: {},
    },
    'import/parsers': {
      '@typescript-eslint/parser': ['.ts', '.tsx'],
    },
  },
};
