 module.exports = function(settings){
	var app = settings.app;
	var mode = settings.mode;
	var config = settings.config;
	var env = settings.env;
	var cprint = settings.cprint;

	app.get('/company/:companyID/tasks/:taskID',settings.isAuthenticated, function(req, res){
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
					message: aRow["Message"]
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
		var query = "Select sam.EntryId, sam.FirstName, sam.MiddleName, sam.LastName, sam.Email, sam.CompanyEmail, sam.Phone, sam.Dob, sam.DateOfLeaving, sam.DateOfJoining, sam.Department, sam.Designation, sam.LinkedinURL, sam.Code, sam.SalaryLPA, sam.Sex, sam.Message from StagingAlumnusMaster sam inner join TaskMaster tm on tm.Id = sam.TaskId where tm.Id = ? and tm.UserId = ? and sam.message is not null and sam.message !=? ";
		var queryArray = [ taskID, userID , 'discarded'];
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		})
	}
}
