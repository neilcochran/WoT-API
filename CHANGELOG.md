## Version 0.8.0
- Add a small (half sized) version of each card image to `res/card_images`
- Add an endpoint to retrieve a small version of a card image

## Version 0.7.0
- Use Express's JSON middleware instead of urlencoded
- Refactor `Card#name` to Card#id and associated request paths
- Updated `CardService#getCardsByIds` to return any requested duplicates instead of only returning a result for each unique id
- Updated SQL/CSV backups (due to `Card#name` -> `Card#id` schema change)
- Correct 2 image file names

## Version 0.6.3
- Correct `package.json` `main` field

## Version 0.6.2
- Export package types

## Version 0.6.1
- Publish package on NPM
- Add repository information to `package.json`

## Version 0.6.0
- Add user authentication
- Authenticated endpoints require a valid API key

## Version 0.5.0
- Refactor code & file organization
- Add JSDoc comments

## Version 0.4.1
- Fixed bug that allowed the image endpoint to produce dangerous resolved paths

## Version 0.4.0
- Add endpoint for getting a card's image
- Add endpoint for getting multiple cards by name at once

## Version 0.3.0
- Add all card data and resources (images, csv sources, csv & sql exports)
- Add 'cards' endpoint that returns all cards JSON

## Version 0.2.0
- Create Express App
- Correct package name (lowercase)

## Version 0.1.0
- Create initial project structure using `mk-ts-app`