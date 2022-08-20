import 'reflect-metadata'; //required for TypeORM
import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import { DataSource } from 'typeorm';


dotenv.config();

const port = process.env.APP_PORT ? parseInt(process.env.APP_PORT) : 8080;
const host = process.env.APP_HOST ?? 'localhost';

const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5243,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    synchronize: true,
    logging: true,
    entities: [],
    subscribers: [],
    migrations: [],
});

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
    dataSource.initialize()
        .then(() => console.log('Database connected'))
        .catch(error => console.log('Database connection error:', error));
});