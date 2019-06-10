// webpack.config.js
module.exports = {
  	mode: 'development',
  	entry: './src/index.js',
  	output: {
    	filename: 'main.js',
    	publicPath: 'dist'
  	},
   	module: {
   		rules: [
   		{
   			test: /\.glsl$/,
   		  	use: [
		    	{
		        	loader: 'webpack-glsl-loader'
		    	}
	    	]
	  	}
	  	]
	},
	devServer: {
		// port: 8050,
		// contentBase: path.resolve(__dirname, ''),
		// //watchContentBase: true,
	 } 
};