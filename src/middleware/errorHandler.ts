import { Response, Request, NextFunction } from 'express';

/**
 * A simple error handler middleware that logs error information to the server and returns a 500 to the requestor
 * @param error The error object
 * @param req The request
 * @param res The response
 * @param next The next function to invoke the next middleware
 */
export const errorHandler = function(error: Error, req: Request, res: Response, next: NextFunction) {
    console.error(`Request Path: '${req.path}'`);
    console.error('Query Params: ', req.query);
    console.error(error);
    res.status(500).send('The server encountered an error processing the request');
};