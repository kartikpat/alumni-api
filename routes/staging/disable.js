module.exports = function(settings){
	var app = settings.app;
	var mode = settings.mode;
	var config = settings.config;
	var env = settings.env;
	var cprint = settings.cprint;

	function validate(req, res, next){
		if( !req.query.taskID)
			return settings.unprocessableEntity(res);
		return next();
	}

	app.post("/company/:companyID/staging/:stagingID/disable",settings.isAuthenticated, validate, async function(req, res){
		var companyID = req.params.companyID;
		var stagingID = req.params.stagingID;
		var taskID = req.query.taskID;
		try{
			await discardAlumnus(stagingID, companyID);
			await decreaseIncorrectRowsCount(taskID);
			return res.json({
				status: 'success',
				message: 'Records updated'
			})
		}
		catch(err){
			cprint(err,1);
			return settings.serviceError(res);
		}
	});

	function discardAlumnus(entryID, companyID){
		var query = "Update stagingAlumnusDetails set Status = ? , message = ? where EntryId = ? and CompanyId = ?";
		var queryArray = ['discarded', 'discarded', entryID, companyID];
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		})
	}

	function decreaseIncorrectRowsCount(taskID) {
		var query = "Update TaskMaster set IncorrectRowCount = IncorrectRowCount - 1 where Id = ? and IncorrectRowCount > 0";
		var queryArray = [taskID];
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		})
	}
}
