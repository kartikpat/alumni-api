


module.exports = function(settings){
	var cprint = settings.cprint;

	return

	var taskID = "0d7a9818291e40508493198070348788";	
	var companyID = 123;
	function sanitize(taskID, companyID){
		fetchRecords(taskID, companyID)
		.then( sanitizeEachRecord )
	}

	function fetchRecords(taskID, companyID){
		var query = "Select EntryId, email from StagingAlumnusMaster where TaskId = ? and CompanyId = ? and Status = ? limit 0,1";
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

	function sanitizeEachRecord(entryID, email){
		var props = {};
		var alumniDetails = Promise.all([fetchAlumnus(entryID, email), fetchEducation(email), fetchProfession(email)] )
		alumniDetails
		.then(function(dataArray){
			var rows = dataArray[0];
			cprint(dataArray)
			props.firstName = rows[0]["FirstName"];
			props.middleName = rows[0]["MiddleName"];
			props.lastName = rows[0]["LastName"];
			props.email = rows[0]['Email'];
			props.phone = rows[0]['Phone'];
			props.companyEmail = rows[0]['CompanyEmail'];
			props.dob = rows[0]['Dob'];
			props.doj = rows[0]['DateOfJoining'];
			props.dol = rows[0]['DateOfLeaving'];
			props.department = rows[0]['Department'];
			props.designation = rows[0]['Designation'];
			props.linkedInUrl = rows[0]['LinkedinURL'];
			props.code = rows[0]['Code'];
			props.salaryLPA = rows[0]['SalaryLPA'];
			props.sex = rows[0]['Sex'];
			props.companyID = rows[0]['CompanyId'];

			var educationRows = dataArray[1];
			props.education = educationRows || [];

			var professionRows = dataArray[2];
			props.profession = professionRows || [];

			var prepareAlumni = Promise.all(addDepartment, addDesignation, prepareMultipleItems[educationRows, 'Course'], prepareMultipleItems[educationRows, 'Institute'], prepareMultipleItems[professionRows, 'Organisation'], prepareMultipleItems[professionRows, 'Designation'] );
			return prepareAlumni;
		})
		.then(function(dataArray){
			var departmentRows = dataArray[0];
			var designationRows = dataArray[1];
			
			props.courseRows = dataArray[2];
			props.instituteRows = dataArray[3];
			props.organisationRows = dataArray[4];
			props.designationRows = dataArray[5];


			var departmentID = departmentRows.insertId;
			var designationID = designationRows.insertId;

			var initiateTransaction = dbTransaction().then(function(connection){
				return addUser([props.firstName , props.middleName , props.lastName , props.email , props.phone, props.companyEmail , props.dob , props.doj , props.dol , props.departmentID , props.designationID , props.linkedInUrl , props.code , props.salaryLPA , props.companyID , props.sex], connection ).catch(rollbackTransaction);
				})
			return initiateTransaction;

		})
		.then(function(qOb){
			props.alumnusID = qOb.rows.insertId;
			var connection =qOb.connection;
			var educationRowsArray = [];
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
			return addEducationDetails(educationRowsArray , connection).catch(rollbackTransaction);;
		}).then(function(qOb){
			var connection = qOb.connection;
			var professionRowsArray = [];
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
			return addProfessionalDetails(professionRowsArray, connection).catch(rollbackTransaction);
		})
		.then(function(qOb){
			updateStaging(entryID, connection)
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
				return;
			})
		})
		.catch(function(err){
			cprint(err,1);
		})
	}

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
		var queryArray = [entryID];
		return settings.dbTransactionQuery(connection, query, queryArray);
	}

	function addProfessionalDetails(professionalArray, connection){
			var query = "Insert into ProfessionDetails (AlumnusId, DesignationID, OrganisationId, FromTimestamp,ToTimestamp, CompanyId) values ?";
			var queryArray = [ professionalArray ];
			return settings.dbTransactionQuery(connection, query, queryArray);
		}

	function addEducationDetails(educationArray, connection){
			var query = "Insert into EducationDetails (AlumnusId, CourseID, InstituteID, BatchFrom, BatchTo, CourseType, CompanyId) values ?";
			var queryArray = [ educationArray ];
			return settings.dbTransactionQuery(connection, query, queryArray);
		}


	function prepareMultipleItems(rows, key){
		var itemIDArray = [];
		var itemPromiseArray = [];
		rows.forEach(function(anItem){
			var addingItem = addCourse(anItem[key]);
			coursePromiseArray.push(addingItem);
		})
		Promise.all(itemPromiseArray)
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

	function addPastRole(){};
	function addUser(queryArray, connection){
			var query = "Insert into AlumnusMaster (FirstName, MiddleName, LastName, Email, Phone, CompanyEmail, Dob, DateOfJoining, DateOfLeaving, Department, Designation, LinkedinURL, Code, SalaryLPA, CompanyId, Sex ) values ?";
				return settings.dbTransactionQuery(connection, query, queryArray);
		}
	function addCourse(){}
	function addInstitute(){};
	function addCompany(){};


	function addDepartment(departmentName, companyID){
		var query = 'Insert into DepartmentMaster (Department, CompanyId) values (? , ?) On Duplicate key Update id=LAST_INSERT_ID(id), Department = ?, CompanyId = ?';
		var queryArray = [departmentName, companyID, departmentName, companyID];
		return settings.dbConnection().then(function(connecting){
			return settings.dbCall(connecting, query, queryArray);
		})
	}
	sanitize(taskID, companyID)

}