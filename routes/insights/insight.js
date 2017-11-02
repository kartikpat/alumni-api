module.exports = function(settings){
	var app = settings.app;
	var mode = settings.mode;
	var config = settings.config;
	var env = settings.env;
	var cprint = settings.cprint;

	app.get("/company/:companyID/insights/:group/max", function(req, res){
		var companyID = req.params.companyID;
		var year = req.query.year ||null;
		var group = req.params.group;
		if(!year)
			return settings.unprocessableEntity(res);
		if(["department", "designation"].indexOf(group)==-1)
			return settings.unprocessableEntity(res);

		var timestamp = new Date(year, 0, 1).getTime();
		var nextTimestamp = new Date(parseInt(year)+1, 0, 1).getTime();
		
		fetchEmployeesLeaving(companyID, timestamp, nextTimestamp, group)
		.then(function(rows){
			rows.sort(function(a,b){
				return parseFloat(b.cnt)-parseFloat(a.cnt) ;
			});
			var data = rows[0] || [];
			res.json({
				status: "success",
				data: data
			})
		})
		.catch(function(err){
			cprint(err,1);
			return settings.serviceError(res);
		})
	})

	function fetchEmployeesLeaving(companyID, timestamp, nextTimestamp, metric){
		var query = "select QUARTER(FROM_UNIXTIME(DateOfLeaving/1000)) as quarter, YEAR(FROM_UNIXTIME(DateOfLeaving/1000)) as year, count(*) as cnt, dm.Name from AlumnusMaster am inner join DesignationMaster dm on am.DesignationId=dm.DesignationId where am.CompanyId =? and DateOfLeaving>? and DateOfLeaving <? group by QUARTER(FROM_UNIXTIME(DateOfLeaving/1000)), YEAR(FROM_UNIXTIME(DateOfLeaving/1000)), am.DesignationId, dm.Name";
		if(metric =="department")
			query = "select QUARTER(FROM_UNIXTIME(DateOfLeaving/1000)) as quarter, YEAR(FROM_UNIXTIME(DateOfLeaving/1000)) as year, count(*) as cnt, dm.Name from AlumnusMaster am inner join DepartmentMaster dm on am.DepartmentId=dm.DepartmentId where am.CompanyId =? and DateOfLeaving>? and DateOfLeaving <? group by QUARTER(FROM_UNIXTIME(DateOfLeaving/1000)), YEAR(FROM_UNIXTIME(DateOfLeaving/1000)), am.DepartmentId, dm.Name";
		var queryArray = [ companyID, timestamp, nextTimestamp ];
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		})	
	}


	app.get("/company/:companyID/insights/:group/change", function(req, res){
		var companyID = req.params.companyID;
		var year = req.query.year ||null;
		var metric = req.query.metric || null;
		var group = req.params.group;
		if(!year)
			return settings.unprocessableEntity(res);
		if(["department", "designation"].indexOf(group)==-1)
			return settings.unprocessableEntity(res);

		var timestamp = new Date(parseInt(year)-1, 0, 1).getTime();
		var nextTimestamp = new Date(parseInt(year)+1, 0, 1).getTime();
		
		fetchSeniorityChange(companyID, timestamp, nextTimestamp, metric, group)
		.then(function(rows){
			res.json({
				status: "success",
				data: rows
			})
		})
		.catch(function(err){
			cprint(err,1);
			return settings.serviceError(res);
		})
	})

	function fetchSeniorityChange(companyID, timestamp, nextTimestamp, metric, group){
		var query = 'select YEAR(FROM_UNIXTIME(DateOfLeaving/1000)) as year, count(*) as cnt, dm.Name from AlumnusMaster am inner join DesignationMaster dm on am.DesignationId=dm.DesignationId where am.CompanyId =? and DateOfLeaving>? and DateOfLeaving <? and dm.Name = ? group by YEAR(FROM_UNIXTIME(DateOfLeaving/1000)), am.DesignationId, dm.Name';
		if(group =="department")
			query = "select  YEAR(FROM_UNIXTIME(DateOfLeaving/1000)) as year, count(*) as cnt, dm.Name from AlumnusMaster am inner join DepartmentMaster dm on am.DepartmentId=dm.DepartmentId where am.CompanyId =? and DateOfLeaving>? and DateOfLeaving <? and dm.Name = ? group by YEAR(FROM_UNIXTIME(DateOfLeaving/1000)), am.DepartmentId, dm.Name";
		var queryArray = [companyID, timestamp, nextTimestamp, metric];
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		})
	}
}