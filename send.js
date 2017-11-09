var Mailgun = require('mailgun-js');

module.exports = function(settings){
	var config= settings.config;
	var cprint = settings.cprint;

	//We pass the api_key and domain to the wrapper, or it won't be able to identify + send emails
    var mailgun = new Mailgun({apiKey: config["mail"]["mailgun"]["key"], domain: config["mail"]["mailgun"]["domain"]});

    function sendMail(subject,text, recepientMail, variables){
    	var data = {
	    //Specify email data
	      from: config["mail"]["mailgun"]["sender"],
	    //The email to contact
	      to: recepientMail,
	    //Subject and text data  
	      subject: subject,
	      html: text,
	      'recipient-variables': variables
	    }
	 //    mailgun.messages().send(data, function (err, body) {
	 //        //If there is an error, render the error page
	 //        if (err) {
	 //            cprint(err,1);
	 //        }
	 //        cprint(body);
		// });
    	return new Promise(function(fulfill, reject){
    		 //Invokes the method to send emails given the above data with the helper library
		    mailgun.messages().send(data, function (err, body) {
		        //If there is an error, render the error page
		        if (err) {
		            cprint(err,1);
		            return reject(err);
		        }
		        return fulfill(body);
		    });	
    	})
    }

    settings.sendMail = sendMail;
	
}