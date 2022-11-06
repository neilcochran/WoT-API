/* eslint-disable indent */ //disabled due to known but with ESLint indent and annotations
import { Entity, Column, ManyToOne, PrimaryColumn } from 'typeorm';
import { CardSet } from './CardSet';
import { Attribute, CardSubType, CardType, Rarity, Card } from 'wot-types';

/**
 * A class representing a card. This class is a TypeORM entity
 */
@Entity()
export class CardEntity implements Card {

    @PrimaryColumn('text')
    id!: string;

    @Column()
    displayName!: string;

    @ManyToOne(() => CardSet, (cardSet) => cardSet.cards)
    cardSet!: CardSet;

    @Column()
    numInSet!: number;

    @Column()
    rarity!: Rarity;

    @Column()
    cardType!: CardType;

    @Column('text', {array: true})
    cardSubType!: CardSubType[];

    @Column('text', {array: true})
    attributes!: Attribute[];

    @Column()
    effectDesc!: string;

    @Column()
    loreDesc!: string;

    @Column()
    politicsAbility!: number;

    @Column()
    politicsCost!: number;

    @Column()
    intrigueAbility!: number;

    @Column()
    intrigueCost!: number;

    @Column()
    onePowerAbility!: number;

    @Column()
    onePowerCost!: number;

    @Column()
    combatAbility!: number;

    @Column()
    combatCost!: number;
}