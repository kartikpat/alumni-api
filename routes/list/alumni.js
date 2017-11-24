module.exports = function(settings){
	var app = settings.app;
	var mode = settings.mode;
	var config = settings.config;
	var env = settings.env;
	var cprint = settings.cprint;

	function validate(req, res, next){
		if(( req.query.pageNumber && req.query.pageNumber <1 ) || ( req.query.by && ['designation', 'department', 'group'].indexOf(req.query.by) ==-1 ) || ( req.query.value && req.query.value <1) )
			return settings.unprocessableEntity(res);
		return next();
	}

	app.get("/company/:companyID/list", validate, function(req, res){
		var companyID = req.params.companyID;

		var pageNumber = req.query.pageNumber || 1,
			pageContent = req.query.pageContent || null,
			by = req.query.by || null,
			value = req.query.value || null;

		fetchAlumni(companyID, pageNumber, pageContent, by, value)
		.then(function(rows){
			var data = [];
			rows.forEach(function(anItem){
				data.push({
					id: anItem["AlumnusId"],
					firstName: anItem["FirstName"],
					middleName: anItem["MiddleName"],
					lastName: anItem["LastName"],
					dob: settings.formatDate_yyyymmdd(anItem["DateOfBirth"]),
					doj: anItem["DateOfJoining"],
					dol: anItem["DateOfLeaving"],
					designation: anItem["Designation"],
					department: anItem["Department"],
					group: anItem["Group"]
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

	function fetchAlumni(companyID, pageNumber=1,pageContent=10, condition =null, conditionValue = null){
		var offset = (pageNumber-1)*pageContent;
		pageContent = parseInt(pageContent)
		var query = "Select AlumnusId,FirstName, MiddleName, LastName, DateOfBirth, dsg.Name as Designation, dep.Name as Department, DateOfLeaving, DateOfJoining from AlumnusMaster am inner join DepartmentMaster dep on am.DepartmentId=dep.DepartmentId inner join DesignationMaster dsg on dsg.DesignationId = am.DesignationId where am.companyId = ? ";
		var queryArray = [companyID];
		if(condition ){
			switch(condition){
				case "designation":
					query+='and am.DesignationId = ?';
					queryArray.push(conditionValue);
					break;
				case "department":
					query+=' and am.DepartmentId = ?';
					queryArray.push(conditionValue);
					break;
				case "group":
					query = "Select am.AlumnusId,FirstName, MiddleName, LastName, DateOfBirth, dsg.Name as Designation, dep.Name as Department, DateOfLeaving, DateOfLeaving, agm.Group from AlumnusMaster am inner join DepartmentMaster dep on am.DepartmentId=dep.DepartmentId inner join DesignationMaster dsg on dsg.DesignationId = am.DesignationId inner join AlumniGroupMapping agm on am.AlumnusId = agm.AlumnusId where am.companyId = ? and `Group` = ? and agm.Status = 'active'";
					queryArray.push(conditionValue);
					break;
			}
		}
		query+= ' limit ?, ?';
		queryArray.push(offset);
		queryArray.push(pageContent);

		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		})
	}
}