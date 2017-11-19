module.exports = function(settings){
	var app = settings.app;
	var mode = settings.mode;
	var config = settings.config;
	var env = settings.env;
	var cprint = settings.cprint;

	app.get('/company/:companyID/insights/salary/max', function(req, res){
		var companyID = req.params.companyID;
		var ranges = ["1-3","4-6","7-9","10-12","13-15","16-18","19-21","22-above"];
		var data = [ 0,0,0,0,0,0,0,0 ]
		fetchSalaryMax(companyID)
		.then(function(rows){
			rows.forEach(function(aRow){
				var index = parseInt(aRow["range"].split('-')[1])/3;

				if(index > 7 ){
					data[7] += aRow['cnt'];
				}
				else
					data[index-1] += aRow['cnt'];
			});
			var index = data.indexOf(Math.max(...data));
			return res.json({
				"status": "success",
				data: {
					range: ranges[index],
					count: data[index]
				}
			})
		})
		.catch(function(err){
			cprint(err,1);
			return settings.serviceError(res);
		})
	})
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


	function fetchSalaryMax(companyID){
		var query = "select concat(3*floor(SalaryLPA/3)+1, '-', 3*floor(SalaryLPA/3) + 3) as `range`,     count(*) as `cnt` from AlumnusMaster where SalaryLPA is not null and CompanyId = ? group by 1 order by SalaryLPA";
		var queryArray = [ companyID ]

		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		})
	}
	/************************************/

	app.get("/company/:companyID/insights/:group/demography/:groupValue", function(req, res){
		var companyID = req.params.companyID;
		var group = req.params.group,
			groupValue = req.params.groupValue;
		var value = req.query.value || null,
			metric = req.query.metric || null; // institute
		if(!(value && metric && ["institute", "education", "gender", "location", "designation"].indexOf(group)>-1))
			return settings.unprocessableEntity(res);
		if(metric=='gender')
			fetchDesignationGender(groupValue, metric)
			.then(function(rows){
				var total = 0;
				var desiredGender = '';
				var desiredValue = 0;
				rows.forEach(function(aRow){
					total+=aRow['cnt'];
					if(aRow['Name'] == value){
						desiredGender = aRow['Name'];
						desiredValue = aRow["cnt"]
					}
				})
				var percent= (total!==0)? (desiredValue / total)*100 : 0;
				return res.json({
					status: 'success',
					data: {
						percent: percent,
						metric: metric,
						value: desiredValue
					}
				})
			})
			.catch(function(err){
				cprint(err,1);
				return settings.serviceError(res);
			})
		else
			fetchDesignationInstitue(groupValue, metric)
			.then(function(rows){
				var total = 0;
				var desiredInstitute = '';
				var desiredValue = 0;
				rows.forEach(function(aRow){
					total+=aRow['cnt'];
					if(aRow['Name']==value){
						desiredInstitute = aRow['Name'];
						desiredValue = aRow['cnt'];
					}
				})

				var percent= (total!==0)? (desiredValue / total)*100 : 0;
				return res.json({
					status: "success",
					data: {
						percent: percent,
						metric: metric,
						value: desiredValue
					}
				})
			})
			.catch(function(err){
				cprint(err,1);
				return settings.serviceError(res);
			})
	})

	function fetchDesignationInstitue(designation, metric){
		var query = "Select count(*) as cnt, im.Name from AlumnusMaster am inner join DesignationMaster dm on am.DesignationId = dm.DesignationId inner join EducationDetails ed on am.AlumnusId=ed.AlumnusId inner join InstituteMaster im on ed.InstituteId = im.InstituteId where dm.Name = ? group by im.InstituteId, im.Name";
		if(metric == 'education')
			query = "Select count(*) as cnt, cm.Name from AlumnusMaster am inner join DesignationMaster dm on am.DesignationId = dm.DesignationId inner join EducationDetails ed on am.AlumnusId=ed.AlumnusId inner join CourseMaster cm on ed.CourseId = cm.CourseId where dm.Name = ? group by cm.CourseId, cm.Name";
		if(metric == 'gender')
			query = "Select count(*) as `cnt`, Sex as `Name`	 from AlumnusMaster am inner join DesignationMaster dm on am.DesignationId=dm.DesignationId where dm.Name = ? group by Sex"
		var queryArray = [designation];
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		})
	}

	function fetchDesignationGender(designation){
		var query = "Select count(*) as `cnt`, Sex as `Name`	 from AlumnusMaster am inner join DesignationMaster dm on am.DesignationId=dm.DesignationId where dm.Name = ? group by Sex";
		var queryArray = [ designation ];
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		})
	}

	function fetchDesignationEducation(designation){
		
		var queryArray = [designation];
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		})
	}
}