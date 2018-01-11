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

var validateMap = {
	"course": "Course",
	"institute": "Institute",
	"batchFrom": "Batch From",
	"batchTo": "Batch To"
}

module.exports = function(settings){
	var cprint = settings.cprint;

	function validateUserFields(anObject){
		var requiredFields = ['course', 'institute'];
		var dateFields = [ 'batchFrom','batchTo']
		var missing = [];
		var invalid = [];
		requiredFields.forEach(function(aField){
			if(!anObject[aField])
				missing.push(validateMap[aField])
		})
		dateFields.forEach(function(aField){
			if(anObject[aField])
				if(!checkDate(anObject[aField]))
					invalid.push(validateMap[aFields])
				else
					anObject[aField] = checkDate(anObject[aField])
		})
		//TODO add a email validate function her


		var errMessage = '';
		if(missing.length>0)
			errMessage+=('Missing values: '+ missing.join(', ')+'.' );
		if(invalid.length>0)
			errMessage+=('Invalid format: '+invalid.join(', ')+'.');
		if(errMessage && errMessage!='')
			throw new Error(errMessage);
	}



	function fetchRecord(entryID){
		var query = "Select EntryId, Email, Course, Institute, BatchFrom, BatchTo, CourseType, CompanyId from stagingAlumnusDetails where  EntryId= ?";
		var queryArray = [entryID];
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

	function sanitizeSingleEducationRecord(aRow){
		var props = {};
		var companyID = aRow["CompanyId"];
		var email = aRow["Email"]
		var entryID = aRow["EntryId"]

		var alumniEducationDetails = Promise.all([fetchRecord(entryID)])
		return alumniEducationDetails
		.then(function(dataArray){
			var rows = dataArray[0];
		props.entryID = rows[0]["EntryId"];
		props.email =rows[0]["Email"];
		props.course = rows[0]['Course'];
		props.institute = rows[0]['Institute'];
		props.batchTo = rows[0]["BatchTo"];
		props.batchFrom = rows[0]["BatchFrom"];
		props.courseType = rows[0]["CourseType"];
		props.companyID = rows[0]["CompanyId"];
		if(!props.email) {
			return Promise.reject(new Error("Email is missing, Education details discarded!"))
		}
		validateUserFields(props);
		if(props.courseType)
			props.courseType = props.courseType.replace(/ /g,'-').toLowerCase();

		var alumniDetails = fetchAlumnus(props.email, props.companyID)
		return alumniDetails
		})
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
		.catch(function(err){
			cprint(err,1)
			return updateError(props.entryID, err.message);
		})
	}

	function addEducationDetails(alumnusID, courseID, instituteID, batchFrom, batchTo, courseType, companyID){
			// var query = "Insert ignore into  EducationDetails (AlumnusId, CourseID, InstituteID, BatchFrom, BatchTo, CourseType, CompanyId) values (?, ?, ?, ?, ?, ?, ?)";
			var query = "Insert into  EducationDetails (AlumnusId, CourseID, InstituteID, BatchFrom, BatchTo, CourseType, CompanyId) values (?, ?, ?, ?, ?, ?, ?) on duplicate key Update BatchTo = values(BatchTo), BatchFrom = values(BatchFrom), CourseType = values(CourseType)";
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
		var query = "Update stagingAlumnusDetails set educationErrMsg = ? where EntryId = ?";
		var queryArray = [message, entryID];
		return settings.dbConnection().then(function(connecting){
			return settings.dbCall(connecting, query, queryArray);
		})
	}
	settings.sanitizeSingleEducationRecord = sanitizeSingleEducationRecord;
}
