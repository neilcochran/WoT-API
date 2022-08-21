/* eslint-disable indent */
import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { Card } from './Card';

@Entity()
export class CardSet {
    @PrimaryColumn()
    setNum!: number;

    @Column({ unique: true })
    name!: string;

    @Column({ unique: true })
    displayName!: string;

    @OneToMany(() => Card, (card) => card.set)
    cards!: Card[];
}