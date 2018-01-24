var crypto = require('crypto');
var sendMessage = require('../../Q/sqs/q.js');
var key = 'real secret keys should be long and random';

// Create an encryptor:
var encryptor = require('simple-encryptor')(key);




module.exports = function(settings){

	var app = settings.app;
	var mode = settings.mode;
	var config = settings.config;
	var env = settings.env;
	var cprint = settings.cprint;
	var Base64 = settings.Base64;

	function validate(req, res, next){
		if(!req.query.token)
			return settings.unprocessableEntity(res);
		next();
	}

	app.get("/company/alumni/unsubscribe", validate, async function(req, res){

        var token = req.query.token;

        try {

			var decryptedToken = Base64.decode(token)
			decryptedToken = JSON.parse(decryptedToken)
			var email = decryptedToken["email"];
			var companyID = decryptedToken["cid"];
			var serviceId = decryptedToken["sid"];

            var alumniDetails = await fetchAlumnus(email, companyID)
    		if(alumniDetails.length < 1)
    			throw new Error("Alumni doesn't exist!");

            var alumnusID = alumniDetails[0]["AlumnusId"];

            await unsubscribe(serviceId, alumnusID);
            res.json({
                status: "success",
                serviceId: serviceId,
                message: "unsubscribed successfully"
            });
			if(serviceId == 1) {
				var qObject = {
					alumnusId: alumnusID,
					templateId: 1,
					timestamp: Date.now(),
					companyId: companyID,
					email: email
				};
				populateQ(qObject);
			}
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

	function fetchCompanyName(companyID){
		var query = 'Select Name from CompanyMaster where Id = ? and Status= ?';
		var queryArray = [ companyID, 'active'];
		return settings.dbConnection().then(function(connecting){
			return settings.dbCall(connecting, query, queryArray);
		})
	}

	function populateQ(anObj){
		var message = {
			event: 'unsubscribe',
			id: anObj["alumnusId"],
			email: anObj["email"],
			payload: {},
			templateId: anObj["templateId"] ,
			groupId: anObj["companyId"],
			timestamp: anObj["timestamp"]
		}
		cprint(message)
		sendMessage(message);
	}

    function unsubscribe(serviceId, alumnusId){
        var query = "Update ServiceSubscription set Status = ? where ServiceId = ? and AlumnusId = ?";
		var queryArray = ['unsubscribed', serviceId, alumnusId];
		return settings.dbConnection().then(function(connecting){
			return settings.dbCall(connecting, query, queryArray);
		})
	}

    function fetchService(serviceName){
		var query = "Select Id from ServicesMaster where Name = ?"
		var queryArray = [serviceName];
		return settings.dbConnection().then(function(connecting){
			return settings.dbCall(connecting, query, queryArray);
		})
	}

    function fetchAlumnus(email, companyID){
		var query = "Select AlumnusId,firstName,middleName,lastName from AlumnusMaster where Email = ? and CompanyId = ?"
		var queryArray = [email, companyID];
		return settings.dbConnection().then(function(connecting){
			return settings.dbCall(connecting, query, queryArray);
		})
	}
}
