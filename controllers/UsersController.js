import sha1 from 'sha1';
import {
  ObjectId,
} from 'mongodb';
import Queue from 'bull/lib/queue';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const userQueue = new Queue('email');

class UsersController {
  static async postNew(req, res) {
    const email = req.body ? req.body.email : null;
    const password = req.body ? req.body.password : null;

    if (!email) {
      res.status(400).json({ error: 'Missing email' });
      return;
    }

    if (!password) {
      res.status(400).json({ error: 'Missing password' });
      return;
    }

    const { users } = dbClient;

    const user = await users.findOne({
      email,
    });

    if (user) {
      res.status(400).json({ error: 'Already exist' });
      return;
    }

    const insertInfo = await users.insertOne({
      email,
      password: sha1(password),
    });

    userQueue.add({ userId: insertInfo.insertedId.toString() });

    res.status(201).json({
      id: insertInfo.insertedId.toString(),
      email,
    });
  }

  static async getMe(req, res) {
    const token = req.header('X-Token');
    if (!token) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const key = `auth_${token}`;

    const userId = await redisClient.get(key);
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { users } = dbClient;

    const userDocument = await users.findOne({
      _id: ObjectId(userId),
    });
    if (!userDocument) {
      res.status(401).json({ error: 'Unauthorized' });
    } else {
      res.status(200).json({
        id: userId,
        email: userDocument.email,
      });
    }
  }
}

export default UsersController;
