/* eslint-disable indent */ //disabled due to known but with ESLint indent and annotations
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import { Attribute } from './Attribute';
import { CardType } from './CardType';
import { Rarity } from './Rarity';
import { SubTypeAllegiance } from './SubTypeAllegiance';

@Entity()
export class Card {

    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    name!: string;

    @Column()
    displayName!: string;

    @Column()
    setName!: string;

    @Column()
    numInSet!: number;

    @Column()
    rarity!: Rarity;

    @Column()
    cardType!: CardType;

    @Column()
    subtypeAndAllegiances!: SubTypeAllegiance[];

    @Column()
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