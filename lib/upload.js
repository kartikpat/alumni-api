var aws = require('aws-sdk');
var fs = require('fs');
var config = require('../configuration.json')["aws"]["credentials"];
aws.config.update({
	accessKeyId: config["accessKeyId"],
    secretAccessKey: config["secretAccessKey"],
    "region": config["region"]
})

var file = fs.createReadStream('./storage/company/logo/1510214161993.jpg')

var s3 = new aws.S3({'signatureVersion': 'v4', 'params': {'Bucket': 'alumni-media-dev'}});

exports.upload = function(fileName, fileStream, bucket, permission, callback){
	var params = {
		Key: fileName,
		Body: fileStream
	}
	if(bucket)
		params['Bucket'] = bucket
	if(permission =='public-read')
		params['ACL']
	s3.putObject(params, function(err, data){
		if(err){
			console.log(err,1);
			return callback(err, null)
		}
		return callback(null, data)
	})
}