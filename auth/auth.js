

module.exports = function(settings){
    var cprint = settings.cprint;

    function isAuthenticated(req,res,next) {
        // TODO: Remove for production

        var expiresIn = 60*60;
        var token = req.get('Authorization');
        cprint(token)
        if(token) {
            token = token.replace('Bearer ','');
            settings.keyExists(token).then(function(reply){
                if(reply) {
                    return settings.setKey(token, expiresIn)
                }
                else {
                    return settings.unAuthorised(res);
                }
            }).then(function(reply){
                if(reply) {
                    next()
                }
            }).catch(function(err){
    			cprint(err,1)
    			return settings.serviceError(res);
    		})
        }
        else {
            return settings.serviceError(res);
        }
    }
    settings.isAuthenticated = isAuthenticated;
}

function getCookie(cname,req) {
    var name = cname + "=";
    var decodedCookie = decodeURIComponent(req.headers.cookie);

    var ca = decodedCookie.split(';');
    for(var i = 0; i <ca.length; i++) {
        var c = ca[i];

        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }

        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}
