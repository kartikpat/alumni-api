module.exports = function(settings){
	var app = settings.app;
	var mode = settings.mode;
	var config = settings.config;
	var env = settings.env;
	var cprint = settings.cprint;

	function validate(req, res, next){
		console.log(req.params.property)
		if(!(req.params.companyID && req.params.companyID >0))
			return settings.unprocessableEntity(res);

		if( !(req.params.property =='designation' || req.params.property =='department' || req.params.property == 'group') ){
			console.log(req.params.property)
			return settings.unprocessableEntity(res);
		}
		return next();
	}

	app.get("/company/:companyID/:property", validate, function(req, res){
		var companyID = req.params.companyID;

		var pageNumber = req.query.pageNumber || 1,
			pageContent = req.query.pageContent || null,
			by = req.query.by || null,
			value = req.query.value || null;

		var fetchProperty = fetchDepartment(companyID);
		if(req.params.property =='designation')
			fetchProperty = fetchDesignation(companyID);
		else if(req.params.property == 'group')
			fetchProperty = fetchGroup(companyID)

		fetchProperty.then(function(rows){
			var data = [];
			rows.forEach(function(aRow){
				data.push({
					id: aRow["id"],
					name: aRow["Name"],
					cnt: aRow["cnt"]
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

	function fetchGroup(companyID){
		var query = "Select count(*) as cnt, `Group` as Name from AlumniGroupMapping where CompanyId = ? and Status = ? group by `Group`";
		var queryArray = [ companyID, "active" ];
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		})
	}
	function fetchDepartment(companyID){
		var query = "Select dm.Name, dm.DepartmentId as id, count(*) as cnt from AlumnusMaster am inner join DepartmentMaster dm on am.DepartmentId = dm.DepartmentId where am.CompanyId = ? and dm.Status = ? group by dm.DepartmentId, dm.Name"
		//var query = "Select Name, DepartmentId as id from DepartmentMaster where CompanyId = ? and Status = ?";
		var queryArray = [ companyID, "active" ];
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		})
	}
	function fetchDesignation(companyID){
		var query = "Select dm.Name, dm.DesignationId as id, count(*) as cnt from AlumnusMaster am inner join DesignationMaster dm on am.DesignationId = dm.DesignationId where am.CompanyId = ? and dm.Status = ? group by dm.DesignationId, dm.Name";
		var queryArray = [ companyID, "active" ];
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		})
	}
}