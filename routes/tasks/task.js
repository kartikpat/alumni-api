 module.exports = function(settings){
	var app = settings.app;
	var mode = settings.mode;
	var config = settings.config;
	var env = settings.env;
	var cprint = settings.cprint;

    function validate(req, res, next){
		if(( req.query.pageNumber && req.query.pageNumber <1 ) || !req.query.userID )
			return settings.unprocessableEntity(res);
		return next();
	}

	app.get('/company/:companyID/tasks/:taskID',settings.isAuthenticated, validate , function(req, res){
		var companyID = req.params.companyID,
			taskID = req.params.taskID;
		var userID = req.query.userID,
            pageNumber = req.query.pageNumber || 1,
			pageContent = req.query.pageContent || 150;
        var data = [];
        
		fetchPersonalDetails(taskID, userID, pageNumber, pageContent)
		.then(function(rows){

			rows.forEach(function(aRow){

                data.push({
					id: aRow["EntryId"],
					firstName: aRow["FirstName"],
					middleName: aRow["MiddleName"],
					lastName: aRow["LastName"],
					email: aRow["Email"],
					companyEmail: aRow["CompanyEmail"],
					phone: aRow["Phone"],
					dob: aRow['Dob'],
					dol: aRow["DateOfLeaving"],
					doj: aRow["DateOfJoining"],
					department: aRow['Department'],
					designation: aRow["Designation"],
					linkedInURL: aRow["LinkedinURL"],
					code: aRow["Code"],
					salary: aRow["SalaryLPA"],
					sex: aRow["Sex"],
					personalErrMsg: aRow["PersonalErrMsg"],
    				course: aRow['Course'],
    				institute: aRow['Institute'],
    				batchFrom: aRow['BatchFrom'],
    				batchTo: aRow['BatchTo'],
    				type: aRow['CourseType'],
    				previousDesignation: aRow['PreviousDesignation'],
    				previousOrganisation: aRow['PreviousOrganisation'],
    				organisationFrom: aRow['OrganisationFrom'],
    				organisationTo: aRow['OrganisationTo'],
                    professionalErrMsg: aRow['professionalErrMsg'],
                    educationErrMsg: aRow['educationErrMsg']
				});
			});
            return res.json({
                data: data,
                status: 'success'
            })
		})
		.catch(function(err){
			cprint(err,1)
			return settings.serviceError(res);
		})
	});

    function findObject(obj,email) {
        for (var i=0, iLen=obj.length; i<iLen; i++) {
            if (obj[i].email == email) return obj[i];
        }
    }


    function fetchPersonalDetails(taskID, userID,pageNumber,pageContent){
        var offset = (pageNumber-1)*pageContent;
        pageContent = parseInt(pageContent)
		var query = "Select sam.EntryId, sam.FirstName, sam.MiddleName, sam.LastName, sam.Email, sam.CompanyEmail, sam.Phone, sam.Dob, sam.DateOfLeaving, sam.DateOfJoining, sam.Department, sam.Designation, sam.LinkedinURL, sam.Code, sam.SalaryLPA, sam.Sex, sam.PersonalErrMsg, sam.PreviousDesignation, sam.PreviousOrganisation, sam.OrganisationFrom, sam.OrganisationTo, sam.professionalErrMsg, sam.Course, sam.Institute, sam.BatchFrom, sam.BatchTo, sam.CourseType, sam.educationErrMsg, sam.message from stagingAlumnusDetails sam inner join TaskMaster tm on tm.Id = sam.TaskId where tm.Id = ? and tm.UserId = ? and ((sam.professionalErrMsg is not null and sam.professionalErrMsg !=?) or (sam.PersonalErrMsg is not null and sam.PersonalErrMsg !=?) or (sam.educationErrMsg is not null and sam.educationErrMsg !=?)) and (sam.message != ? or sam.message is null)";
        query+= ' limit ?, ?';
		var queryArray = [ taskID, userID , 'discarded','discarded','discarded','discarded', offset, pageContent];
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		})
	}
}
