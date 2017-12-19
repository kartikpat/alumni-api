

module.exports = function(settings){

    function isAuthenticated(req,res,next) {
        var expiresIn = 60*60;
        console.log(req.headers.cookie)
        var token = getCookie("token",req)
        settings.keyExists(token).then(function(reply){
            if(reply) {
                settings.setKey(token, expiresIn);
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
