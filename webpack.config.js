var path = require('path');

module.exports = {
  mode: 'development',
  optimization: {
      usedExports: true
  },
  entry: './src/main.js',
  devtool: 'inline-source-map',
  devServer: {
      contentBase: './dist'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'app.js'
  },
  module: {
      rules: [
          {
            test: /\.css$/,
            use: [
                'style-loader',
                'css-loader'
            ] 
          }
      ]
  }
};