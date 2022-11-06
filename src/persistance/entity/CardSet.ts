/* eslint-disable indent */
import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { CardEntity } from './CardEntity';

/**
 * This class represents a card set. This class is a TypeORM entity
 */
@Entity()
export class CardSet {
    @PrimaryColumn()
    setNum!: number;

    @Column({ unique: true })
    name!: string;

    @Column({ unique: true })
    displayName!: string;

    @OneToMany(() => CardEntity, (cardEntity) => cardEntity.cardSet)
    cards!: CardEntity[];
}