var fs = require("fs");
var readline = require("readline");
var Papa = require('papaparse');


var fileStream = fs.createReadStream(__dirname+'/test-data.csv', 'utf8')
var data= [];
           
fileStream.on('open', function(){
	console.log("opened")
})
fileStream.on('error', function(err){
	// this.close();
	console.log(err)
});
fileStream.on('end',function(){
	console.log('end')
});
fileStream.on('data', function(data){
	// console.log(data)
})

// var rl = readline.createInterface({
// 	input: fileStream,
//   	output: process.stdout	
// })


var mapper = {
	"Employee Name": 	 "FirstName",
	"": 	 "LastName",
	"": 	 "MiddleName",
	"Personal email id": 	 "Email",
	"Contact Details": 	 "Phone",
	"Email id": 	 "CompanyEmail",
	"": 	 "Dob",
	"DOJ": 	 "DateOfJoining",
	"Relieved Date": 	 "DateOfLeaving",
	"Department": 	 "Department",
	"Designation": 	 "Designation",
	"": 	 "LinkedInURL",
	"HOC Code": 	 "Code",
	"": 	 "SalaryLPA",
	"": 	 "Sex",
	"": 	 "CompanyId"
}


// rl.on('line', function(line){

// })

Papa.parse(fileStream ,{
	header: true,
	delimiter: ",",
	error: function(err){
		console.log(err)
	},
	beforeFirstChunk: function(chunk) {
        var rows = chunk.split( /\r\n|\r|\n/ );
        var headings = rows[0]
        for(var key in mapper){
        	if(key){
        		headings =headings.replace(RegExp(key, "g"), mapper[key])
        	}
        }
        rows[0] = headings;
        return rows.join("\r\n");
    },
	step: function(row, parser)	{
		parser.pause();
		 setTimeout(function() {
			data.push(row.data[0]);
			console.log(data.length)
			parser.resume();
			return
		}, 100);
	},
	complete: function(){
		console.log("done");
	}

})

