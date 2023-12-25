import { DataTypes, Model } from 'sequelize';

import { sequelize } from './sequelize';

export interface ClientError {
  id: number;
  reason: string | null;
  userAgent: string | null;
}
class ClientErrorModel extends Model<ClientError, ClientError> {
  declare id: ClientError['id'];
  declare reason: ClientError['reason'];
  declare userAgent: ClientError['userAgent'];
}

ClientErrorModel.init(
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
    },

    reason: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    userAgent: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    modelName: 'ClientError',
    sequelize,
  },
);

export { ClientErrorModel };
