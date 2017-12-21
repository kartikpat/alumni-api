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

	function validate(req, res, next){
		if(!(state == "subscribe" || state =="unsubscribe"))
			return settings.unprocessableEntity(res);
		if(! (req.body.id  && req.body.templateID && req.body.id.split(',').length<1))
			return settings.unprocessableEntity(res);
		return next()
	}

	async function isAuthorised(req, res, next){
		var companyID = req.params.companyID;
		var serviceID = req.params.serviceID;
		try {
			var rows = await checkServiceAccess(companyID, serviceID);
			if(rows.length<1)
				return settings.badRequest(res);
			return next();
		}catch(err){
			cprint(err,1);
			return settings.serviceError(res);
		}
	}


	app.post('/company/:companyID/service/:serviceID/:state', isAuthorised, async function(req, res){
		var companyID = req.params.companyID,
			serviceID = req.params.serviceID;
		var id = req.body.id,
			templateID = req.body.templateID;
		var state = req.params.state;
		var timestamp = Date.now();
		try {
			idArray = id.split(',');
			var queryArray = [];
			idArray.forEach(function(anItem){
				var temp = [
					anItem,
					serviceID,
					(state =="subscribe")? 'active' : 'inactive'
				];
				queryArray.push(temp);
			})
			await subscribe(queryArray)
			res.json({
				status: "success"
			});
			if(serviceID ==1){
				var qArray = [];
				queryArray.forEach(function(anItem){
					qArray.push([
						anItem[0], 
						templateID,
						anItem[2],
						timestamp
						])
				})
				populateQ(qArray);
			}
			return
		}
		catch(err){
			cprint(err,1);
			return settings.serviceError(res);
		}
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

	function checkServiceAccess(companyID, serviceID){
		var query = 'Select * from ServicesAccess where ServiceId = ? and CompanyId = ? and Status= ?';
		var queryArray = [ serviceID, companyID, 'active'];
		return settings.dbConnection().then(function(connecting){
			return settings.dbCall(connecting, query, queryArray);
		})
	}

	function fetchAlumnus(entryID){
		var query = "Select am.FirstName, am.MiddleName, am.LastName, am.Email, am.AlumnusId, am.CompanyId, am.Dob, am.DateOfBirth, cm.Name as CompanyName from AlumnusMaster am inner join CompanyMaster cm on am.companyId = cm.Id where am.AlumnusId = ?"
		var queryArray = [entryID];
		return settings.dbConnection().then(function(connecting){
			return settings.dbCall(connecting, query, queryArray);
		})
	}

	function subscribe(queryArray){
		var query = "Insert into ServiceSubscription (AlumnusId, ServiceId, Status) values ? on duplicate key update Status = values(Status)";
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, [queryArray]);
		})
	}

	function subscribeBirthday(queryArray){
		var query = "Insert into ServiceBirthdaySubscription ( AlumnusId, TemplateId, Status, UpdatedAt ) values ? on duplicate key update TemplateId = values(TemplateId), Status = values(Status), UpdatedAt = values(UpdatedAt)";
		var queryArray = [ queryArray];
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		})
	}
	settings.formatDate_yyyymmdd = formatDate_yyyymmdd;
}