import Queue from 'bull/lib/queue';
import imageThumbnail from 'image-thumbnail';
import fs from 'fs';
import {
  ObjectId,
} from 'mongodb';
import dbClient from './utils/db';

const fileQueue = new Queue('thumbnail generation');
const userQueue = new Queue('email');

const generateThumbnails = async (width, localPath) => {
  const thumbnail = await imageThumbnail(localPath, {
    width,
  });
  return thumbnail;
};

fileQueue.process(async (job, done) => {
  const { userId, fileId } = job.data;
  if (!userId) {
    done(new Error('Missing userId'));
  }
  if (!fileId) {
    done(new Error('Missing fileId'));
  }

  const { files } = dbClient;
  const file = await files.findOne({ _id: ObjectId(fileId), userId: ObjectId(userId) });
  if (!file) {
    done(new Error('File not found'));
  }

  // generate thumbnail
  const thumbnail500 = await generateThumbnails(500, file.localPath);
  const thumbnail250 = await generateThumbnails(250, file.localPath);
  const thumbnail100 = await generateThumbnails(100, file.localPath);

  const localPath500 = `${file.localPath}_500`;
  const localPath250 = `${file.localPath}_250`;
  const localPath100 = `${file.localPath}_100`;

  await fs.promises.writeFile(localPath500, thumbnail500);
  await fs.promises.writeFile(localPath250, thumbnail250);
  await fs.promises.writeFile(localPath100, thumbnail100);
});

userQueue.process(async (job, done) => {
  const { userId } = job.data;
  if (!userId) {
    done(new Error('Missing userId'));
  }

  const { users } = dbClient;

  const user = users.findOne({
    _id: ObjectId(userId),
  });
  if (!user) {
    done(new Error('User not found'));
  }
  console.log(`Welcome ${user.email}`);
});
