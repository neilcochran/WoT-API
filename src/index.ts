import 'reflect-metadata'; //required for TypeORM
import express, { Express, NextFunction, Request, Response } from 'express';
import dotenv from 'dotenv';
import { DataSource, In } from 'typeorm';
import path from 'path';
import { Card } from './entity/Card';
import { CardSet } from './entity/CardSet';
import { getSetName, getSetNumberFromCardName, populateCardDatabase } from './cardUtil';
import { existsSync } from 'fs';

enum EndPoint {
    ROOT = '/',
    GET_ALL_CARDS = '/cards/',
    GET_CARD_BY_NAME = '/cards/name/:cardName',
    GET_CARDS_BY_NAME = '/cards/name',
    GET_CARD_IMAGE = '/cards/name/:cardName/image',
    GET_SET_BY_NUMBER = '/cards/sets/:setNum/',
    GET_CARD_IN_SET = '/cards/sets/:setNum/:numInSet'
}

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

const imageResourcesRoot = path.resolve(path.join( __dirname, '..\\res\\card_images'));

//Initialize the Express app
const app: Express = express();

/**
 * API base home route
 */
app.get(EndPoint.ROOT, (req: Request, res: Response) => {
    res.send('Welcome to the WoT-API');
});

/**
 * Returns all the cards
 */
app.get(EndPoint.GET_ALL_CARDS, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const cards = await dataSource.getRepository(Card).find();
        res.status(200).json(cards);
    } catch(error: unknown) {
        next(error);
    }
});

/**
 * Return the single card with the matching unique name (for example: '02-131_the_prophet')
 */
app.get(EndPoint.GET_CARD_BY_NAME, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const card = await dataSource.getRepository(Card).findOneBy({name: req.params.cardName});
        card == null
            ? res.status(404).send()
            : res.status(200).json(card);
    } catch(error: unknown) {
        next(error);
    }
});

/**
 * Returns a card for each card name in the required cardName query parameter.
 * Invalid card names are simply ignored, as are duplicates
 */
app.get(EndPoint.GET_CARDS_BY_NAME, async (req: Request, res: Response, next: NextFunction) => {
    const cardNameParam = req.query['cardName'];
    //enforce the required query param
    if(!cardNameParam) {
        res.status(400).send('The required query parameter \'cardName\' was not provided');
    }
    try {
        //since we allow this parameter to be passed multiple times, it may be a string or a string[].
        const cards = await dataSource.getRepository(Card).find({where: {name: typeof cardNameParam === 'string' ? cardNameParam : In(cardNameParam as string[])}});
        res.status(200).json(cards);
    } catch(error) {
        next(error);
    }
});

/**
 * Return the image of a given card
 */
app.get(EndPoint.GET_CARD_IMAGE, (req: Request, res: Response, next: NextFunction) => {
    const imageDir = path.join(imageResourcesRoot, getSetName(getSetNumberFromCardName(req.params.cardName)));
    //before we resolve the image file path, calculate its full length and then compare it to the resolved path's length.
    //If the lengths do not match, then a cardName was given that resulted in the resolved path changing (for instance if '../' is passed)
    const expectedPathLength = imageDir.length + req.params.cardName.length + 5; // add 5 to account for the one missing path sep and the 4 chars in '.jpg'
    const resolvedImagePath = path.join(imageDir, req.params.cardName + '.jpg');
    if(resolvedImagePath.length !== expectedPathLength){
        const errorMsg = `Malformed 'cardName' path parameter: ${req.params.cardName}`;
        console.error(EndPoint.GET_CARD_IMAGE + ' ' + errorMsg);
        res.status(400).send(errorMsg);
    }
    else {
        existsSync(resolvedImagePath)
            ? res.status(200).sendFile(resolvedImagePath)
            : res.status(404).send();
    }
});

/**
 * Return the indicated card set
 */
app.get(EndPoint.GET_SET_BY_NUMBER, async (req: Request, res: Response, next: NextFunction) => {
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
app.get(EndPoint.GET_CARD_IN_SET, async (req: Request, res: Response, next: NextFunction) => {
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