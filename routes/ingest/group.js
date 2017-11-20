module.exports = function(settings){
	var app = settings.app;
	var mode = settings.mode;
	var config = settings.config;
	var env = settings.env;
	var cprint = settings.cprint;

	function validate(req, res, next){
		var name = req.body.name || null;
		if(!(name && alumni && alumni.split(',').length<1))
			return settings.unprocessableEntity(res);
	}

	app.post("/company/:companyID/department", async function(req, res){
		var name = req.body.name;
		var alumniArray = req.body.alumni.split(',');
		var companyID = req.params.companyID;
		try{
			var queryArray = [];
			alumniArray.forEach(function(anID){
				queryArray.push([ anID, name, companyID]);
			})
			await addDepartment(queryArray);
			return res.json({
				data: group,
				status: "success"
			});
		}
		catch(err){
			cprint(err,1);
			return settings.serviceError(res);
		}

	});

	function mapAlumniDepartment(queryArray){
		var query = "Insert into AlumniGroupMapping (AlumnusId, `Group`, CompanyId) values ?";
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		})
	}
}