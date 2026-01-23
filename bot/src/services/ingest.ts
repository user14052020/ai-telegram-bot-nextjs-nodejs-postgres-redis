import { withTransaction } from '@/db.js';
import { ChatModel } from '@/models/chatModel.js';
import { MessageModel } from '@/models/messageModel.js';
import { UserModel } from '@/models/userModel.js';

export const ingestMessage = async (params: {
  chatId: number;
  chatTitle?: string | null;
  userId: number;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  messageId: number;
  text: string;
  sentAt: Date;
}): Promise<void> => {
  await withTransaction(async (client) => {
    const chat = await ChatModel.upsert(String(params.chatId), params.chatTitle ?? null, client);
    const user = await UserModel.upsert(
      {
        tgId: String(params.userId),
        username: params.username ?? null,
        firstName: params.firstName ?? null,
        lastName: params.lastName ?? null
      },
      client
    );

    await MessageModel.create(
      {
        chatId: chat.id,
        userId: user.id,
        messageId: params.messageId,
        text: params.text,
        sentAt: params.sentAt
      },
      client
    );
  });
};
