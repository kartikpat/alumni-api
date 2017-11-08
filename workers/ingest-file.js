// Not to be used

var data = require("../adapters/data.json");
module.exports = function(settings){
	var cprint = settings.cprint;

	// sanitizeEachRecord(data)

	var taskID ="78bb765d8a454dd093ffcd1be522cb5f";
	var companyID = 2;
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
		var query = "Select  Email, Designation, Organisation, FromTimestamp,ToTimestamp, CompanyId from StagingProfessionalDetails where Email = ? and CompanyId = ?";
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
		cprint(aRow)
		var props = {};
		var dataArray = [];
		var companyID = aRow["CompanyId"];
		var email = aRow["Email"]
		var entryID = aRow["EntryId"]

		props.firstName = aRow["FirstName"];
			props.middleName = aRow["MiddleName"];
			props.lastName = aRow["LastName"];
			props.email = aRow['Email'];
			props.phone = aRow['Phone'];
			props.companyEmail = aRow['CompanyEmail'];
			props.dob = aRow['Dob'] ? new Date(aRow['Dob']).getTime():  new Date(aRow['DateOfJoining']).getTime() -1000000;
			props.dateOfBirth = aRow['Dob'] ? settings.formatDate_yyyymmdd(new Date(aRow['Dob'])) : null;
			props.doj = new Date(aRow['DateOfJoining']).getTime();
			props.dol = new Date(aRow['DateOfLeaving']).getTime();
			props.department = aRow['Department'];
			props.designation = aRow['Designation'];
			props.linkedInUrl = aRow['LinkedinURL'];
			props.code = aRow['Code'];
			props.salaryLPA = aRow['SalaryLPA'];
			props.sex = aRow['Sex'];
			props.companyID = companyID;

			 
			props.education = dataArray[1] || null;
			props.profession = dataArray[2] || null;

			var addingCourses = Promise.resolve([]);
			var addingInstitutes = Promise.resolve([]);
			var addingOrganisations = Promise.resolve([]);
			var addingDesignations = Promise.resolve([]);
			if(props.education){
				addingCourses = prepareMultipleItems(educationRows, 'Course')
				addingInstitutes = prepareMultipleItems(educationRows, 'Institute');
				addingOrganisations = prepareMultipleItems(professionRows, 'Organisation');
				addingDesignations = prepareMultipleItems(professionRows, 'Designation');
			}

			var prepareAlumni = Promise.all([addDepartment(props.department, props.companyID), addDesignation(props.designation, props.companyID), addingCourses , addingInstitutes, addingOrganisations, addingDesignations ]);
		prepareAlumni
		.then(function(dataArray){
			var departmentRows = dataArray[0];
			var designationRows = dataArray[1];
			
			props.courseRows = dataArray[2];
			props.instituteRows = dataArray[3];
			props.organisationRows = dataArray[4];
			props.designationRows = dataArray[5];


			props.departmentID = departmentRows.insertId;
			props.designationID = designationRows.insertId;

			return settings.dbConnection()
			.then(settings.dbTransaction)
			.then(function(connection){
				return addUser([props.firstName , props.middleName , props.lastName , props.email , props.phone, props.companyEmail , props.dob, props.dateOfBirth , props.doj , props.dol , props.departmentID , props.designationID , props.linkedInUrl , props.code , props.salaryLPA , props.companyID , props.sex], connection )
				}).catch(function(err){
					cprint(err,1)
				})
		})
		.then(function(qOb){	
			props.alumnusID = qOb.rows.insertId;
			var connection =qOb.connection;
			var educationRowsArray = [];
			if(!props.education)
				return Promise.resolve({connection:connection})
			props.education.forEach(function(aRow, index){
				educationRowsArray.push([
						props.alumnusID,
						props.courseRows[index],
						props.instituteRows[index],
						aRow["BatchFrom"],
						aRow["BatchTo"],
						aRow["CourseType"],
						aRow["CompanyId"]
					]);
			})
			return addEducationDetails(educationRowsArray , connection);
		}).then(function(qOb){
			var connection = qOb.connection;
			var professionRowsArray = [];
			if(!props.profession)
				return Promise.resolve({connection:connection})
			props.profession.forEach(function(aRow, index){
				professionRowsArray.push([
						props.alumnusID,
						props.designationRows[index],
						props.organisationRows[index],
						aRow['FromTimestamp'],
						aRow['ToTimestamp'],
						aRow['CompanyId']
					]);
			});
			return addProfessionalDetails(professionRowsArray, connection);
		})
		.then(function(qOb){
			var connection = qOb.connection;
			return	updateStaging(entryID, connection)
		})
		.then(function(qOb){
			var connection = qOb.connection;
			connection.commit(function(err){
				if(err){
					return connection.rollback(function(){
						cprint(err,1);
						connection.release();
						return
					})
				}
				connection.release();
				return;
			})
		})
		.catch(function(err){
			if(err.connection){
				return	rollbackTransaction(err)
			}
			cprint(err,1)
			return
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

	function updateStaging(entryID, connection){
		var query = "Update StagingAlumnusMaster set Status = ? where EntryId = ?";
		var queryArray = ['done',entryID];
		return settings.dbTransactionQuery(connection, query, queryArray);
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

	function addUser(queryArray, connection){
			var query = "Insert ignore into AlumnusMaster (FirstName, MiddleName, LastName, Email, Phone, CompanyEmail, Dob, DateOfBirth, DateOfJoining, DateOfLeaving, DepartmentId, DesignationId, LinkedinURL, Code, SalaryLPA, CompanyId, Sex ) values ( ?,?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? )";
				return settings.dbTransactionQuery(connection, query, queryArray);
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
	//sanitize(taskID, companyID)
	settings.sanitize = sanitize;
	

}