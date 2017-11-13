 module.exports = function(settings){
	var app = settings.app;
	var mode = settings.mode;
	var config = settings.config;
	var env = settings.env;
	var cprint = settings.cprint;

	app.get("/company/:companyID/tasks", function(req, res){
		var companyID = req.params.companyID;
		var userID = req.query.userID || null;

		fetchTaskList(userID)
		.then(function(rows){
			var data = [];
			rows.forEach(function(aRow){
				data.push({
					id: aRow["Id"],
					type: aRow["FileType"],
					status: aRow["pending"],
					timestamp: aRow["Timestamp"],
					endTimestamp: aRow["EndTimestamp"]
				});
			})
			return res.json({
				data: data,
				status: "success"
			});
		})
		.catch(function(err){
			cprint(err,1);
			return settings.serviceError(res);
		})
	})

	function fetchTaskList(UserID){
		var query = "Select Id, FilePath, FileType, Timestamp, EndTimestamp, Status from TaskMaster where UserId = ?";
		var queryArray = [UserID];
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		})
	}
}
