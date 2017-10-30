var sendMessage = require('../../Q/sqs/q.js');
function formatDate_yyyymmdd(date, isTime) {
		var localDateString = new Date(date).toLocaleString('en-IN', {timeZone:  'Asia/Kolkata'});
	    var d = new Date(localDateString),
	        month = '' + (d.getMonth() + 1),
	        day = '' + d.getDate(),
	        year = '' + d.getFullYear(),
	        hour = '' + d.getHours(),
	        minute = '' + d.getMinutes(),
	        second = '' + d.getSeconds();


	    if (month.length < 2) month = '0' + month;
	    if (day.length < 2) day = '0' + day;
	    if (hour.length<2) hour = '0'+ hour;
	    if (minute.length <2) minute = '0' + minute;
	    if (second.length <2 ) second = '0' + second;

	    if(isTime){
	    	return [year, month, day].join('-') + " " + [hour, minute, second].join(":");
	    }
	    return [year, month, day].join('-');
	}
module.exports = function(settings){
	var app = settings.app;
	var mode = settings.mode;
	var config = settings.config;
	var env = settings.env;
	var cprint = settings.cprint;

	app.post('/company/:companyID/service/:serviceID/:state', function(req, res){
		var companyID = req.params.companyID,
			serviceID = req.params.serviceID;
		var id = req.body.id || null, // [Array of alumnus ids]
			templateID = req.body.templateID || null; // integer;

		var state = req.params.state;
		if(!(state == "subscribe" || state =="unsubscribe"))
			return settings.unprocessableEntity(res);

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
				(state =="subscribe")? 'active' : 'inactive',
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
							event: (aRow[2]=='active')? 'subscribe' : ' unsubscribe' ,
							id: rows[0]["AlumnusId"],
							email: rows[0]["Email"],
							payload: {
								name: [ rows[0]["FirstName"], rows[0]["MiddleName"], rows[0]["LastName"] ].join(" "),
								company: rows[0]["CompanyName"]
							},
							templateId: aRow[1] ,
							groupId: rows[0]["CompanyId"],
							dob: formatDate_yyyymmdd(rows[0]["DateOfBirth"]),
							timestamp: aRow[3]
						}
						cprint(message)
						sendMessage(message);
					})
		})
	}

	function fetchAlumnus(entryID){
		var query = "Select FirstName, MiddleName, LastName, Email, AlumnusId, CompanyId, Dob, DateOfBirth from AlumnusMaster where AlumnusId = ?"
		var queryArray = [entryID];
		return settings.dbConnection().then(function(connecting){
			return settings.dbCall(connecting, query, queryArray);
		})
	}

	function subscribe(queryArray){
		var query = "Insert into ServiceBirthdaySubscription ( AlumnusId, TemplateId, Status, UpdatedAt ) values ? on duplicate key update TemplateId = values(TemplateId), Status = values(Status), UpdatedAt = values(UpdatedAt)";
		var queryArray = [ queryArray];
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		})
	}
}