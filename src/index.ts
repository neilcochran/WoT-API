import 'reflect-metadata'; //required for TypeORM
import express, { Express, NextFunction, Request, Response } from 'express';
import dotenv from 'dotenv';
import { Card } from './persistance/entity/Card';
import { EndPoint } from './model/EndPoint';
import { dataSource } from './persistance/dataSource';
import { CardService } from './service/CardService';

dotenv.config();

const port = process.env.APP_PORT ? parseInt(process.env.APP_PORT) : 8080;
const host = process.env.APP_HOST ?? 'localhost';

const cardService = new CardService(dataSource);

//Initialize the Express app
const app: Express = express();

/**
 * API base home route
 */
app.get(EndPoint.ROOT, (req: Request, res: Response) => {
    res.send('Welcome to The Wheel of Time Collectable Card Game (CCG) API');
});

/**
 * Returns all the cards
 */
app.get(EndPoint.GET_ALL_CARDS, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const cards = await cardService.getAllCards();
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
        const card = await cardService.getCardByName(req.params.cardName);
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
        let cards: Card[] = [];
        //if we have a single instance of the parameter, simply call getCardByName
        if(typeof cardNameParam === 'string') {
            const card = await cardService.getCardByName(cardNameParam);
            cards = card == null
                ? []
                : [card];
        }
        //we have multiple instances of the parameter, so call getCardsByNames() with the list
        else {
            cards = await cardService.getCardsByNames(cardNameParam as string[]);
        }
        res.status(200).json(cards);
    } catch(error) {
        next(error);
    }
});

/**
 * Return the image of a given card
 */
app.get(EndPoint.GET_CARD_IMAGE, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const imagePath = cardService.getCardImagePath(req.params.cardName);
        imagePath == null
            ? res.status(404).send()
            : res.status(200).sendFile(imagePath);
    } catch(error) {
        next(error);
    }
});

/**
 * Return the indicated card set and all its cards.
 * Note: If the optional query param 'excludeCards' is passed as true, then the CardSet is returned without its list of cards
 * This can be useful if only the CardSet information is needed, as including all its cards makes the request payload much larger
 */
app.get(EndPoint.GET_SET_BY_NUMBER, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const setNum = parseInt(req.params.setNum);
        const excludeCards = (req.query?.excludeCards)?.toString().toLocaleLowerCase() === 'true';
        const cardSet = await cardService.getCardSetByNumber(setNum, excludeCards);
        cardSet == null
            ? res.status(404).send()
            : res.status(200).json(cardSet);
    } catch(error: unknown) {
        next(error);
    }
});

/**
 * Return the card with the matching position (its number in the CardSet) from within the given set
 */
app.get(EndPoint.GET_CARD_IN_SET, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const setNum = parseInt(req.params.setNum);
        const numInSet = parseInt(req.params.numInSet);
        const card = await cardService.getCardByNumberInCardSet(setNum, numInSet);
        card == null
            ? res.status(404).send()
            : res.status(200).send(JSON.stringify(card));
    } catch(error: unknown) {
        next(error);
    }
});

/**
 * Unknown error handler middleware will simply return 500 for all errors it receives
 */
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
    console.error(error);
    res.status(500).send('The server encountered an error processing the request');
});

/**
 * Start listening for requests. Populate the card database if indicated.
 */
app.listen(port, host, async () => {
    console.log(`WoT-API server is running at ${host}:${port}`);
    try {
        await dataSource.initialize();
        console.log('Database connected');
        if(process.env.DB_POPULATE?.toLocaleLowerCase() == 'true'){
            await cardService.populateCardDatabase();
        }
    } catch(error: unknown) {
        if(error instanceof Error) {
            console.error('Database error:', error.message);
        }
    }
});