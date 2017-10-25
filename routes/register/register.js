module.exports = function(settings){
	var app = settings.app;
	var mode = settings.mode;
	var config = settings.config;
	var env = settings.env;
	var cprint = settings.cprint;

	app.post("/company/:companyID/register", function(req, res){
		var companyID = req.params.companyID;
		var username = req.body.username || null,
			password = req.body.password || null,
			role = req.body.role || null;
		if(!(username && password && role))
			return settings.unprocessableEntity(res);

		registerAccess(companyID, username, role, password)
		.then(function(rows){
			return res.json({
				status: "success"
			});
		})
		.catch(function(err){
			cprint(err,1);
			return settings.serviceError(res);
		})
	})

	function registerAccess(companyID, username, role, password){
		var query = "Insert into AccessMaster (CompanyId, Username, Role, Password) values (?, ?, ?, ?)";
		var queryArray = [companyID, username, role, companyID];
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		})
	}
}