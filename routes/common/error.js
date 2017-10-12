/**
 * A module containing wrappers for api error responses
 * @module api-error-responses
 */



module.exports = function(settings){
	
	/**
	 * returns HTTP code 422. message argument ovverides the default message
	 * @param  {object} res     express response object
	 * @param  {string} message any sensible error message that would do justice to error code. Tend to keep it simple.	
	 * @return {object}         
	 */
	function unprocessableEntity(res, message, data){
		if(!message){
			message = 'missing parameters'; 
		}
		return res.status(422).json({
			status: 'fail',
			data: data,
			message: message
		});
	}

	/**
	 * returns HTTP code 400. message argument ovverides the default message
	 * @param  {object} res     express response object
	 * @param  {string} message any sensible error message that would do justice to error code. Tend to keep it simple.	
	 * @return {object}         
	 */
	function badRequest(res, message){
		if(!message){
			message = 'bad request';
		}
		return res.status(400).json({
			status: 'fail',
			message: message
		})
	}

	/**
	 * returns HTTP code 401. message argument ovverides the default message
	 * @param  {object} res     express response object
	 * @param  {string} message any sensible error message that would do justice to error code. Tend to keep it simple.	
	 * @return {object}         
	 */
	function unAuthorised(res, message, expiredToken){
		if(!message)
			message = 'user not authorised'

		return res.status(401).json({
			expiredToken: expiredToken,
			status: 'fail',
			message: message
		})
	}

	/**
	 * returns HTTP code 503. message argument ovverides the default message
	 * @param  {object} res     express response object
	 * @param  {string} message any sensible error message that would do justice to error code. Tend to keep it simple.	
	 * @return {object}         
	 */
	function serviceError(res, message){
		if(!message)
			message = 'service unavailable'

		return res.status(503).json({
			status: 'fail',
			message: message
		})
	}

	/**
	 * returns HTTP code 404. message argument ovverides the default message
	 * @param  {object} res     express response object
	 * @param  {string} message any sensible error message that would do justice to error code. Tend to keep it simple.	
	 * @return {object}         
	 */
	function notFound(res, message){
		if(!message)
			message = 'not found'		
		return res.status(404).json({
			status: 'fail',
			message: message
		})
	}

	/**
	 * returns HTTP code 409. message argument ovverides the default message
	 * @param  {object} res     express response object
	 * @param  {string} message any sensible error message that would do justice to error code. Tend to keep it simple.	
	 * @return {object}         
	 */
	function conflict(res, message){
		if(!message)
			message = 'a duplicate entry was found'
		return res.status(409).json({
			status: 'fail',
			message: message
		});
	}

	function emptyResponse(res, message){
		if(!message)
			message = 'No entry found'
		return res.json({
			status: 'fail',
			message: message
		});	
	}

	settings.unprocessableEntity = unprocessableEntity;
	settings.badRequest = badRequest;
	settings.unAuthorised = unAuthorised;
	settings.serviceError = serviceError;
	settings.notFound = notFound;
	settings.conflict = conflict;
	settings.emptyResponse = emptyResponse;
}