import csvParser from 'csv-parser';
import { createReadStream, existsSync, readdirSync } from 'fs';
import path from 'path';
import { DataSource, In, Repository } from 'typeorm';
import { Card } from '../persistance/entity/Card';
import { CardSet } from '../persistance/entity/CardSet';

/**
 * CardService performs all Card and CardSet related tasks, namely database retrieval
 */
export class CardService {

    //The directory where all card images are located
    static readonly IMAGE_DIR = path.resolve(path.join( __dirname, '..\\..\\res\\card_images'));

    private cardRepo: Repository<Card>;
    private cardSetRepo: Repository<CardSet>;

    constructor(private dataSource: DataSource){
        this.cardRepo = this.dataSource.getRepository(Card);
        this.cardSetRepo = this.dataSource.getRepository(CardSet);
    }

    /**
     * Retrieve all the Cards from every CardSet
     * @returns All Cards from every CardSet
     */
    async getAllCards(): Promise<Card[]> {
        return this.dataSource.getRepository(Card).find();
    }

    /**
     * Retrieve a Card by its name
     * @param cardName the unique card identifier name
     * @returns The card whose name matches the cardName param
     */
    async getCardByName(cardName: string): Promise<Card | null> {
        return this.cardRepo.findOneBy({name: cardName});
    }

    /**
     * Given a list of cardNames, get a card for each.
     * One result will be returned for every valid and distinct card name in the cardNames list.
     * Therefor, any invalid or duplicate card names will simply be ignored.
     * @param cardNames A list of card names
     * @returns A list of cards that match each valid and distinct card name in the cardNames list
     */
    async getCardsByNames(cardNames: string[]): Promise<Card[]> {
        return this.cardRepo.find({where: {name: In(cardNames)}});
    }

    /**
     * Given a valid cardName, return the cards image file path.
     * @param cardName The name of the card whose image is to be retrieved
     * @returns The full image filepath if the cardName was valid. If cardName is invalid return null
     */
    getCardImagePath(cardName: string): string | null {
        const imageDir = path.join(CardService.IMAGE_DIR, CardService.getCardSetName(CardService.getSetNumberFromCardName(cardName)));
        //before we resolve the image file path, calculate its full length and then compare it to the resolved path's length.
        //If the lengths do not match, then a cardName was given that resulted in the resolved path changing (for instance if '../' is passed)
        const expectedPathLength = imageDir.length + cardName.length + 5; // add 5 to account for the one missing path sep and the 4 chars in '.jpg'
        const resolvedImagePath = path.join(imageDir, cardName + '.jpg');
        if(resolvedImagePath.length == expectedPathLength && existsSync(resolvedImagePath)){
            return resolvedImagePath;
        }
        return null;
    }

    /**
     * Retrieve a CardSet by its set number
     * @param setNum The set number to be retrieved
     * @param excludeCards Flag indicating if the list of Cards associated with the CardSet should be included in the response
     * @returns The CardSet with the matching set number, or null if there was no matching CardSet
     */
    async getCardSetByNumber(setNum: number, excludeCards: boolean): Promise<CardSet | null> {
        //The valid range for set numbers is [0, 4]
        if(setNum < 0 || setNum > 4) {
            return null;
        }
        return this.cardSetRepo.findOne({
            //only define request the 'cards' relation if we are not excluding cards from the results
            ...(excludeCards ? undefined : {relations: ['cards']}),
            where: {setNum: setNum}
        });
    }

    /**
     * Retrieve a card using a set number, and the cards number (position) within that set
     * @param setNum The set number matching the CardSet that contains the desired card
     * @param cardNumInSet The card number (position) within the CardSet to be retrieved
     * @returns The indicated Card from within the CardSet
     */
    async getCardByNumberInCardSet(setNum: number, cardNumInSet: number): Promise<Card | null> {
        if(setNum < 0 || setNum > 4) {
            return null;
        } else {
            return this.cardRepo.findOne({
                relations: ['set'],
                where: {
                    set: { setNum: setNum},
                    numInSet: cardNumInSet
                }
            });
        }
    }

    /**
     * Repopulate both the 'card' and 'card_set' tables by parsing the CSV files located in '/res/csv_source'
     */
    async populateCardDatabase() {
        const csvDir = 'res\\csv_source\\';
        const csvFiles = readdirSync(csvDir);
        let setCards: Card[] = [];
        for await (const csvFile of csvFiles) {
            try {
                setCards = await this.parseCardsCSV(csvDir, csvFile);
                console.log(`Populating database with the set '${setCards[0].set.displayName}'`);
                //save the CardSet before saving all the cards that belong to it
                await this.cardSetRepo.save(setCards[0].set);
                for await (const card of setCards) {
                    await this.cardRepo.save(card);
                }
            } catch(error) {
                console.error(`An error was encountered during database population: ${error}`);
            }
        }
    }

    /**
     * For a given Card's name (cardName) return the set number it belongs to.
     * A Card's name field is a composite key which includes the set number.
     * @param cardName A valid Card's name
     * @returns The set number to which the card belongs
     */
    private static getSetNumberFromCardName(cardName: string) {
        return parseInt(cardName[1]);
    }

    /**
     * For a given valid set number, return the set's name.
     * Note: the name returned is the internal name and is not the display name
     * @param setNum The set number of the CardSet to get the name of
     * @returns The name of the CardSet whose set number matches setNum
     */
    private static getCardSetName(setNum: number) {
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

    /**
     * Parse a CSV file of card data into a list of Card objects
     * @param csvDir The path of the directory where the target CSV file is located
     * @param csvFilename The name of the target CSV file
     * @returns A list of Card objects
     */
    private async parseCardsCSV(csvDir: string, csvFilename: string) {
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
                    card.cardSubType = row['Subtype/Allegiance'].split(',');
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
}