import 'reflect-metadata'; //required for TypeORM
import express, { Express, NextFunction, Request, Response } from 'express';
import dotenv from 'dotenv';
import { EndPoint } from './model/EndPoint';
import { dataSource } from './persistance/dataSource';
import { authHandler } from './middleware/authHandler';
import { errorHandler } from './middleware/errorHandler';
import { cardService } from './service/CardService';
import { authService } from './service/AuthService';

dotenv.config();

const port = process.env.APP_PORT ? parseInt(process.env.APP_PORT) : 8080;
const host = process.env.APP_HOST ?? 'localhost';


//Initialize the Express app
const app: Express = express();

app.use(express.json());


/**
 * Authenticates a user and issues a new API key on successfully authentication
 */
app.post(EndPoint.AUTHENTICATE, async (req: Request, res: Response, next: NextFunction) => {
    const authToken = await authService.authenticate(req.body.username, req.body.password);
    authToken == null
        ? res.status(401).send()
        : res.status(200).json(authToken);
});

//Register the authHandler middleware after the 'authenticate' endpoint in order to allow unauthenticated users to call it and authenticate
app.use(authHandler);

/**
 * API base home route
 */
app.get(EndPoint.ROOT, async (req: Request, res: Response, next: NextFunction) => {
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
app.get(EndPoint.GET_CARD_BY_ID, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const card = await cardService.getCardById(req.params.cardId);
        card == null
            ? res.status(404).send()
            : res.status(200).json(card);
    } catch(error: unknown) {
        next(error);
    }
});

/**
 * Returns a card for each valid card id in the post body 'cardIds' list
 * Invalid card names are simply ignored
 */
app.post(EndPoint.GET_CARDS_BY_IDS, async (req: Request, res: Response, next: NextFunction) => {
    //enforce the required post body 'cardIds' param
    if(!req.body.cardIds) {
        res.status(400).send('Required post body \'cardIds\' was provided');
    }
    else {
        try {
            const cards = await cardService.getCardsByIds(req.body.cardIds);
            res.status(200).json(cards);
        } catch(error) {
            next(error);
        }
    }
});

/**
 * Return the full size image of a given card
 */
app.get(EndPoint.GET_CARD_IMAGE, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const imagePath = cardService.getCardImagePath(req.params.cardId);
        imagePath == null
            ? res.status(404).send()
            : res.status(200).sendFile(imagePath);
    } catch(error) {
        next(error);
    }
});

/**
 * Return the small version (half size) of the image of a given card
 */
app.get(EndPoint.GET_CARD_IMAGE_SMALL, async (req: Request, res: Response, next: NextFunction) => {
    try {
        //pass 'true' to get the path of the small version of the image
        const imagePath = cardService.getCardImagePath(req.params.cardId, true);
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
app.use(errorHandler);

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