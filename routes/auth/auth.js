
var jwt = require("jsonwebtoken");
var sampleToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6InRlc3QiLCJpZCI6MSwiY29tcGFueUlEIjoxLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE1MDg5MTI5MTAsImV4cCI6MTUwODkxMjkxNX0.lTo0LFJs9TAod_mtMqaJ4Vd41K77sGgqCl6ZsZql4fI";

var crypto = require('crypto');

function getHash(aString){
	if(!aString)
		return "";
	return crypto.createHash('md5').update(aString).digest('hex');
}

module.exports = function(settings){
	var app = settings.app;
	var mode = settings.mode;
	var config = settings.config;
	var env = settings.env;
	var cprint = settings.cprint;


	app.post("/company/login", function(req, res){
		var email = req.body.email || null,
			password = req.body.password || null;
		if(!( email && password ))
			return settings.unprocessableEntity(res);
		validate(email, password)
		.then(function(rows){
			if(rows.length<1)
				return settings.unAuthorised(res);
			var id = rows[0]["Id"],
				companyID = rows[0]["CompanyId"],
				role = rows[0]["AccessLevel"];
			var payload = {
				emai: email,
				id: id,
				companyID: companyID,
				role: role
			}
			var expiresIn = 60*60;
			jwt.sign(payload, "somesupersecret",{ expiresIn: expiresIn }, function(err, token){
				if(err){
					cprint(err,1);
					return settings.serviceError(res);
				}
				var key = token;

				settings.setKey(key, expiresIn).then(function(reply) {
					if(reply) {
						return res.json({
							status: "success",
							data: payload,
							token: token
						});
					}
				})
			})

		})
		.catch(function(err){
			cprint(err,1);
			return settings.serviceError(res);
		})
	});

	function validate(email, password){
		password = getHash(password);
		var query = "Select Id, CompanyId, AccessLevel from CompanyAccess where Email = ? and Password = ? and Status = 'active'";
		var queryArray = [email, password];
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		})
	}

}
