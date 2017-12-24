module.exports = function(settings){
	var app = settings.app;
	var mode = settings.mode;
	var config = settings.config;
	var env = settings.env;
	var cprint = settings.cprint;

	function validate(req, res, next){
		var name = req.body.name || null;
		var alumni = req.body.alumni || null;
		if(!(name && alumni && alumni.split(',').length>0))
			return settings.unprocessableEntity(res);
		return next();
	}

	app.post("/company/:companyID/group",settings.isAuthenticated, validate, async function(req, res){
		var name = req.body.name;
		var alumniArray = req.body.alumni.split(',');
		var companyID = req.params.companyID;
		try{
			var queryArray = [];
			alumniArray.forEach(function(anID){
				queryArray.push([ anID, name, companyID, 'active']);
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

	function mapAlumniDepartment(queryArray){
		var query = "Insert into AlumniGroupMapping (AlumnusId, `Group`, CompanyId, Status) values ? on duplicate key update `Group` = values(`Group`), Status = values(Status)";
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, [queryArray]);
		})
	}
}
