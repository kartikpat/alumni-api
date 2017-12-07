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
			type = req.body.type || null;
		if(!(institute && course))
			return settings.unprocessableEntity(res);
		if(type && ['full-time','part-time','distance','executive','certification'].indexOf(type) == -1)
			return settings.unprocessableEntity(res, 'invalid course type');
		return next();
	}


	app.post("/company/:companyID/alumni/:alumnusID/education/", validate, async function(req, res){
		var companyID = req.params.companyID,
			alumnusID = req.params.alumnusID;
		var course = req.body.course || null,
			institute = req.body.institute || null,
			batchTo = req.body.batchTo || null,
			batchFrom = req.body.batchFrom || null,
			type = req.body.type || null;
		try{
			var prepareEducation = await Promise.all([ addCourse(course), addInstitute(institute) ]);
			var courseID = prepareEducation[0].insertId;
			var instituteID = prepareEducation[1].insertId;
			await addEducationDetails(alumnusID, courseID, instituteID, batchFrom, batchTo, type, companyID);
			return res.json({
				status: "success"
			});
		}
		catch(err){
			cprint(err,1);
			return settings.serviceError(res);
		}
	});

	app.post("/company/:companyID/alumni/:alumnusID/education/:entryID", validate, async function(req, res){
		var companyID = req.params.companyID,
			alumnusID = req.params.alumnusID,
			entryID = req.params.entryID;
		var course = req.body.course || null,
			institute = req.body.institute || null,
			batchTo = req.body.batchTo || null,
			batchFrom = req.body.batchFrom || null,
			type = req.body.type || null;
		try{
			var prepareEducation = await Promise.all([ addCourse(course), addInstitute(institute) ]);
			var courseID = prepareEducation[0].insertId;
			var instituteID = prepareEducation[1].insertId;
			await updateEducationDetails(entryID, alumnusID, courseID, instituteID, batchFrom, batchTo, type, companyID);
			return res.json({
				status: 'success'
			})
		}
		catch(err){
			cprint(err,1);
			return settings.serviceError(res);
		}
	})

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

	function updateEducationDetails(entryID,alumnusID, courseID, instituteID, batchFrom, batchTo, courseType, companyID){
		var query = "Update EducationDetails Set CourseId = ?, InstituteId = ?, BatchFrom = ?, BatchTo = ?, CourseType = ? where EntryId = ?"
		var queryArray = [ courseID, instituteID, batchFrom, batchTo, courseType, entryID];
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		})	
	}
}