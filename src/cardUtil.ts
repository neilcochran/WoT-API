import csvParser from 'csv-parser';
import { createReadStream, readdirSync } from 'fs';
import path from 'path';
import { DataSource } from 'typeorm';
import { Card } from './entity/Card';
import { CardSet } from './entity/CardSet';

export function getSetName(setNum: number) {
    switch(setNum) {
        case 0:
            return 'promo';
        case 1:
            return 'premiere';
        case 2:
            return 'dark_prophecies';
        case 3:
            return 'children_of_the_dragon';
        case 4:
            return 'cycles';
        default:
            throw new Error(`Unknown set number ${setNum}`);
    }
}

export function getSetNumberFromCardName(cardName: string) {
    return parseInt(cardName[1]);
}

export async function populateCardDatabase(dataSource: DataSource) {
    const csvDir = 'res\\csv_source\\';
    const csvFiles = readdirSync(csvDir);
    const cardRepo = dataSource.getRepository(Card);
    const cardSetRepo = dataSource.getRepository(CardSet);
    let setCards: Card[] = [];
    for await (const csvFile of csvFiles) {
        setCards = await parseCardSetCSV(csvDir, csvFile);
        console.log(`Populating database with the set '${setCards[0].set.displayName}'`);
        //save the CardSet before saving all the cards that belong to it
        await cardSetRepo.save(setCards[0].set);
        for await (const card of setCards) {
            await cardRepo.save(card);
        }
        console.log(`Successfully populated database with the set '${setCards[0].set.displayName}'`);
    }
}

async function parseCardSetCSV(csvDir: string, csvFilename: string) {
    return new Promise<Card[]>((res, rej) => {
        const setCards: Card[] = [];
        createReadStream(path.join(csvDir, csvFilename))
            .pipe(csvParser())
            .on('data', row => {
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
                let setNum = -1;
                let setDisplayName = '';
                switch(csvFilename) {
                    case 'promo.csv':
                        setNum = 0;
                        setDisplayName = 'Promo';
                        break;
                    case 'premiere.csv':
                        setNum = 1;
                        setDisplayName = 'Premiere';
                        break;
                    case 'dark_prophecies.csv':
                        setNum = 2;
                        setDisplayName = 'Dark Prophecies';
                        break;
                    case 'children_of_the_dragon.csv':
                        setNum = 3;
                        setDisplayName = 'Children of the Dragon';
                        break;
                    case 'cycles.csv':
                        setNum = 4;
                        setDisplayName = 'Cycles';
                        break;
                    default:
                        console.error('Unknown csv file:', csvFilename);
                }
                let name = '0' + setNum + '-';
                const paddingLen = 3 - card.numInSet.toString().length;
                name += paddingLen > 0 ? '0'.repeat(paddingLen) + card.numInSet + '_' : card.numInSet + '_';
                name += card.displayName.toLowerCase().split(' ').join('_');
                card.name = name.replace(/'/g, '');
                const cardSet = new CardSet();
                const setName = setDisplayName.toLocaleLowerCase().split(' ').join('_');
                cardSet.setNum = setNum;
                cardSet.name = setName;
                cardSet.displayName = setDisplayName;
                card.set = cardSet;
                setCards.push(card);
            })
            .on('end', () => {
                if(setCards.length > 0) {
                    res(setCards);
                }
                rej('No cards found in the CSV file: ' + csvFilename);
            })
            .on('error', (error) => rej(error));
    });
}