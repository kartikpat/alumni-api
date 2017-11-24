var aws = require('aws-sdk');
var config = require('../../configuration.json')["q"]["news"];

aws.config.update({
	accessKeyId: config["accessKey"],
    secretAccessKey: config["secretKey"],
    region: config["region"]
})

var sqs = new aws.SQS();

var qURL =config["url"]

// var accountNumber = "103293947098";
// var params = {
//   QueueName: 'test',  required 
//   QueueOwnerAWSAccountId: accountNumber
// };

// Sample message object
// {
// 	event: 'subscribe',
// 	id: 12334,
// 	email: 'testingabc@gmail.com',
// 	payload: {
// 		name: 'testing',
// 		company: 'Abc private limited'
// 	},
// 	templateId: 2,
// 	groupId: 1,
// 	dob: 'sometimestamp',
// 	timestamp: Date.now()
// }
function sendMessage(message){
	var params = {
        MessageBody: JSON.stringify(message),
        QueueUrl: qURL,
        MessageGroupId: "1",
        DelaySeconds: 0
    };
    sqs.sendMessage(params, function(err, data){
    	if(err)
    		console.log(err)
    	console.log(data)
    })
}	

function receiveMessage(){
	var params = {
		QueueUrl: qURL,
		VisibilityTimeout: 60,
		MaxNumberOfMessages: 10
	}
	sqs.receiveMessage(params, function(err, data){
		console.log(data)
	})
}

module.exports = sendMessage;


