function checkDate(aString){
	try{
		var d = new Date(aString);
			if(d=="Invalid Date")
				return null;
		return d.getTime();
	}catch(err){
		return null
	}
}

module.exports = function(settings){
	var cprint = settings.cprint;

	function sanitize(taskID, userID){
		fetchRecords(taskID, userID)
		.then( sanitizeEachRecord )
		.catch(function(err){
			cprint(err,1);
			return
		})
	}

	function fetchRecords(taskID, companyID){
		var query = "Select EntryId, Email, Course, Institute, BatchFrom, BatchTo, CourseType, CompanyId from StagingEducationDetails where TaskId = ? and UserId = ? and Status = ? ";
		var queryArray = [taskID, companyID, 'pending'];
		return settings.dbConnection().then(function(connecting){
			return settings.dbCall(connecting, query, queryArray);
		})
	}

	function fetchAlumnus(email, companyID){
		var query = "Select AlumnusId from AlumnusMaster where Email = ? and CompanyId = ?"
		var queryArray = [email, companyID];
		return settings.dbConnection().then(function(connecting){
			return settings.dbCall(connecting, query, queryArray);
		})
	}

	async function sanitizeEachRecord(rows){
		var len = rows.length;
		for(var i=0; i < len; i++){
			await sanitizeSingleRecord(rows[i])
		}
		return Promise.resolve(1)
	}

	function sanitizeSingleRecord(aRow){
		var props = {};
		props.entryID = aRow["EntryId"];
		props.email =aRow["Email"];
		props.course = aRow['Course'];
		props.institute = aRow['Institute'];
		props.batchTo = aRow["BatchTo"];
		props.batchFrom = aRow["BatchFrom"];
		props.courseType = aRow["CourseType"];
		props.companyID = aRow["CompanyId"];

		var alumniDetails = fetchAlumnus(props.email, props.companyID)
		alumniDetails
		.then(function(rows){
			if(rows.length <1)
				return Promise.reject(-1);

			props.alumnusID = rows[0]["AlumnusId"]
			var prepareAlumni = Promise.all([ addCourse(props.course), addInstitute(props.institute)]);
			return prepareAlumni;
		})
		.then(function(dataArray){
			var courseID = dataArray[0]["insertId"];
			var instituteID = dataArray[1]["insertId"];
			var educationRowsArray = [];
			return addEducationDetails(props.alumnusID, courseID, instituteID, props.batchFrom, props.batchTo, props.courseType, props.companyID);
		})
		.then(function(rows){
			return	updateStaging(props.entryID)
		})
		.catch(function(err){
			cprint(err,1)
			updateError(props.entryID, err.message);
			return
		})
	}

	function updateStaging(entryID){
		var query = "Update StagingEducationDetails set Status = ? where EntryId = ?";
		var queryArray = ['done',entryID];
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		})
	}

	function addEducationDetails(alumnusID, courseID, instituteID, batchFrom, batchTo, courseType, companyID){
			var query = "Insert ignore into  EducationDetails (AlumnusId, CourseID, InstituteID, BatchFrom, BatchTo, CourseType, CompanyId) values (?, ?, ?, ?, ?, ?, ?)";
			var queryArray = [ alumnusID, courseID, instituteID, batchFrom, batchTo, courseType, companyID ];
			return settings.dbConnection().then(function(connection){
				return settings.dbCall(connection, query, queryArray);
			})	
		}

	function addCourse(course){
		var query= "Insert into CourseMaster(Name) values (?) on duplicate key update CourseID = LAST_INSERT_ID(CourseID)";
		var queryArray = [course]
		return settings.dbConnection().then(function(connecting){
			return settings.dbCall(connecting, query, queryArray);
		})
	}
	function addInstitute(institute){
		var query = "Insert into InstituteMaster (Name) values (?) on duplicate key update InstituteID = LAST_INSERT_ID(InstituteID)";
		var queryArray = [institute]
		return settings.dbConnection().then(function(connecting){
			return settings.dbCall(connecting, query, queryArray);
		})	
	};

	function updateError(entryID, message){
		var query = "Update StagingEducationDetails set Message = ? where EntryId = ?";
		var queryArray = [message, entryID];
		return settings.dbConnection().then(function(connecting){
			return settings.dbCall(connecting, query, queryArray);
		})
	}
	settings.sanitizeEducation = sanitize;
}