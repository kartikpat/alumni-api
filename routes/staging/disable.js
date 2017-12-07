module.exports = function(settings){
	var app = settings.app;
	var mode = settings.mode;
	var config = settings.config;
	var env = settings.env;
	var cprint = settings.cprint;

	app.post("/company/:companyID/staging/:stagingID/disable", async function(req, res){
		var companyID = req.params.companyID;
		var stagingID = req.params.stagingID;
		try{
			await discardAlumnus(stagingID, companyID);
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
		var query = "Update StagingAlumnusMaster set Status = ? , Message = ? where EntryId = ? and CompanyId = ?";
		var queryArray = ['done', 'discarded', entryID, companyID];
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		})
	}
}