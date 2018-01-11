var moment = require('moment');
function checkDate(aString){
	var d = moment(aString, 'DD-MM-YYYY');
	if(!d.isValid())
		return null;
	return d.valueOf();

}
function checkDateUTC(aNumber){
	var d = moment(aNumber, 'x')
	if(!d.isValid())
		return null
	return aNumber;
}

function myError(err, data){
	var i = new Error(err);
	i.data = data;
	return i;
}

module.exports = function(settings){
	var app = settings.app;
	var mode = settings.mode;
	var config = settings.config;
	var env = settings.env;
	var cprint = settings.cprint;

	function validate(req, res, next){
		var course = req.body.course || null,
			institute = req.body.institute || null,
			batchFrom = req.body.batchFrom || null,
			batchTo = req.body.batchTo || null,
			type = req.body.type || null,
            email = req.body.email || null;

		if(!(institute && course && email))
			return settings.unprocessableEntity(res);
		if(type && ['full-time','part-time','distance','executive','certification'].indexOf(type) == -1)
			return settings.unprocessableEntity(res, 'invalid course type');
		return next();
	}

	app.post("/company/:companyID/entry/:entryID/alumni/education", validate, async function(req, res){

		var companyID = req.params.companyID,
            entryID = req.params.entryID;

		var course = req.body.course || null,
			institute = req.body.institute || null,
			batchTo = req.body.batchTo || null,
			batchFrom = req.body.batchFrom || null,
			type = req.body.type || null,
            email = req.body.email || null;

		try{
            var alumniDetails = await fetchAlumnus(email, companyID)
            if(alumniDetails.length < 1) {
                throw new Error("Alumni email doesn't exist")
            }
            var alumnusID = alumniDetails[0]["AlumnusId"]
			var prepareEducation = await Promise.all([ addCourse(course), addInstitute(institute) ]);
			var courseID = prepareEducation[0].insertId;
			var instituteID = prepareEducation[1].insertId;
			await addEducationDetails(alumnusID, courseID, instituteID, batchFrom, batchTo, type, companyID);
            await updateStaging(entryID);
			return res.json({
				status: "success",
                message: "record inserted successfully"
			});
		}
		catch(err){
			cprint(err,1);
			if(err.message == "Alumni email doesn't exist") {

				return res.json({
					status: "fail",
					message: "Alumni Doesn't Exist!"
				})
			}
			return settings.serviceError(res);
		}
	});

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

	function addEducationDetails(alumnusID, courseID, instituteID, batchFrom, batchTo, courseType, companyID){
		var query = "Insert into  EducationDetails (AlumnusId, CourseID, InstituteID, BatchFrom, BatchTo, CourseType, CompanyId) values (?, ?, ?, ?, ?, ?, ?)";
		var queryArray = [ alumnusID, courseID, instituteID, batchFrom, batchTo, courseType, companyID ];
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		})
	}

    function fetchAlumnus(email, companyID){
        var query = "Select AlumnusId from AlumnusMaster where Email = ? and CompanyId = ?"
        var queryArray = [email, companyID];
        return settings.dbConnection().then(function(connecting){
            return settings.dbCall(connecting, query, queryArray);
        })
    }

    function updateStaging(entryID){
		var query = "Update stagingAlumnusDetails set educationErrMsg = ? where EntryId = ?";
		var queryArray = [null, entryID];
		return settings.dbConnection().then(function(connecting){
			return settings.dbCall(connecting, query, queryArray);
		})
	}
}
