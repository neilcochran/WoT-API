import 'reflect-metadata'; //required for TypeORM
import express, { Express, NextFunction, Request, Response } from 'express';
import dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import path from 'path';
import { Card } from './entity/Card';
import { CardSet } from './entity/CardSet';
import { getSetName, getSetNumberFromCardName, populateCardDatabase } from './cardUtil';
import { existsSync } from 'fs';

dotenv.config();

const port = process.env.APP_PORT ? parseInt(process.env.APP_PORT) : 8080;
const host = process.env.APP_HOST ?? 'localhost';

//Connect to the database using TypeORM
const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    synchronize: true,
    logging: process.env.DB_LOGGING?.toLocaleLowerCase() === 'true',
    entities: [path.join(__dirname,  'entity/**.js',)],
    subscribers: [],
    migrations: [],
});

//Initialize the Express app
const app: Express = express();

/**
 * API base home route
 */
app.get('/', (req: Request, res: Response) => {
    res.send('Welcome to the WoT-API');
});

/**
 * Return all the cards
 */
app.get('/cards/', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const cards = await dataSource.getRepository(Card).find();
        res.status(200).send(JSON.stringify(cards));
    } catch(error: unknown) {
        next(error);
    }
});

/**
 * Return the single card with the matching unique name (for example: '02-131_the_prophet')
 */
app.get('/cards/:cardName', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const card = await dataSource.getRepository(Card).findOneBy({name: req.params.cardName});
        card == null
            ? res.status(404).send()
            : res.status(200).send(JSON.stringify(card));
    } catch(error: unknown) {
        next(error);
    }
});

/**
 * Return the image of a given card
 */
app.get('/cards/:cardName/image', (req: Request, res: Response, next: NextFunction) => {
    const imagePath = path.join(__dirname, '..\\res\\card_images', getSetName(getSetNumberFromCardName(req.params.cardName)), req.params.cardName + '.jpg');
    existsSync(imagePath)
        ? res.status(200).sendFile(imagePath)
        : res.status(404).send();
});

/**
 * Return the indicated card set
 */
app.get('/cards/sets/:setNum/', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const setNum = parseInt(req.params.setNum);
        if(setNum < 0 || setNum > 4) {
            res.status(404).send(`Invalid set number: ${setNum}. Valid set numbers are: 0-4`);
        } else {
            const set = await dataSource.getRepository(CardSet).find({
                relations: ['cards'],
                where: {setNum: setNum}
            });
            set == null
                ? res.status(404).send()
                : res.status(200).send(JSON.stringify(set));
        }
    } catch(error: unknown) {
        next(error);
    }
});

/**
 * Return the card with the matching id from within the given set
 */
app.get('/cards/sets/:setNum/:numInSet', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const setNum = parseInt(req.params.setNum);
        const numInSet = parseInt(req.params.numInSet);
        if(setNum < 0 || setNum > 4) {
            res.status(404).send(`Invalid set number: ${setNum}. Valid set numbers are: 0-4`);
        } else {
            const card = await dataSource.getRepository(Card).find({
                relations: ['set'],
                where: {
                    set: { setNum: setNum},
                    numInSet: numInSet
                }
            });
            card.length != 1
                ? res.status(404).send()
                : res.status(200).send(JSON.stringify(card));
        }
    } catch(error: unknown) {
        next(error);
    }
});

/**
 * Unknown error handler will simply return 500 for all errors it receives
 */
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
    console.error(error);
    res.status(500).send('The server encountered an error processing the request');
});

/**
 * Start the app
 */
app.listen(port, host, async () => {
    console.log(`WoT-API server is running at ${host}:${port}`);
    try {
        await dataSource.initialize();
        console.log('Database connected');
        if(process.env.DB_POPULATE?.toLocaleLowerCase() == 'true'){
            await populateCardDatabase(dataSource);
            console.log('Database was successfully populated');
        }
    } catch(error: unknown) {
        if(error instanceof Error) {
            console.error('Database error:', error.message);
        }
    }
});