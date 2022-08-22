import path from 'path';
import dotenv from 'dotenv';
import { DataSource } from 'typeorm';

dotenv.config();

/**
 * Provides a connection to the database via TypeORM
 */
export const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    synchronize: true,
    logging: process.env.DB_LOGGING?.toLocaleLowerCase() === 'true',
    entities: [path.join(__dirname,  'entity/**.js')],
    subscribers: [],
    migrations: [],
});