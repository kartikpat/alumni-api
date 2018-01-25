var request = require('request');
module.exports = function(settings){
	var app = settings.app;
	var mode = settings.mode;
	var config = settings.config;
	var env = settings.env;
	var cprint = settings.cprint;

	app.get("/image/load", function(req, res){
		var url =  req.query.url || null;
		if(!url)
			return unprocessableEntity(res);
		var options = { method: 'GET',
  			url: url
  		}
		request(options).pipe(res);
	})
}
