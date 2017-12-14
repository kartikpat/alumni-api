var request = require('request')
var dropbox = require('../../workers/ingest/upload-images-dropbox.js')['init'];
module.exports = function(settings){
	var app = settings.app;
	var mode = settings.mode;
	var config = settings.config;
	var env = settings.env;
	var cprint = settings.cprint;

	function validate(req, res, next){
		var type = req.body.type || null,
			url = req.body.url || null;
		if(!(type && url))
			return settings.unprocessableEntity(res);
		if(['dropbox'].indexOf(type) ==-1)
			return settings.unprocessableEntity(res, 'invalid service. Only dropbox integration available');
		return next();
	}

	app.post('/company/:companyID/upload/profile', validate, function(req, res){
		var companyID = req.params.companyID;
		var type = req.body.type,
			url = req.body.url;
		request({uri: config['worker']['baseUrl']+'/initiate/profile/helper', method: 'POST', form: {
			type : type,
			url: url
		}}, function(err, response, body){
				if(err){
					cprint(err,1);
					return settings.serviceError(res);
				}
				cprint(body);
				return res.json({
					status: 'success',
					data: body
				});
		})	
	})

	app.post("/initiate/profile/helper", function(req, res){
		var companyID = req.params.companyID;
		var type = req.body.type,
			url = req.body.url;
		if(!(type && url))
			return settings.unprocessableEntity(res);
		res.json({
			status: 'success'
		})
		if(type =='dropbox')
			dropbox(url)
	})
}
