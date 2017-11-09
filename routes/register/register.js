var crypto = require('crypto');

function getHash(aString){
	if(!aString)
		return "";
	return crypto.createHash('md5').update(aString).digest('hex');
}
const Multer = require('multer');
const multer = Multer({
  storage: Multer.diskStorage({
  	destination: function(req, file, callback){
  		callback(null, './storage/company/logo/')
  	},
  	filename: function(req, file, callback){
  		callback(null, Date.now()+'.jpg')
  	}
  }),
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
	})

	app.post("/company/add",multer.single('logo'), function(req, res){
		var name = req.body.name || null,
			logo = req.body.logo || null,
			email = req.body.email || null,
			wUrl = req.body.wUrl || null,
			organisation = req.body.organisation || null;
		if(!(name && email && wUrl &&  organisation && req.file)){
			return settings.unprocessableEntity(res);
		}
		// if(!(name && email ));
		// 	return settings.unprocessableEntity(res);
		var logoPath = req.file.path;
		var password = getHash('1234');	
		addCompany(organisation, logoPath, wUrl)	
		.then(function(rows){
			var insertID = rows.insertId;
			return registerAccess(insertID, name, email, 'master', password)
		})
		.then(function(rows){
			res.json({
				status: 'success'
			})
			var link = "http://localhost:8080/verify-registration?e="+email+"&k="+password;
			var text = "Hello\n, Please click on the <a href= "+link+">link</a> to verify your registration. For any queries please contact help@iimjobs.com(dummy email)"
			if(email.indexOf('@iimjobs.com') >-1){
				return settings.sendMail("Welcome", text, email, {}).then(function(rows){
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
			return settings.serviceError(res);
		})

	})

	app.post('/reset-password', function(req, res){
		var password = req.body.password || null,
			id = req.body.id || null,
			newPassword = req.body.newPassword || null;

		if(! (password && newPassword && id)){
			return settings.unprocessableEntity(res);
		};
		password = getHash(password);
		var validatingPassword = validatePassword(id, password);
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

	function updatePassword(alumnusID, password){
		password = getHash(password);
		var query = "Update CompanyAccess set Password = ? where Id= ?";
		var queryArray = [password, alumnusID];
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		});
	}

	function validatePassword(alumnusID, password){
		var query = "Select Id, Email from CompanyAccess where Id = ? and Password = ?";
		var queryArray = [alumnusID, password]
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
}