var crypto = require('crypto');
var fs = require('fs');
var uploader = require('../../lib/upload.js');
var template = fs.readFileSync("./test.html", 'utf8');
var templateForgotPassword = fs.readFileSync("./forgot-password.html", 'utf8')
var uuidV4 = require("uuid/v4");
var moment = require('moment');

function getHash(aString){
	if(!aString)
		return "";
	return crypto.createHash('md5').update(aString).digest('hex');
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

	app.post("/company/:companyID/register", async function(req, res){
		var companyID = req.params.companyID;
		var email = req.body.email || null,
			name = req.body.name || null,
			password = req.body.password || null,
			accessLevel = req.body.accessLevel || null;
		if(!(email && password && accessLevel && name))
			return settings.unprocessableEntity(res);
		try{
			password =uuidV4().replace(/\-/g,"");
			var companyRows = await fetchCompanyName(companyID);
			if(companyRows.length<1)
				return settings.notFound(res, 'no company');
			var organisation = companyRows[0]['Name'];
			var rows = await registerAccess(companyID, name, email, accessLevel, password);
			var link = config["app"]["web"]["domain"]+"/verify?e="+email+"&k="+password; 
			var ob = {};
			res.json({
				status: 'success'
			});
			ob[email] = {
				link: link,
				email:email,
				companyName: organisation
			}
			var mailRows = await settings.sendMail("Welcome", template, email, ob);
			cprint(mailRows,1);
		}catch(err){
			cprint(err,1);
			return settings.serviceError(res);
		}
	});

	function addSubscription(){

	}

	app.post('/company/:companyID/services', async function(req, res){
		var companyID = req.params.companyID;
		var serviceArray = req.body.serviceArray || null;
		if(!serviceArray)
			return settings.unprocessableEntity(res);
		try{
			var subscriptionArray = []
			serviceArray = serviceArray.split(',');
			serviceArray.forEach(function(aService){
			})
			
			var rows = await addSubscription()
		}
		catch(err){
			cprint(err,1)
			return settings.serviceError(res);
		}
	})

	app.post("/company/add", multer.single('logo'), function(req, res){
		var name = req.body.name || null,
			logo = req.body.logo || null,
			logoBase64 =req.body.logoBase64 || null,
			email = req.body.email || null,
			wUrl = req.body.wUrl || null,
			organisation = req.body.organisation || null;
		if(!(name && email && wUrl &&  organisation && (req.file|| logoBase64))){
			return settings.unprocessableEntity(res);
		}
		var fileStream = null;
		if(logoBase64){
			logoBase64 = logoBase64.replace(/^data:image\/png;base64,/, "");
			fileStream = new Buffer(logoBase64, 'base64') // to be used when loading through disk
		}
		else
			fileStream = req.file.buffer;
		var t = moment();
		var storagePath = config["aws"]["s3"]["bucket"] +"/"+t.format('YYYY/MM/DD')
		var fileName = t.format('YYYY-MM-DD-HH-MM-SS-x')+'.jpg';
		var timestamp = Date.now();
		uploader.upload(fileName, fileStream, storagePath, 'public-read', async function(err, data){
			if(err){
				cprint(err,1);
				return settings.serviceError(res);
			}
			var password =uuidV4().replace(/\-/g,"");
			try{
				var companyRows = await addCompany(organisation, fileName, wUrl);
				var insertID = companyRows.insertId;
				var registerRows = await registerAccess(insertID, name, email, 'master', password);
				var allServices = await fetchServices();
				if(allServices && allServices.length >0){
					var serviceArray = [];
					for(var i=0; i< allServices.length; i ++){
						serviceArray.push([
								 allServices[i]['Id'],
								 insertID,
								 'active',
								 timestamp
							])
					}
					await registerService(serviceArray)
				}
				res.json({
					status: 'success'
				})
				var link = config["app"]["web"]["domain"]+"/verify?e="+email+"&k="+password; 
				var ob = {};
				ob[email] = {
					link: link,
					email:email,
					companyName: organisation
				}
				var mailRows = await settings.sendMail("Welcome", template, email, ob);
				cprint(mailRows);
			}catch(e){
				cprint(e,1);
				if(e.errno)
					return settings.conflict(res);
				return settings.serviceError(res);
			}
		})
	})

	app.post("/forgot", async function(req, res){
		var email = req.body.email || null;
		if(!email)
			return settings.unprocessableEntity(res);
		try{
			var userRows = await fetchUser(email);
			if(userRows.length <1)
				return settings.notFound(res);
			var password = userRows[0]['Password'];
			var name = userRows[0]['Name'];
			var companyName = userRows[0]['CompanyName'];
			var link = config["app"]["web"]["domain"]+"/verify?e="+email+"&k="+password; 
			if(email.indexOf('@iimjobs.com') >-1){
				var ob = {};
				ob[email] = {
					link: link,
					email:email,
					name: name,
					companyName: companyName
				}
				var sendingMail = await settings.sendMail("Forgot password?", templateForgotPassword, email, ob)
				return res.json({
					status: 'success'
				});
			}
		}
		catch(err){
			cprint(err,1);
			return settings.serviceError(res);
		}

	})

	app.post('/reset-password', function(req, res){
		var password = req.body.password || null,
			email = req.body.email || null,
			newPassword = req.body.newPassword || null;

		if(! (password && newPassword && email)){
			return settings.unprocessableEntity(res);
		};
		password = getHash(password);
		var validatingPassword = validatePassword(email, password);
		validatingPassword.then(function(rows){
			if(rows.length<1){
				return Promise.reject(new Error("incorrect"));
			}
			return updatePassword(email, newPassword);
		})
		.then(function(updationRows){
			return res.json({
				status: "success",
				message: 'updated successfully'
			});
		})
		.catch(function(err){
			if(err.message == 'incorrect')
				return settings.unAuthorised(res);
			cprint(err,1);
			return settings.serviceError(res);
		});
	});

	app.post('/verify', function(req, res){
		var key = req.body.key || null,
			email = req.body.email || null,
			password = req.body.password || null;

		if(! (key && password && email)){
			return settings.unprocessableEntity(res);
		};
		var validatingPassword = validatePassword(email, key);
		validatingPassword.then(function(rows){
			if(rows.length<1){
				return Promise.reject(new Error("incorrect"));
			}
			return updatePassword(email, password);
		})
		.then(function(updationRows){
			return res.json({
				status: "success",
				message: 'updated successfully'
			});
		})
		.catch(function(err){
			if(err.message == 'incorrect')
				return settings.unAuthorised(res);
			cprint(err,1);
			return settings.serviceError(res);
		});
	});

	function updatePassword(email, password){
		password = getHash(password);
		var query = "Update CompanyAccess set Password = ? where Email= ?";
		var queryArray = [password, email];
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		});
	}

	function validatePassword(email, password){
		var query = "Select Id, Email from CompanyAccess where Email = ? and Password = ?";
		var queryArray = [email, password]
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		})
	}

	function registerAccess(companyID, name, email, accessLevel, password){
		var query = "Insert into CompanyAccess (CompanyId, Name, Email, AccessLevel, Password, Status) values (?, ?, ?, ?, ?, ?)";
		var queryArray = [companyID, name, email, accessLevel, password, 'active'];
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		})
	}

	function addCompany(name, logoPath, websiteUrl){
		var query = "Insert into CompanyMaster (Name, Logo, WebsiteUrl,Status) values (?, ?, ?, ?)";
		var queryArray = [ name, logoPath, websiteUrl, 'active']
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		})
	}

	function fetchUser(email){
		var query = 'Select ca.Email, ca.Password, ca.Name, cm.Name as CompanyName from CompanyAccess ca inner join CompanyMaster cm on ca.CompanyId = cm.Id where ca.Email = ? and ca.Status = ? and cm.Status = ?';
		var queryArray = [ email, 'active', 'active'];
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		})
	}

	function registerService(serviceArray){
		var query = "Insert into ServicesAccess (ServiceId, CompanyId, Status, CreatedAt) values ?";
		var queryArray = [serviceArray]
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		})
	}
	
	function fetchServices(){
		var query = "Select * from ServicesMaster";
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query);
		})
	}

	function fetchCompanyName(companyID){
		var query = "Select * from CompanyMaster where Id = ?";
		var queryArray = [companyID];
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		})

	}
}