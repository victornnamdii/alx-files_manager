import { v4 } from 'uuid';
import sha1 from 'sha1';
import redisClient from '../utils/redis';
import dbClient from '../utils/db';

class AuthController {
  static async getConnect(req, res) {
    const Authorization = req.header('Authorization') || null;
    if (!Authorization) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const b64Encoded = Authorization.split(' ')[1];
    const decodedBase64 = Buffer.from(b64Encoded, 'base64').toString('utf-8');
    const email = decodedBase64.split(':')[0];
    const password = decodedBase64.split(':')[1];
    if (!email || !password) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const { users } = dbClient;

    const user = await users.findOne({
      email,
      password: sha1(password),
    });
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const token = v4();
    const key = `auth_${token}`;

    await redisClient.set(key, user._id.toString(), 24 * 60 * 60);

    res.status(200).json({ token });
  }

  static async getDisconnect(req, res) {
    const userToken = req.header('X-Token') || null;
    if (!userToken) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const key = `auth_${userToken}`;

    const userId = await redisClient.get(key);
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
    } else {
      await redisClient.del(key);
      res.status(204).send();
    }
  }
}

export default AuthController;
