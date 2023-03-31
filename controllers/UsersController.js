import sha1 from 'sha1';
import dbClient from '../utils/db';

class UsersController {
  static async postNew(req, res) {
    const email = req.body ? req.body.email : null;
    const password = req.body ? req.body.password : null;

    if (!email) {
      res.status(400).json({ error: 'Missing email' });
    }

    if (!password) {
      res.status(400).json({ error: 'Missing password' });
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

    res.status(201).json({
      id: insertInfo.insertedId.toString(),
      email,
    });
  }
}

export default UsersController;
