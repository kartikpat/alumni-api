var moment = require('moment');
function checkDate(aString){
	var d = moment(aString, 'DD-MM-YYYY');
	if(!d.isValid())
		return null;
	return d.valueOf();

}
module.exports = function(settings){
	var cprint = settings.cprint;

	var taskID ="cbbdf29c34cc4ae2ac64d083d8f1df2a";
	var companyID = 3;

	function validateUserFields(anObject){
		var requiredFields = ['name', 'email', 'companyEmail', 'doj', 'dol', 'department', 'designation', 'salaryLPA'];
		var dateFields = ['dob', 'doj', 'dol']
		var emailFields = ['email', 'companyEmail']
		var missing = [];
		var invalid = [];
		requiredFields.forEach(function(aField){
			if(!anObject[aField])
				missing.push(aField)
		})
		dateFields.forEach(function(aField){
			if(!checkDate(anObject[aField]))
				invalid.push(aField)
		})
		//TODO add a email validate function here
		var errMessage = '';
		if(missing.length>0)
			errMessage+=('Missing values: '+ missing.join(', ')+'.' );
		if(invalid.length>0)
			errMessage+=('Invalid format: '+invalid.join(', ')+'.');
		if(errMessage && errMessage!='')
			return new Error(errMessage);
		return
	}

	function sanitize(taskID, companyID){
		fetchRecords(taskID, companyID)
		.then( sanitizeEachRecord )
		.catch(function(err){
			cprint(err,1);
			return
		})
	}

	function fetchRecords(taskID, companyID){
		var query = "Select EntryId, Email, CompanyId from StagingAlumnusMaster where TaskId = ? and CompanyId = ? and Status = ? ";
		var queryArray = [taskID, companyID, 'pending'];
		return settings.dbConnection().then(function(connecting){
			return settings.dbCall(connecting, query, queryArray);
		})
	}

	function fetchAlumnus(entryID, email){
		var query = "Select EntryId, FirstName, MiddleName, LastName, Email, Phone, CompanyEmail, Dob, DateOfJoining, DateOfLeaving, Department, Designation, LinkedinURL, Code, SalaryLPA, CompanyId, Sex from StagingAlumnusMaster where EntryId= ?"
		var queryArray = [entryID];
		return settings.dbConnection().then(function(connecting){
			return settings.dbCall(connecting, query, queryArray);
		})
	}

	function fetchEducation(email, companyID){
		var query = " Select Email, Course, Institute, BatchFrom, BatchTo, CourseType, CompanyId from StagingEducationDetails where Email = ? and CompanyId = ?"
		var queryArray = [email, companyID];
		return settings.dbConnection().then(function(connecting){
			return settings.dbCall(connecting, query, queryArray);
		})	
	}

	function fetchProfession(email, companyID){
		var query = "Select  Email, Designation, Organisation, DateOfJoining,DateOfLeaving, CompanyId from StagingProfessionalDetails where Email = ? and CompanyId = ?";
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
		var companyID = aRow["CompanyId"];
		var email = aRow["Email"]
		var entryID = aRow["EntryId"]

		var alumniDetails = Promise.all([fetchAlumnus(entryID, email)])
		alumniDetails
		.then(function(dataArray){
			var rows = dataArray[0];
			props.firstName = rows[0]["FirstName"] || null;
			props.middleName = rows[0]["MiddleName"];
			props.lastName = rows[0]["LastName"];
			props.email = rows[0]['Email'] || null;
			props.phone = rows[0]['Phone'] || null;
			props.companyEmail = rows[0]['CompanyEmail'] || Date.now(); // TODO make this null default
			props.dob = checkDate(rows[0]['Dob']);
			props.dateOfBirth = checkDate(rows[0]['Dob']) ? moment(rows[0]['Dob'], 'YYYY-MM-DD').format('YYYY-MM-DD') : null;
			props.doj = checkDate(rows[0]['DateOfJoining']);
			props.dol = checkDate(rows[0]['DateOfLeaving']);
			props.department = rows[0]['Department'] || null;
			props.designation = rows[0]['Designation'] || null;
			props.linkedInUrl = rows[0]['LinkedinURL'] || null;
			props.code = rows[0]['Code'] || null;
			props.salaryLPA = rows[0]['SalaryLPA'] || null;
			props.sex = rows[0]['Sex'] || null;
			props.companyID = rows[0]['CompanyId'];
			console.log('...........Staging values.................')
			console.log(rows[0]['Dob'])
			console.log('.........DateOfBirth...............')
			console.log(props.dateOfBirth)
			console.log('............Dob.....................')
			console.log(props.dob)
			validateUserFields(props);

			var educationRows = dataArray[1];
			props.education = educationRows || [];

			var professionRows = dataArray[2];
			props.profession = professionRows || [];

			var prepareAlumni = Promise.all([addDepartment(props.department, props.companyID), addDesignation(props.designation, props.companyID)]);
			return prepareAlumni;
		})
		.then(function(dataArray){
			var departmentRows = dataArray[0];
			var designationRows = dataArray[1];
			
			props.courseRows = dataArray[2];
			props.instituteRows = dataArray[3];
			props.organisationRows = dataArray[4];
			props.designationRows = dataArray[5];


			props.departmentID = departmentRows.insertId;
			props.designationID = designationRows.insertId;
			
			return addUser([props.firstName , props.middleName , props.lastName , props.email , props.phone, props.companyEmail , props.dob , props.dateOfBirth, props.doj , props.dol , props.departmentID , props.designationID , props.linkedInUrl , props.code , props.salaryLPA , props.companyID , props.sex])
		})
		.then(function(qOb){
			return	updateStaging(entryID)
		})
		.catch(function(err){
			cprint(err,1)
			return updateError(entryID, err.message);
			
		})
	}

	function prepareMultipleItems(rows, key){
		var itemIDArray = [];
		var itemPromiseArray = [];
		rows.forEach(function(anItem){
			switch(key){
				case 'Course':
					itemPromiseArray.push(addCourse(anItem[key]))
					break;
				case 'Institute':
					itemPromiseArray.push(addInstitute(anItem[key]))
					break;
				case 'Organisation':
					itemPromiseArray.push(addOrganisation(anItem[key]))
					break;
				case 'Designation':
					itemPromiseArray.push(addPastRole(anItem[key]))
					break;
				default:
					break;
			}
		})
		return Promise.all(itemPromiseArray)
		.then(function(dataArray){
			dataArray.forEach(function(aRow){
				itemIDArray.push(aRow.insertId);
			})
			return itemIDArray;
		})
		.catch(function(err){
			cprint(err,1);
			Promise.reject(-1);
		})
	};

	function rollbackTransaction(props){
		var connection = props.connection;
		var err = props.err;
		cprint(err,1);
		return connection.rollback(function(){
			connection.release();
		})
		
	}

	function updateStaging(entryID){
		var query = "Update StagingAlumnusMaster set Status = ? where EntryId = ?";
		var queryArray = ['done',entryID];
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray)
		})
	}

	function addProfessionalDetails(professionalArray, connection){
			var query = "Insert ignore into ProfessionDetails (AlumnusId, DesignationID, OrganisationId, FromTimestamp,ToTimestamp, CompanyId) values ?";
			var queryArray = [ professionalArray ];
			return settings.dbTransactionQuery(connection, query, queryArray);
		}

	function addEducationDetails(educationArray, connection){
			var query = "Insert ignore into  EducationDetails (AlumnusId, CourseID, InstituteID, BatchFrom, BatchTo, CourseType, CompanyId) values ?";
			var queryArray = [ educationArray ];
			return settings.dbTransactionQuery(connection, query, queryArray);
		}

	function addUser(queryArray){
			var query = "Insert into AlumnusMaster (FirstName, MiddleName, LastName, Email, Phone, CompanyEmail, Dob, DateOfBirth, DateOfJoining, DateOfLeaving, DepartmentId, DesignationId, LinkedinURL, Code, SalaryLPA, CompanyId, Sex ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? )";
			return settings.dbConnection().then(function(connection){
				return settings.dbCall(connection, query, queryArray);
			})
		}

	function addCourse(course){
		var query= "Insert into CourseMaster(Name) values (?)";
		var queryArray = [course]
		return settings.dbConnection().then(function(connecting){
			return settings.dbCall(connecting, query, queryArray);
		})
	}
	function addInstitute(institute){
		var query = "Insert into InstituteMaster (Name) values (?)";
		var queryArray = [institute]
		return settings.dbConnection().then(function(connecting){
			return settings.dbCall(connecting, query, queryArray);
		})	
	};
	function addOrganisation(organisation){
		var query = "Insert into OrganisationMaster (Name) values(?)"
		var queryArray = [organisation]
		return settings.dbConnection().then(function(connecting){
			return settings.dbCall(connecting, query, queryArray);
		})		
	};

	function addPastRole(role){
		var query = "Insert into RoleMaster (Name) values(?)"
		var queryArray = [ role ]
		return settings.dbConnection().then(function(connecting){
			return settings.dbCall(connecting, query, queryArray);
		})
	};


	function addDepartment(departmentName, companyID){
		var query = 'Insert into DepartmentMaster (Name, CompanyId) values (? , ?) On Duplicate key Update DepartmentId=LAST_INSERT_ID(DepartmentId), Name = ?, CompanyId = ?';
		var queryArray = [departmentName, companyID, departmentName, companyID];
		return settings.dbConnection().then(function(connecting){
			return settings.dbCall(connecting, query, queryArray);
		})
	}
	function addDesignation(designationName, companyID){
		var query = 'Insert into DesignationMaster (Name, CompanyId) values (? , ?) On Duplicate key Update DesignationID=LAST_INSERT_ID(DesignationID), Name = ?, CompanyId = ?';
		var queryArray = [designationName, companyID, designationName, companyID];
		return settings.dbConnection().then(function(connecting){
			return settings.dbCall(connecting, query, queryArray);
		})	
	}

	function updateError(entryID, message){
		var query = "Update StagingAlumnusMaster set Message = ? where EntryId = ?";
		var queryArray = [message, entryID];
		return settings.dbConnection().then(function(connecting){
			return settings.dbCall(connecting, query, queryArray);
		})
	}
	settings.sanitize = sanitize;
	//sanitize(taskID, companyID)
}