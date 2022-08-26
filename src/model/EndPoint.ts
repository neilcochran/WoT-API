/**
 * An enum representing the various API endpoints
 */
export enum EndPoint {
    //Unauthenticated endpoints
    AUTHENTICATE = '/authenticate',
    //authenticated endpoints
    ROOT = '/',
    GET_ALL_CARDS = '/cards/',
    GET_CARD_BY_NAME = '/cards/name/:cardName',
    GET_CARDS_BY_NAME = '/cards/name',
    GET_CARD_IMAGE = '/cards/name/:cardName/image',
    GET_SET_BY_NUMBER = '/cards/sets/:setNum/',
    GET_CARD_IN_SET = '/cards/sets/:setNum/:numInSet'
}