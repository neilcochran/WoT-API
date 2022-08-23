# **WoT-API**
A simple Node/Express API for searching and retrieving Wheel of Time (WoT) Collectable Card Game (CCG) card details. Every WoT CCG card ever printed (and its image) is available via this API. 

## About the Data
All card data used in this project is conveniently available in both CSV and SQL formats. The data can be found in this repository in `/res/card-info-backups/`. The relational data is extremely simple, and there are only 2 tables: `card` and `card_set`. `card` represent an individual Wheel of Time card, while `card_set` represents the card set to which the card belongs (E.g. 'Premiere', 'Dark Prophecies', 'Promo', ect). I don't know of any other database which represents this complete set of data, and I would be very sad to see the data lost. Please feel free to use and share this data however you'd like.

The original card data used in this API was parsed from http://wotccg.mahasamatman.com/Resources/WotList.zip which has complete data for each of the sets of cards (though I did manually add a few very rare cards such as the promotional 'Insane Designer'). This was like finding a needle in a haystack, and is the reason I chose to do this project. Since this original data was simply inherited, it has a few columns that are not used and a few column names which I chose to change. It also does not capture any of the relation between a `Card` and its `CardSet` since each complete set is in its own spreadsheet tab. For this reason, there is a single CSV file for each set located in `res/csv_source/`. Originally, I was going to parse those CSV sources just once to add the data to the database. I could then simply export/dump the database and use that to repopulate the database if needed/desired. However, I decided to simply leave the original sources as they are, in case having the data separated by set (and with more human readable headers instead of database column names) is useful for anyone. In a similar fashion I left the `CSV Source -> database` parsing functionality in `src\service\CardService.ts#parseCardsCSV()`.

## Usage
To run this project, run the `build` script followed by the `start` script.
Using yarn:
```
yarn build
yarn start
```

Alternatively, run just the `dev` script to enable live loading (via tsc-watch) during development
```
yarn dev
```

## Versions
View all versions of in the <a href="/CHANGELOG.md">CHANGELOG.md</a>

## License
This project is licensed under the MIT License - see the <a href="/LICENSE.md">LICENSE.md</a> file for details