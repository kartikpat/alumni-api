 module.exports = function(settings){
	var app = settings.app;
	var mode = settings.mode;
	var config = settings.config;
	var env = settings.env;
	var cprint = settings.cprint;

	app.get('/company/:companyID/tasks/:taskID', function(req, res){
		var companyID = req.params.companyID,
			taskID = req.params.taskID;
		var userID = req.query.userID;
		if(!userID)
			return settings.unprocessableEntity(res);
		fetchTask(taskID, userID)
		.then(function(rows){
			var data = [];
			rows.forEach(function(aRow){
				data.push({
					id: aRow["EntryId"],
					firstName: aRow["FirstName"],
					middleName: aRow["MiddleName"],
					lastName: aRow["LastName"],
					email: aRow["Email"],
					companyEmail: aRow["CompanyEmail"],
					phone: aRow["Phone"],
					dob: aRow['Dob'],
					dol: aRow["DateOfLeaving"],
					doj: aRow["DateOfJoining"],
					department: aRow['Department'],
					designation: aRow["Designation"],
					linkedInURL: aRow["LinkedinURL"],
					code: aRow["Code"],
					salary: aRow["SalaryLPA"],
					sex: aRow["Sex"],
					message: aRow["message"]
				});
			});
			return res.json({
				data: data,
				status: 'success'
			})
		})
		.catch(function(err){
			cprint(err,1)
			return settings.serviceError(res);
		})
	});

	function fetchTask(taskID, userID){
		var query = "Select * from StagingAlumnusMaster sam inner join TaskMaster tm on tm.Id = sam.TaskId where tm.Id = ? and tm.UserId = ?";
		var queryArray = [ taskID, userID ];
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		})
	}
}