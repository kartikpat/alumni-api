module.exports = function(settings){
	var app = settings.app;
	var mode = settings.mode;
	var config = settings.config;
	var env = settings.env;
	var cprint = settings.cprint;
	var moment = require('moment');

	function getQuarter(timestamp) {
		var d = (timestamp)? new Date(timestamp) : new Date();
		var q = [1,2,3,4];
		return { 
			quarter:q[Math.floor(d.getMonth() / 3)],
			year: d.getFullYear()
		};
	}
	function fetchEmployees(companyID){
		var query = "Select * from AlumnusMaster where companyID = ?";
		var queryArray = [companyID];
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		})
	}

	app.get("/company/:companyID/states", function(req, res){
		var companyID = req.params.companyID;
		var fetchingEmployees = fetchEmployees(companyID);
		var props ={};
		fetchingEmployees.then(function(rows){
			rows.forEach(function(anAlumnus){
				if(anAlumnus["DateOfJoining"]){
					var joiningState = getQuarter(anAlumnus["DateOfJoining"]);
					if(props[joiningState['year']]){
						if (props[joiningState['year']][joiningState['quarter']]){
							props[joiningState['year']][joiningState['quarter']]['hired']++;
						}
						else
							props[joiningState['year']][joiningState['quarter']]={
								hired: 1,
								relieved:0
							}
					}
					else {
						props[joiningState['year']] = {};
						props[joiningState['year']][joiningState['quarter']]={
								hired: 1,
								relieved:0
							};
					}
				}
				if(anAlumnus["DateOfLeaving"]){
					var relievingState = getQuarter(anAlumnus["DateOfLeaving"]);
					if(props[relievingState['year']]){
						if (props[relievingState['year']][relievingState['quarter']]){
							props[relievingState['year']][relievingState['quarter']]['relieved']++;
						}
						else
							props[relievingState['year']][relievingState['quarter']]={
								relieved: 1
							}
					}
					else {
						props[relievingState['year']] = {};
						props[relievingState['year']][relievingState['quarter']]={
								relieved: 1
							};
					}
				}

			});

			var data = [];
			for(var key in props){
				var ob ={};
				ob[key] = props[key];
				data.push(ob);
			}
			return res.json({
				status: "success",
				data: data
			})
		})
		.catch(function(err){
			cprint(err,1);
			return settings.serviceError(res);
		})
	})


	function fetchTenure(companyID){
		var query = "Select AVG(DateOfLeaving - DateOfJoining) as Tenure, dm.Name from AlumnusMaster am inner join DesignationMaster dm on am.DesignationId=dm.DesignationId where am.CompanyId = ? and dm.CompanyId = ? and dm.Status='active' group by am.DesignationId, dm.Name";
		var queryArray = [companyID, companyID];
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		});	
	}
	app.get("/company/:companyID/tenure", function(req, res){
		var companyID = req.params.companyID;
		var props = {}
		var fetchingTenure = fetchTenure(companyID);
		fetchingTenure.then(function(rows){
			var data = [];
			rows.forEach(function(aRow){
				data.push({
					name:	aRow['Name'],
					tenure:	(aRow['Tenure']) ? moment.duration(aRow['Tenure']).asYears() : null
				});
			});
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


	function fetchEmployeesGroup(companyID, groupBy){
		var query = "Select count(*) from AlumnusMaster group by DesignationId"
		var queryArray = [companyID];
		switch(groupBy){
			case 'designation':
				query = "Select count(*) as num, dm.Name from AlumnusMaster am inner join DesignationMaster dm on am.DesignationId=dm.designationId where am.CompanyId= ? group by am.DesignationId, dm.Name";
				break;
			case 'institute':
				query = "Select count(*) as num, im.Name from AlumnusMaster am inner join EducationDetails ed on am.AlumnusId = ed.AlumnusId inner join InstituteMaster im on ed.InstituteId=im.InstituteId where am.CompanyId= ? group by ed.InstituteId, im.Name";
				break;
			case 'gender':
				query = "Select count(*) as num, Sex as Name from AlumnusMaster group by Sex";
				break;
			case 'education':
				query = "Select count(*) as num, cm.Name from AlumnusMaster am inner join EducationDetails ed on am.AlumnusId=ed.AlumnusId inner join CourseMaster cm on cm.CourseId=ed.CourseId where am.CompanyId= ? group by ed.CourseId, cm.Name";
				break;
			default:
				break;
		}
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		});		
	}

	app.get("/company/:companyID/demography", function(req, res){
		var companyID = req.params.companyID;
		var by = req.query.by || null;
		if(!(by && ( by =='designation' || by=='institute' || by=='gender' || by=='education')))
			return settings.unprocessableEntity(res);

		var fetchingDemo = fetchEmployeesGroup(companyID, by);	
		fetchingDemo.then(function(rows){
			var data = [];
			rows.forEach(function(aRow){
				data.push({
					name: aRow["Name"],
					value: aRow["num"]
				})
			})
			res.json({
				status: "success",
				data: data
			});
			return
		})
		.catch(function(err){
			cprint(err,1);
			return settings.serviceError(res);
		})
	})
}