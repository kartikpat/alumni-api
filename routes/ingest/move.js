module.exports = function(settings){
	var app = settings.app;
	var mode = settings.mode;
	var config = settings.config;
	var env = settings.env;
	var cprint = settings.cprint;

	function validate(req, res, next){
		var alumni =  req.body.alumni || null;
		if(!( alumni && alumni.split(',').length>0)){
			return settings.unprocessableEntity(res);
		}
		return next();
	}

	app.post("/company/:companyID/group/:groupName/move/:toGroupName",validate, async function(req, res){
		var groupName = req.params.groupName;
		var toGroupName = req.params.toGroupName;
		var alumniArray = req.body.alumni.split(',');
		var alumni = req.body.alumni;
		var companyID = req.params.companyID;
		try{
			await unMapGroup(alumniArray, companyID, groupName);
			var queryArray = [];
			alumniArray.forEach(function(anID){
				queryArray.push([ anID, toGroupName, companyID, 'active']);
			})
			await mapAlumniDepartment(queryArray);
			return res.json({
				status: "success"
			});
		}
		catch(err){
			cprint(err,1);
			return settings.serviceError(res);
		}
	});

	function unMapGroup(alumnusID, companyID, groupName){
		var query = "Update AlumniGroupMapping set status = ? where AlumnusId in (?) and companyId = ? and `Group` = ?";
		var queryArray = ['inactive',alumnusID, companyID, groupName];
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		})
	}
	function mapAlumniDepartment(queryArray){
		var query = "Insert into AlumniGroupMapping (AlumnusId, `Group`, CompanyId, Status) values ? on duplicate key update `Group` = values(`Group`), Status = values(Status)";
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, [queryArray]);
		})
	}
}