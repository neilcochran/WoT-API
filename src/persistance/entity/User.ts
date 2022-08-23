/* eslint-disable indent */
import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { AuthToken } from './AuthToken';

/**
 * A class representing a User who can interact with the API's authenticated endpoints.
 * This class is a TypeORM entity
 */
@Entity()
export class User {

    @PrimaryGeneratedColumn()
    id!: string;

    @Column({ unique: true })
    username!: string;

    @Column()
    passwordHash!: string;

    @OneToOne(() => AuthToken, { nullable: true })
    @JoinColumn()
    authToken!: AuthToken;
}