import 'reflect-metadata';
import { Sequelize } from 'sequelize-typescript';
import Job from '../models/Job';
import { appConfig } from '../config';

// the schema is owned by database/init.sql -- the backend only connects,
// it never syncs
const sequelize = new Sequelize({
    dialect: 'mysql',
    models: [Job],
    logging: false,
    ...appConfig.db
});

export default sequelize;
