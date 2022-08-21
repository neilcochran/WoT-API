import 'reflect-metadata'; //required for TypeORM
import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import { DataSource, getRepository } from 'typeorm';
import { createReadStream, existsSync, readdirSync} from 'fs';
import path, { resolve } from 'path';
import csvParser from 'csv-parser';
import { Card } from './entity/Card';

dotenv.config();

const port = process.env.APP_PORT ? parseInt(process.env.APP_PORT) : 8080;
const host = process.env.APP_HOST ?? 'localhost';

const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    synchronize: true,
    logging: true,
    entities: [path.join(__dirname,  'entity/**.js',)],
    subscribers: [],
    migrations: [],
});

console.log(dataSource);

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
app.get('/cards/', async (req: Request, res: Response) => {
    res.send(JSON.stringify(await dataSource.getRepository(Card).find()));
});

/**
 * Start the app
 */
app.listen(port, host, () => {
    console.log(`WoT-API server is running at ${host}:${port}`);
    dataSource.initialize()
        .then(() => {
            console.log('Database connected');
            //Only parse the csv sources and create/save entities if indicated
            if(process.env.POPULATE_DATABASE?.toLocaleLowerCase() == 'true'){
                parseCardSources();
            }
        })
        .catch(error => console.log('Database connection error:', error));
});

function parseCardSources() {
    const csvDir = 'res\\csv_source\\';
    const csvFiles = readdirSync(csvDir);
    const cardRepo = dataSource.getRepository(Card);
    csvFiles.forEach(csvFile => {
        createReadStream(path.join(csvDir, csvFile))
            .pipe(csvParser())
            .on('data', async row => {
                const card = new Card();
                card.numInSet = parseInt(row['Num']);
                card.rarity = row['Rarity'];
                card.displayName = row['Name'];
                card.cardType = row['Type'];
                card.subtypeAndAllegiances = row['Subtype/Allegiance'].split(',');
                card.attributes = row['Attribute'].split(',');
                card.effectDesc = row['Effect'];
                card.loreDesc = row['Lore'];
                card.politicsAbility = row['Politics Ability'] != '' ? parseInt(row['Politics Ability']) : 0;
                card.politicsCost = row['Politics Cost'] != '' ? parseInt(row['Politics Cost']) : 0;
                card.intrigueAbility = row['Intrigue Ability'] != '' ? parseInt(row['Intrigue Ability']) : 0;
                card.intrigueCost = row['Intrigue Cost'] != '' ? parseInt(row['Intrigue Cost']) : 0;
                card.onePowerAbility =  row['One Power Ability'] != '' ? parseInt(row['One Power Ability']) : 0;
                card.onePowerCost =  row['One Power Cost'] != '' ? parseInt(row['One Power Cost']) : 0;
                card.combatAbility =  row['Combat Ability'] != '' ? parseInt(row['Combat Ability']) : 0;
                card.combatCost =  row['Combat Cost'] != '' ? parseInt(row['Combat Cost']) : 0;
                let name = '';
                let setName = '';
                switch(csvFile) {
                    case 'promo.csv':
                        name += '00-';
                        setName = 'Promo';
                        break;
                    case 'premiere.csv':
                        name += '01-';
                        setName = 'Premiere';
                        break;
                    case 'dark_prophecies.csv':
                        name += '02-';
                        setName = 'Dark Prophecies';
                        break;
                    case 'children_of_the_dragon.csv':
                        name += '03-';
                        setName = 'Children of the Dragon';
                        break;
                    case 'cycles.csv':
                        name += '04-';
                        setName = 'Cycles';
                        break;
                    default:
                        console.log('unknown csv file:', csvFile);
                }
                const paddingLen = 3 - card.numInSet.toString().length;
                name += paddingLen > 0 ? '0'.repeat(paddingLen) + card.numInSet + '_' : card.numInSet + '_';
                name += card.displayName.toLowerCase().split(' ').join('_');
                card.name = name.replace(/'/g, '');
                card.setName = setName;
                await cardRepo.save(card);
            });
    });
}