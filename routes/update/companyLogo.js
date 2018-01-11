var uploader = require('../../lib/upload.js');
var moment = require('moment');
var jwt = require("jsonwebtoken");

const Multer = require('multer');
const multer = Multer({
  storage: Multer.memoryStorage(),
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

    function isChangeLogoAccess(req,res,next) {

		var token = req.get('Authorization');

		// get the decoded payload and header
		if(token) {
			token = token.replace('Bearer ','');
			var decoded = jwt.decode(token, {complete: true});

			if(decoded.payload.role == "master") {
				return next()
			}
		}

		return settings.badRequest(res)
	}

    app.post("/company/:companyID/logo",isChangeLogoAccess, multer.single('logo'), function(req, res) {
        var logo = req.body.logo || null,
            logoBase64 =req.body.logoBase64 || null;
        var companyID = req.params.companyID;
        if(!(req.file|| logoBase64)){
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
            try{
                await UpdateCompanyLogo(fileName, companyID);
                res.json({
                    status: 'success'
                })

            } catch(e){

                return settings.serviceError(res);
            }
        })
    })

    function UpdateCompanyLogo(logoPath, companyId){
		var query = "Update CompanyMaster set Logo = ? where Id = ?";
		var queryArray = [logoPath, companyId];
		return settings.dbConnection().then(function(connection){
			return settings.dbCall(connection, query, queryArray);
		});
	}


}
