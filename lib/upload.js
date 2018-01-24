var aws = require('aws-sdk');
var config = require('../configuration.json')["aws"]["credentials"];
aws.config.update({
	accessKeyId: config["accessKeyId"],
    secretAccessKey: config["secretAccessKey"],
    "region": config["region"]
})
var s3 = new aws.S3({'signatureVersion': 'v4'});

function upload(fileName, fileStream, bucket, permission, callback){
	var params = {
		Key: fileName,
		Body: fileStream,
		Bucket: bucket
	}
	if(permission =='public-read')
		params['ACL'] = 'public-read';
	s3.putObject(params, function(err, data){
		if(err){
			return callback(err, null)
		}
		return callback(null, data)
	})
}

exports.upload = upload;
