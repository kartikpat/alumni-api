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

	app.post("/company/:companyID/register", function(req, res){
		var companyID = req.params.companyID;
		var email = req.body.email || null,
			name = req.body.name || null,
			password = req.body.password || null,
			accessLevel = req.body.accessLevel || null;
		if(!(email && password && accessLevel && name))
			return settings.unprocessableEntity(res);

		registerAccess(companyID, name, email, accessLevel, password)
		.then(function(rows){
			return res.json({
				status: "success"
			});
		})
		.catch(function(err){
			cprint(err,1);
			return settings.serviceError(res);
		})
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
		uploader.upload(fileName, fileStream, storagePath, 'public-read', function(err, data){
			if(err){
				cprint(err,1);
				return settings.serviceError(res);
			}
			var password =uuidV4().replace(/\-/g,"");
			addCompany(organisation, fileName, wUrl)	
			.then(function(rows){
				var insertID = rows.insertId;
				return registerAccess(insertID, name, email, 'master', password)
			})
			.then(function(rows){
				res.json({
					status: 'success'
				})
				var link = config["app"]["web"]["domain"]+"/verify?e="+email+"&k="+password; 
				if(email.indexOf('@iimjobs.com') >-1){
					var ob = {};
					ob[email] = {
						link: link,
						email:email,
						companyName: organisation
					}
					return settings.sendMail("Welcome", template, email, ob).then(function(rows){
						cprint(rows)
					})
					.catch(function(err){
						return cprint(err,1)
					})
				}
				return
			})
			.catch(function(err){
				cprint(err,1);
				if(err.errno)
					return settings.conflict(res);
				return settings.serviceError(res);
			})
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

		if(! (password && newPassword && id)){
			return settings.unprocessableEntity(res);
		};
		password = getHash(password);
		var validatingPassword = validatePassword(email, password);
		validatingPassword.then(function(rows){
			if(rows.length<1){
				return Promise.reject(new Error("incorrect"));
			}
			return updatePassword(id, newPassword);
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
			console.log(password)
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
	
}