import { NextFunction, Request, Response } from 'express';
import { authService } from '../service/AuthService';

/**
 * Authentication middleware checks each request for a valid AuthToken
 * If no valid AuthToken is found send a 401 to indicate the request was denied due to authentication
 * @param req The request to be checked
 * @param res The response
 * @param next The next function to invoke the next middleware
 */
export const authHandler = async function (req: Request, res: Response, next: NextFunction) {
    const token = req.headers['wot-api-key'];
    //The token must be present and a single string
    if(!token || typeof token !== 'string') {
        res.status(401).send();
    } else {
        const authToken = await authService.getAuthTokenByToken(token);
        if(authToken && authService.isAuthTokenValid(authToken)) {
            next();
        } else {
            res.status(401).send();
        }
    }
};
