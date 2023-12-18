import { writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';

import { Sequelize } from 'sequelize';

const databasePath = resolve(__dirname, '../database.sqlite');

if (!existsSync(databasePath)) writeFileSync(databasePath, '', 'utf-8');

export const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: databasePath,
});
