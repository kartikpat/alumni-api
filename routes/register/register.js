module.exports = function(settings){
	var app = settings.app;
	var mode = settings.mode;
	var config = settings.config;
	var env = settings.env;
	var cprint = settings.cprint;

	app.post("/company/:companyID/register", function(req, res){
		var companyID = req.params.companyID;
		var email = req.body.email || null,
			name = req.body.name || null,
			password = req.body.password || null,
			accessLevel = req.body.accessLevel || null;
		if(!(email && password && accessLevel && name))
			return settings.unprocessableEntity(res);

		registerAccess(companyID, name, email, accessLevel, password)
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

	app.post("/company/add", function(req, res){
		var name = req.body.name || null;
		if(!name)
			return settings.unprocessableEntity(res);
		addCompany(name)
		.then(function(rows){
			var insertID = rows.insertId;
			return res.json({
				status: 'success',
				data: insertID
			})
		})
		.catch(function(err){
			cprint(err,1);
			return settings.serviceError(res);
		})

	})

	function registerAccess(companyID, name, email, accessLevel, password){
		var query = "Insert into CompanyAccess (CompanyId, Name, Email, AccessLevel, Password, Status) values (?, ?, ?, ?, ?, ?)";
		var queryArray = [companyID, name, email, accessLevel, password, 'active'];
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		})
	}

	function addCompany(name){
		var query = "Insert into CompanyMaster (Name, Status) values (?, ?)";
		var queryArray = [ name, 'active']
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		})
	}
}