var crypto = require('crypto');

module.exports = function(settings){
	var app = settings.app;
	var mode = settings.mode;
	var config = settings.config;
	var env = settings.env;
	var cprint = settings.cprint;

	function validate(req, res, next){
		if(!req.query.token )
			return settings.unprocessableEntity(res);
		return next();
	}

	app.get("/company/alumni/unsubscribe", validate, async function(req, res){
        var token = req.query.token;
        var decryptedToken = decrypt(token);
        try {
            var alumniDetails = await fetchAlumnus(email, companyID)
    		if(alumniDetails.length < 1)
    			throw new Error("Alumni doesn't exist!");

            var alumnusID = alumniDetails[0]["AlumnusId"]
    		var serviceRows = await fetchService(serviceName);
        }
        catch(err) {
            cprint(err,1);
            if(err.message == "Alumni doesn't exist!") {
				return res.json({
					status: "fail",
					message: err.message
				})
			}
			return settings.serviceError(res);
        }

    })


    function fetchService(serviceName){
		var query = "Select Id from ServicesMaster where Name = ?"
		var queryArray = [serviceName];
		return settings.dbConnection().then(function(connecting){
			return settings.dbCall(connecting, query, queryArray);
		})
	}

    function fetchAlumnus(email, companyID){
		var query = "Select AlumnusId from AlumnusMaster where Email = ? and CompanyId = ?"
		var queryArray = [email, companyID];
		return settings.dbConnection().then(function(connecting){
			return settings.dbCall(connecting, query, queryArray);
		})
	}

    function decrypt(text){
        var decipher = crypto.createDecipher('aes-256-cbc','d6F3Efeq')
        var dec = decipher.update(text,'hex','utf8')
        dec += decipher.final('utf8');
        return dec;
    }

}
