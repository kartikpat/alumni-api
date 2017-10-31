module.exports = function(settings){
	var app = settings.app;
	var mode = settings.mode;
	var config = settings.config;
	var env = settings.env;
	var cprint = settings.cprint;

	function validate(req, res, next){
		if(!(req.params.companyID && req.params.companyID >0))
			return settings.unprocessableEntity(res);

		if( !(req.params.property =='designation' || req.params.property =='department') )
			return settings.unprocessableEntity(res);
		return next();
	}

	app.get("/company/:companyID/list/:property", validate, function(req, res){
		var companyID = req.params.companyID;

		var pageNumber = req.query.pageNumber || 1,
			pageContent = req.query.pageContent || null,
			by = req.query.by || null,
			value = req.query.value || null;

		var fetchProperty = fetchDepartment(companyID);
		if(req,params.property =='designation')
			fetchProperty = fetchDesignation(companyID);

		fetchProperty.then(function(rows){
			var data = [];
			rows.forEach(function(aRow){
				data.push({
					id: aRow["id"],
					name: aRow["Name"]
				})
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

	function fetchDepartment(companyID){
		var query = "Select Name, DepartmentId as id from DepartmentMaster where CompanyId = ? and Status = ?";
		var queryArray = [ companyID, "active" ];
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		})
	}
	function fetchDesignation(companyID){
		var query = "Select Name, DesignationId as id from DesignationMaster where CompanyId = ? and Status = ?";
		var queryArray = [ companyID, "active" ];
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		})
	}
}