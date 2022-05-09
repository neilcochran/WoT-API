import express, { Express, Request, Response } from "express";
import dotenv from 'dotenv';

dotenv.config();

const port = process.env.PORT ? parseInt(process.env.PORT) : 8080;
const host = process.env.HOST ?? 'localhost';

const app: Express = express();

/**
 * API base home route
 */
app.get('/', (req: Request, res: Response) => {
    res.send('Welcome to the WoT-API');
});
  
/**
 * Start the app
 */
app.listen(port, host, () => {
    console.log(`WoT-API server is running at ${host}:${port}`);
});