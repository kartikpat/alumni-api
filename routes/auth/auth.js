var jwt = require("jwt");

module.exports = function(settings){
	var app = settings.app;
	var mode = settings.mode;
	var config = settings.config;
	var env = settings.env;
	var cprint = settings.cprint;

	app.post("/company/:companyID/authenticate", function(req, res){
		var username = req.body.username || null,
			password = req.body.password || null;
		if(!( username && password ))
			return settings.unprocessableEntity(res);
		validate(username, password)
		.then(function(rows){
			if(rows.length<1)
				return new Error("")
		})
		.catch(function(err){
			cprint(err,1);
			
		})
	});

	function validate(username, password){
		var query = "Select id, companyID, role from AccessMaster where Username = ? and Password = ? and Status = 'active'";
		var queryArray = [username, password];
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		})
	}

}