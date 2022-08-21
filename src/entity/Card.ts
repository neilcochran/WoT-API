/* eslint-disable indent */ //disabled due to known but with ESLint indent and annotations
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import { Attribute } from '../types/Attribute';
import { CardType } from '../types/CardType';
import { Rarity } from '../types/Rarity';
import { SubTypeAllegiance } from '../types/SubTypeAllegiance';

@Entity()
export class Card {

    @PrimaryGeneratedColumn()
    id!: number;

    @Column({unique: true})
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

    @Column('text', {array: true})
    subtypeAndAllegiances!: SubTypeAllegiance[];

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