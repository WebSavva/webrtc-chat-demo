import { DataTypes, Model } from 'sequelize';
import { USER_STATUS, type User as BaseUser } from '@webrtc-chat/types';

import { sequelize } from './sequelize';

interface User extends BaseUser {
  activeConversationId: string | null;
}

class UserModel extends Model<User, User> {
  declare id: User['id'];
  declare status: User['status'];
  declare activeConversationId?: User['activeConversationId'];
}

UserModel.init(
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
    },

    status: {
      type: DataTypes.ENUM,
      values: Object.values(USER_STATUS),
    },

    activeConversationId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    modelName: 'User',
    sequelize,
  },
);

export { UserModel };
