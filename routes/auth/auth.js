var jwt = require("jsonwebtoken");
var sampleToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6InRlc3QiLCJpZCI6MSwiY29tcGFueUlEIjoxLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE1MDg5MTI0NDl9.TG0hBYQiEGJl1hnrblCKiLJs-kgkZ5e_c-RgCjJFnGs";
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
				return settings.unAuthorised(res);
			var id = rows[0]["Id"],
				companyID = rows[0]["CompanyId"],
				role = rows[0]["Role"];
			var payload = {
				username: username,
				id: id,
				companyID: companyID,
				role: role
			}
			jwt.sign(payload, "somesupersecret", function(err, token){
				if(err)
					cprint(err)
				res.json({
					status: "success",
					token: token
				});
				return
			})

		})
		.catch(function(err){
			cprint(err,1);
			return settings.serviceError(res);
		})
	});

	function validate(username, password){
		var query = "Select Id, CompanyId, Role from AccessMaster where Username = ? and Password = ? and Status = 'active'";
		var queryArray = [username, password];
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		})
	}

}