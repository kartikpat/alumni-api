var moment = require('moment');
var uploader = require('../../lib/upload.js');
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
const Multer = require('multer');
const multer = Multer({
  storage: Multer.memoryStorage(),
  // limits: {
  //   fileSize: 5 * 1024 * 1024 // no larger than 5mb
  // },
  onError : function(err, next) {
      console.log('error', err);
      next(err);
    }
});

module.exports = function(settings){
	var app = settings.app;
	var mode = settings.mode;
	var config = settings.config;
	var env = settings.env;
	var cprint = settings.cprint;

	function validate(req, res, next){
		var firstName = req.body.firstName || null,
			middleName = req.body.middleName || null,
			lastName = req.body.lastName || null,
			email = req.body.email || null,
			companyEmail = req.body.companyEmail || null,
			phone = req.body.phone || null,
			designation = req.body.designation || null,
			department = req.body.department || null,
			institute = req.body.institute || null,
			course = req.body.course || null,
			linkedInURL = req.body.linkedInURL || null;

		var salary = req.body.salary || null;

		var dob = req.body.dob || null,
			dol = req.body.dol || null,
			doj = req.body.doj || null;

		var	imageBase64 =req.body.imageBase64 || null;

		if(!( firstName && email && designation && department && doj && companyEmail ))
			return settings.unprocessableEntity(res);
		if(!( checkDateUTC(doj) ))
			return settings.unprocessableEntity(res, 'invalid date format');
		if(  (dol && !checkDateUTC(dol)) || (dob && !checkDate(dob)) )
			return settings.unprocessableEntity(res, 'invalid date format');


		return next()
	}

	app.post("/company/:companyID/alumni",settings.isAuthenticated, multer.single('image'),validate, async function(req, res){
		var companyID = req.params.companyID;
		var userID = req.query.userID;
		var firstName = req.body.firstName || null,
			middleName = req.body.middleName || null,
			lastName = req.body.lastName || null,
			email = req.body.email || null,
			companyEmail = req.body.companyEmail || null,
			phone = req.body.phone || null,
			designation = req.body.designation || null,
			department = req.body.department || null,
			institute = req.body.institute || null,
			course = req.body.course || null,
			code = req.body.code || null,
			linkedInURL = req.body.linkedInURL || null;

		var salary = req.body.salary || null;

		var sex = req.body.sex || null;

		var dob = moment(req.body.dob, 'DD/MM/YYYY').format('x'),

			dol = req.body.dol || null,
			doj = req.body.doj || null;

		var dateOfBirth = moment(req.body.dob, 'DD/MM/YYYY').format('YYYY-MM-DD');

		try{
			var fileStream = null;
			var imageBase64 = req.body.imageBase64 || null;
			if(imageBase64){
			imageBase64 = imageBase64.replace(/^data:image\/png;base64,/, "");
			fileStream = new Buffer(imageBase64, 'base64') // to be used when loading through disk
			}
			else if(req.file)
				fileStream = req.file.buffer;
			var t = moment();
			var storagePath = config["aws"]["s3"]["bucket"] +"/profileImages/"+t.format('YYYY/MM/DD')
			var fileName = t.format('YYYY-MM-DD-HH-MM-SS-x')+'.jpg';
			const prepareAlumni = await Promise.all([ addDepartment(department, companyID), addDesignation(designation, companyID), uploadFile(fileName, fileStream,storagePath)]);
			const departmentID = prepareAlumni[0].insertId;
			const designationID = prepareAlumni[1].insertId;
			const imageName = (prepareAlumni[2]===1) ? null: prepareAlumni[2];

			const insertAlumni = await addAlumni(firstName, middleName, lastName, email, phone, companyEmail, dob, dateOfBirth, doj, dol, departmentID, designationID, linkedInURL, code, salary, companyID, sex, imageName);
			const alumnusID = insertAlumni.insertId;


			await mapAlumniGroup(alumnusID, department, companyID)
			var serviceRows = await fetchServices(userID)
			var subscriptionArray = [];
			serviceRows.forEach(function(aService){
				subscriptionArray.push([
					aService['ServiceId'],
					alumnusID,
					'active'
					])
			})
			await subscribe(subscriptionArray);
			return res.json({
				data: alumnusID,
				status : 'success',
				message: 'record inserted successfully'
			});
		}
		catch(err){
			cprint(err,1);
			if(err.errno == 1062)
				return settings.conflict(res);
			return settings.serviceError(res);
		}

	});


	function uploadFile(fileName, fileStream, storagePath){
		return new Promise(function(resolve, reject){
				if(!fileStream)
					return resolve(1);
				uploader.upload(fileName, fileStream, storagePath, 'public-read', function(err, data){
					if(err){
						reject(err)
					}
					resolve(fileName)
				})
			})
	}

	function mapAlumniGroup(alumnusID, group, companyID){
		var query = "Insert into AlumniGroupMapping (AlumnusId, `Group`, CompanyId, Status) values(?, ?, ?, ?)";
		var queryArray = [alumnusID, group, companyID, "active"]
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		})
	}

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

	function addAlumni(firstName , middleName , lastName , email , phone, companyEmail , dob , dateOfBirth, doj , dol , departmentID , designationID , linkedInUrl , code , salaryLPA , companyID , sex, imageName){
		var query = "Insert into AlumnusMaster (FirstName, MiddleName, LastName, Email, Phone, CompanyEmail, Dob, DateOfBirth, DateOfJoining, DateOfLeaving, DepartmentId, DesignationId, LinkedinURL, Code, SalaryLPA, CompanyId, Sex, Image ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,  ?)";
		var queryArray = [firstName , middleName , lastName , email , phone, companyEmail , dob , dateOfBirth, doj , dol , departmentID , designationID , linkedInUrl , code , salaryLPA , companyID , sex, imageName];
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		})
	}

	function fetchServices(userID){
		var query = 'Select ServiceId from ServicesAccess sa inner join ServicesMaster sm on sa.ServiceId = sm.Id inner join CompanyAccess ca on ca.CompanyId = sa.CompanyId inner join CompanyMaster cm on ca.CompanyId = cm.Id where ca.Id = ? and sa.Status = ? and ca.Status = ? and cm.Status = ? ';
		var queryArray = [userID , 'active', 'active', 'active'];
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		})
	}

	function subscribe(subscriptionArray){
		var query = 'Insert into ServiceSubscription ( ServiceId, AlumnusId, Status) values ?';
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, [subscriptionArray]);
		})
	}

}
