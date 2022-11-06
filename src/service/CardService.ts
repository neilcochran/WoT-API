import csvParser from 'csv-parser';
import { createReadStream, existsSync, readdirSync } from 'fs';
import path from 'path';
import { DataSource, In, Repository } from 'typeorm';
import { dataSource } from '../persistance/dataSource';
import { CardEntity } from '../persistance/entity/CardEntity';
import { CardSet } from '../persistance/entity/CardSet';

/**
 * CardService performs all Card and CardSet related tasks, namely database retrieval
 */
class CardService {

    //The directory where all card images are located
    static readonly IMAGE_DIR = path.resolve(path.join( __dirname, '..\\..\\res\\card_images'));

    private cardRepo: Repository<CardEntity>;
    private cardSetRepo: Repository<CardSet>;

    constructor(private dataSource: DataSource){
        this.cardRepo = this.dataSource.getRepository(CardEntity);
        this.cardSetRepo = this.dataSource.getRepository(CardSet);
    }

    /**
     * Retrieve all the Cards from every CardSet
     * @returns All Cards from every CardSet
     */
    async getAllCards(): Promise<CardEntity[]> {
        return this.dataSource.getRepository(CardEntity).find();
    }

    /**
     * Retrieve a Card by its id
     * @param cardId the card id
     * @returns The card associated to the id, or null if none exists
     */
    async getCardById(cardId: string): Promise<CardEntity | null> {
        return this.cardRepo.findOneBy({id: cardId});
    }

    /**
     * Given a list of cardIds, get a card for each.
     * @param cardIds A list of card ids
     * @returns A list of cards that match each valid card id in the cardIds list
     */
    async getCardsByIds(cardIds: string[]): Promise<CardEntity[]> {
        const uniqueCards = await this.cardRepo.find({where: {id: In(cardIds)}});
        const cards: CardEntity[] = [];
        //since duplicates won't be included due to using an 'in' clause, we have to check for
        //and restore any duplicates needed after we get the list of unique cards
        cardIds.forEach(id => {
            const card = uniqueCards.find(card => card.id === id);
            if(card) {
                cards.push(card);
            }
        });
        return cards;
    }

    /**
     * Given a valid cardId, return the cards image file path. For each card there is both a full size and a small sized image available
     * @param cardId The id of the card whose image is to be retrieved
     * @param getSmallSize A flag indicating if the small version of the image should be returned
     * @returns The full image filepath if the cardId was valid, otherwise return null
     */
    getCardImagePath(cardId: string, getSmallSize = false): string | null {
        const imageDir = path.join(CardService.IMAGE_DIR, CardService.getCardSetName(CardService.getSetNumberFromCardId(cardId)));
        //before we resolve the image file path, calculate its full length and then compare it to the resolved path's length.
        //If the lengths do not match, then a cardId was given that resulted in the resolved path changing (for instance if '../' is passed)
        const expectedPathLength = imageDir.length + cardId.length + (getSmallSize ? 8 : 5);
        const resolvedImagePath = path.join(imageDir, cardId + (getSmallSize ? '_SM' : '') + '.jpg');
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
    async getCardByNumberInCardSet(setNum: number, cardNumInSet: number): Promise<CardEntity | null> {
        if(setNum < 0 || setNum > 4) {
            return null;
        } else {
            return this.cardRepo.findOne({
                relations: ['cardSet'],
                where: {
                    cardSet: { setNum: setNum},
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
        let setCards: CardEntity[] = [];
        for await (const csvFile of csvFiles) {
            try {
                setCards = await this.parseCardsCSV(csvDir, csvFile);
                console.log(`Populating database with the set '${setCards[0].cardSet.displayName}'`);
                //save the CardSet before saving all the cards that belong to it
                await this.cardSetRepo.save(setCards[0].cardSet);
                for await (const card of setCards) {
                    await this.cardRepo.save(card);
                }
            } catch(error) {
                console.error(`An error was encountered during database population: ${error}`);
            }
        }
    }

    /**
     * For a given cardId, return the set number it belongs to.
     * A Card's id field is a composite key which includes the set number.
     * @param cardId The id of the card to get the set number from
     * @returns The set number to which the card belongs
     */
    private static getSetNumberFromCardId(cardId: string) {
        return parseInt(cardId[1]);
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
        return new Promise<CardEntity[]>((res, rej) => {
            const setCards: CardEntity[] = [];
            createReadStream(path.join(csvDir, csvFilename))
                .pipe(csvParser())
                .on('data', row => {
                    const card = new CardEntity();
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
                    let cardId = '0' + setNum + '-';
                    const paddingLen = 3 - card.numInSet.toString().length;
                    cardId += paddingLen > 0 ? '0'.repeat(paddingLen) + card.numInSet + '_' : card.numInSet + '_';
                    cardId += card.displayName.toLowerCase().split(' ').join('_');
                    card.id = cardId.replace(/'/g, '');
                    const cardSet = new CardSet();
                    const setName = setDisplayName.toLocaleLowerCase().split(' ').join('_');
                    cardSet.setNum = setNum;
                    cardSet.name = setName;
                    cardSet.displayName = setDisplayName;
                    card.cardSet = cardSet;
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

//Export a single instance of the service. Since the class is not exported this is the only reference the app will use
export const cardService = new CardService(dataSource);
