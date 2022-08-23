/* eslint-disable indent */
import * as crypto from 'crypto';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Represents the information about the token authenticated users get and use to make authenticated requests
 * Each AuthToken has an expiration time of 8 hours.
 */
@Entity()
export class AuthToken {
    private static readonly TOKEN_BYTE_LENGTH = 32;
    private static readonly TOKEN_EXPIRY_HOURS = 8;

    @PrimaryGeneratedColumn()
    id!: string;

    @Column()
    token: string;

    @Column('bigint')
    issued: number;

    @Column('bigint')
    expires: number;

    constructor() {
        this.token = crypto.randomBytes(AuthToken.TOKEN_BYTE_LENGTH).toString('hex');
        this.issued = Date.now();
        this.expires = this.issued + (AuthToken.TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);
    }
}