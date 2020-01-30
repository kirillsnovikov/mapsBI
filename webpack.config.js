const webpack = require('webpack');
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const paths = {
  src: path.resolve(__dirname, 'src'),
  dist: path.resolve(__dirname, 'dist')
};

module.exports = {
  context: paths.src, // базовая директория для точек входа и загрузчиков
  entry: {
    maps: ['@babel/polyfill', './index'] // точка входа в приложение, наш src/index.ts файл, названием итогового бандла будет имя свойства - app
    // drsk: ['@babel/polyfill', './drsk'], // точка входа в приложение, наш src/index.ts файл, названием итогового бандла будет имя свойства - app
    // drsk_dolya: ['@babel/polyfill', './drsk_dolya'], // точка входа в приложение, наш src/index.ts файл, названием итогового бандла будет имя свойства - app
    // mos_regobl: ['@babel/polyfill', './mos_regobl'], // точка входа в приложение, наш src/index.ts файл, названием итогового бандла будет имя свойства - app
    // mos_regobl_dolya: ['@babel/polyfill', './mos_regobl_dolya'] // точка входа в приложение, наш src/index.ts файл, названием итогового бандла будет имя свойства - app
  },
  output: {
    path: paths.dist, // путь для результатов сборки
    filename: '[name].bundle.js', // название итогового бандла, получится dist/app.bundle.js
    library: 'myLib',
    libraryTarget: 'var'
  },
  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: 'babel-loader'
        }
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: 'index.html'
      // filename: "index.html",
      // title: "maps test"
    })
    // new webpack.optimize.UglifyJsPlugin({
    //   sourceMap: true
    // })
  ],
  devServer: {
    contentBase: path.dist,
    compress: true,
    port: 9000
  }
};
