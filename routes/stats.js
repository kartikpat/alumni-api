var moment = require('moment');
function formatDate_yyyymmdd(date, isTime) {
	var localDateString = new Date(date).toLocaleString('en-IN', {timeZone:  'Asia/Kolkata'});
    var d = new Date(localDateString),
        month = '' + (d.getMonth() + 1),
        day = '' + d.getDate(),
        year = '' + d.getFullYear(),
        hour = '' + d.getHours(),
        minute = '' + d.getMinutes(),
        second = '' + d.getSeconds();


    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;
    if (hour.length<2) hour = '0'+ hour;
    if (minute.length <2) minute = '0' + minute;
    if (second.length <2 ) second = '0' + second;

    if(isTime){
    	return [year, month, day].join('-') + " " + [hour, minute, second].join(":");
    }
    return [year, month, day].join('-');
}

module.exports = function(settings){
	var app = settings.app;
	var mode = settings.mode;
	var config = settings.config;
	var env = settings.env;
	var cprint = settings.cprint;

	function getQuarter(timestamp) {
		var d = (timestamp)? new Date(timestamp) : new Date();
		var q = [1,2,3,4];
		return { 
			quarter:q[Math.floor(d.getMonth() / 3)],
			year: d.getFullYear()
		};
	}
	function fetchTotalEmployees(companyID, timestamp){
		var query = "Select count(*) as total from AlumnusMaster where companyID = ? and (DateOfLeaving is null or DateOfLeaving >?) ";
		var queryArray = [ companyID, timestamp ];
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		})
	}
	function fetchEmployeesJoining(companyID, timestamp, nextTimestamp, metric){
		var query = "select QUARTER(FROM_UNIXTIME(DateOfJoining/1000)) as quarter, YEAR(FROM_UNIXTIME(DateOfJoining/1000)) as year, count(*) as cnt, dm.Name from AlumnusMaster am inner join DesignationMaster dm on am.DesignationId=dm.DesignationId where am.CompanyId =? and DateOfJoining>? and DateOfJoining < ? group by QUARTER(FROM_UNIXTIME(DateOfJoining/1000)), YEAR(FROM_UNIXTIME(DateOfJoining/1000)), dm.DesignationId, dm.Name";
		var queryArray = [companyID, timestamp, nextTimestamp ];
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		})	
	}
	function fetchEmployeesLeaving(companyID, timestamp, nextTimestamp, metric){
		var query = "select QUARTER(FROM_UNIXTIME(DateOfLeaving/1000)) as quarter, YEAR(FROM_UNIXTIME(DateOfLeaving/1000)) as year, count(*) as cnt, dm.Name from AlumnusMaster am inner join DesignationMaster dm on am.DesignationId=dm.DesignationId where am.CompanyId =? and DateOfLeaving>? and DateOfLeaving <? group by QUARTER(FROM_UNIXTIME(DateOfLeaving/1000)), YEAR(FROM_UNIXTIME(DateOfLeaving/1000)), am.DesignationId, dm.Name";
		var queryArray = [ companyID, timestamp, nextTimestamp ];
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		})	
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
		var year = req.query.year || null;
		if(!year)
			return settings.unprocessableEntity(res);
		if(year > new Date().getFullYear())
			return settings.unprocessableEntity(res, "invalid year");

		var timestamp = new Date(year, 0, 1).getTime();
		var nextTimestamp = new Date(parseInt(year)+1, 0, 1).getTime();
		var props ={};

		var promiseArray = [fetchTotalEmployees(companyID, timestamp), fetchEmployeesJoining(companyID, timestamp, nextTimestamp, "`DesignationId`"), fetchEmployeesLeaving(companyID, timestamp, nextTimestamp, "`DesignationId`")]
		var allPromise = Promise.all(promiseArray)
		allPromise.then(function(dataArray){
			var totalEmployeesRows = dataArray[0]; 
			var joiningEmployeesRows = dataArray[1];
			var leavingEmployeesRows = dataArray[2];

			var total = totalEmployeesRows[0]["total"];
			var data = {};
			joiningEmployeesRows.forEach(function(aRow){
				if(!data[aRow["quarter"]])
					data[aRow["quarter"]] = {};
				if(!data[aRow["quarter"]][aRow["Name"]])
					data[aRow["quarter"]][aRow["Name"]] = {};
				data[aRow["quarter"]][aRow["Name"]]["hired"] = aRow["cnt"];
			});
			leavingEmployeesRows.forEach(function(aRow){
				if(!data[aRow["quarter"]])
					data[aRow["quarter"]] = {};
				if(!data[aRow["quarter"]][aRow["Name"]])
					data[aRow["quarter"]][aRow["Name"]] = {};
				data[aRow["quarter"]][aRow["Name"]]["relieved"] = aRow["cnt"];
			});
			var resData = [];
			Object.keys(data)
				.sort()
				.forEach(function(v, i){
					var stats= [];
					for(var key in data[v]){
						stats.push({
							group: key,
							hired: data[v][key]["hired"],
							relieved: data[v][key]["relieved"],
							rate: (data[v][key]["relieved"]||0) *100/(total+(data[v][key]["hired"] ||0) )
						})
						total+=(data[v][key]["hired"] ||0)
						total-=(data[v][key]["relieved"] ||0)
					}
					resData.push({
						q: v,
						stats: stats
					})
				});
			res.json({
				status: 'success',
				data: resData
			})
			return
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
	});

	app.get("/company/:companyID/birthday", function(req, res){
		var companyID = req.params.companyID;
		var fromDay = moment().date();
		var fromMonth = 1+moment().month();
		var toDay = moment().add(2, 'd').date();
		var toMonth = 1+moment().add(2, 'd').month();
		getComingBirthday(companyID, fromMonth, toMonth, fromDay, toDay)
		.then(function(rows){
			var data = [];
			rows.forEach(function(aRow){
				data.push({
					firstName: aRow["FirstName"],
					lastName: aRow["LastName"],
					middleName: aRow["MiddleName"],
					department: aRow["Department"],
					designation: aRow["Designation"],
					dob: aRow["DateOfBirth"]
				});
			})
			return res.json({
				status: "success",
				data: data
			});
		})
		.catch(function(err){
			cprint(err);
			return settings.serviceError(res);
		})
	})
	function getComingBirthday(companyID, fromMonth, toMonth, fromDay, toDay){
		var query = "Select FirstName, MiddleName, LastName, DateOfBirth, dm.Name as Department, dsg.Name as Designation  from AlumnusMaster am inner join DepartmentMaster dm on am.DepartmentId=dm.DepartmentId inner join DesignationMaster dsg on am.DesignationId=dsg.DesignationId  where am.companyId = ? and ( Month(DateOfBirth) = ? or Month(DateOfBirth) = ?) and (Day(DateOfBirth) between ? and ?  )";
		var queryArray = [companyID, fromMonth, toMonth, fromDay, toDay];
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		});				
	}
}