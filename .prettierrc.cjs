/** @type {import("prettier").Config} */

module.exports = {
  ...require('@nivalis/prettier-config'),
  'tailwindFunctions': ['clsx', 'cn'],
  'tailwindConfig': './tailwind.config.ts',
  'tailwindStylesheet': './src/styles/globals.css',
  plugins: [
    require.resolve('prettier-plugin-tailwindcss'),
    require.resolve('prettier-oxc-parser'),
  ],
};
