var sendMessage = require('../../Q/sqs/q.js');
module.exports = function(settings){
	var app = settings.app;
	var mode = settings.mode;
	var config = settings.config;
	var env = settings.env;
	var cprint = settings.cprint;

	app.post('/company/:companyID/service/:serviceID/subscribe', function(req, res){
		var companyID = req.params.companyID,
			serviceID = req.params.serviceID;
		var id = req.body.id || null, // [Array of alumnus ids]
			templateID = req.body.templateID || null; // integer;

		var timestamp = Date.now();

		if(! (id && companyID && templateID ))
			return settings.unprocessableEntity(res);

		try {
			var temp = id.split(',');
		}
		catch(e){
			cprint(e);
			return settings.unprocessableEntity(res)
		}

		idArray = id.split(',');
		var queryArray = [];
		idArray.forEach(function(anItem){
			var temp = [
				anItem,
				templateID,
				"active",
				timestamp
			];
			queryArray.push(temp);
		})
		subscribe(queryArray)
		.then(function(rows){
			res.json({
				status: "success"
			});
			populateQ(queryArray);
		})
		.catch(function(err){
			cprint(err,1);
			return settings.serviceError(res);
		})
	})

	function populateQ(anArray){
		anArray.forEach(async function(aRow){
			await fetchAlumnus(aRow[0])
					.then(function(rows){
						var message = {
							event: 'subscribe',
							id: rows[0]["AlumnusId"],
							email: rows[0]["Email"],
							payload: {
								name: 'testing',
								company: 'Abc private limited'
							},
							templateId: aRow[1] ,
							groupId: rows[0]["CompanyId"],
							dob: rows[0]["Dob"],
							timestamp: aRow[3]
						}
						sendMessage(message);
					})
		})
	}

	function fetchAlumnus(entryID){
		var query = "Select FirstName, MiddleName, LastName, Email, AlumnusId, CompanyId, Dob from AlumnusMaster where AlumnusId = ?"
		var queryArray = [entryID];
		return settings.dbConnection().then(function(connecting){
			return settings.dbCall(connecting, query, queryArray);
		})
	}

	function subscribe(queryArray){
		var query = "Insert into ServiceBirthdaySubscription ( AlumnusId, TemplateId, Status, UpdatedAt ) values ?";
		var queryArray = [ queryArray];
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		})
	}
}