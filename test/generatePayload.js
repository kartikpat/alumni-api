var payload = [];
var fs = require ('fs');
var designation = ["Tech", "Sales", "Operations", "HR"]
for(var i=0; i<10; i++){
	var user = {
		firstName : "user-"+i,
		middleName: "middleName-"+i,
		lastName: "lastName-"+i,
		phone: "99887766"+i,
		dob: Date.now()- (i*100 + 100000),
		doj: Date.now() - (i*20000),
		dol: Date.now() - (i*10000),
		email: "user-"+i+"@gmail.com",
		designation: designation[(Math.random() *designation.length)],
		education: [],
		profession: []
	}
	for(var j=0; j<3; j++){
		user.education.push({
			name: "Course - "+i,
			institute: "Institute - "+i,
			from: Date.now() - (i*20000),
			to: Date.now() - (i*10000),
			type: (Date.now()%2 ==0) ? 'full' : 'part'
		})
	}
	for(var j=0; j<3; j++){
		user.profession.push({
			name: "Role - "+i,
			company: "Company - "+i,
			from: Date.now() - (i*20000),
			to: Date.now() - (i*10000)
		})
	}
	payload.push(user);
}
fs.writeFile(__dirname+"/payload.json" ,JSON.stringify(payload), function(err){
	if(err)
		return console.log(err);
	console.log("All done.")
})	