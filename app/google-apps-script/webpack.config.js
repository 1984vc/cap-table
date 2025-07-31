const GasPlugin = require("gas-webpack-plugin");
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const webpack = require("webpack");
const path = require("path");

const entry = "./build/google-apps-script/src/index.js";
const { version } = require("./package.json");

module.exports = {
  // we always use dev mode because bundle size is unimportant - code runs server-side
  mode: "development",
  context: __dirname,
  entry,
  output: {
    path: __dirname,
    filename: "Code.js",
  },
  resolve: {
    extensions: ['.js'], // Add more as needed
    plugins: [new TsconfigPathsPlugin({ })],
    alias: {
      '@library': path.resolve(__dirname, 'build/src/library') // Map alias to compiled path
    }
  },
  plugins: [
    new GasPlugin({
      autoGlobalExportsFiles: [entry],
    }),
    new webpack.DefinePlugin({
      "global.process.env.VERSION": JSON.stringify(version),
    }),
  ],
  devtool: false,
};
