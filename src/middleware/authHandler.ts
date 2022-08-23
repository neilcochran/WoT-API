import { NextFunction, Request, Response } from 'express';

/**
 * Authentication middleware checks each request for a valid AuthToken associated to the user.
 * If no valid AuthToken is found send a 401 to indicate the request was denied due to authentication
 * @param req The request to be checked
 * @param res The response
 * @param next The next function to invoke the next middleware
 */
export const authHandler = function (req: Request, res: Response, next: NextFunction) {
    console.log('in auth handler');
    const token = req.headers['api-auth-key'];
    if(!token) {
        console.log('no token');
        res.status(401).send();
    } else {
        console.log('found token');
        //check if token is is authTokens{} which should be in DB not in AuthService
        next(); //only call next() if valid token, otherwise we don't want to move forward
    }
};
