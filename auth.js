

module.exports = function(settings){

    function isAuthenticated(req,res,next) {
        // TODO: Remove for production
        return next()
        var expiresIn = 60*60;
        var token = req.get('Authorization');
        console.log(token)
        token = token.replace('Bearer ','');
        settings.keyExists(token).then(function(reply){
            if(reply) {
                settings.setKey(token, expiresIn).then(function(reply){
                    return next();
                })
            }
            else {
                return settings.unAuthorised(res);
            }
        })
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
