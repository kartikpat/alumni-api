var aws = require('aws-sdk');
var config = require('../configuration.json')["aws"]["credentials"];
aws.config.update({
	accessKeyId: config["accessKeyId"],
    secretAccessKey: config["secretAccessKey"],
    "region": config["region"]
})
var s3 = new aws.S3({'signatureVersion': 'v4'});

function getObjectSignedUrl(bucket, path, expiry=30){
	var options = {
		Bucket: bucket,
		Key: path,
		Expires: expiry
	}
	return s3.getSignedUrl('getObject', options);
}
exports.getObjectSignedUrl = getObjectSignedUrl;