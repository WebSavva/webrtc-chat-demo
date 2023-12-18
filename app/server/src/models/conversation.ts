import { type Conversation, CONVERTATION_STATUS } from '@webrtc-chat/types';
import { DataTypes, Model } from 'sequelize';

import { sequelize } from './sequelize';

class ConversationModel extends Model<Conversation, Conversation> {
  declare id: Conversation['id'];
  declare status: Conversation['status'];
  declare initiatorId: Conversation['initiatorId'];
  declare receiverId: Conversation['receiverId'];
  declare startedAt?: Conversation['startedAt'];
  declare endedAt?: Conversation['endedAt'];
}

ConversationModel.init(
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
    },

    status: {
      type: DataTypes.ENUM,
      values: Object.values(CONVERTATION_STATUS),
    },

    initiatorId: {
      type: DataTypes.STRING,
    },

    receiverId: {
      type: DataTypes.STRING,
    },

    startedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    endedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    modelName: 'Conversation',
    sequelize,
  },
);

export { ConversationModel };
