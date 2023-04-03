import {
  ObjectId,
} from 'mongodb';
import { join } from 'path';
import {
  v4,
} from 'uuid';
import { mkdir, writeFile } from 'fs';
import { promisify } from 'util';
import redisClient from '../utils/redis';
import dbClient from '../utils/db';

class FileController {
  static async postUpload(req, res) {
    const userDocument = await FileController.retrieveUser(req);
    if (!userDocument) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const name = req.body ? req.body.name : null;
    if (!name) {
      res.status(400).json({ error: 'Missing name' });
      return;
    }

    const type = req.body ? req.body.type : null;
    if (!type || (type !== 'image' && type !== 'folder' && type !== 'file')) {
      res.status(400).json({ error: 'Missing type' });
      return;
    }

    const data = req.body ? req.body.data : null;
    if (!data && type !== 'folder') {
      res.status(400).json({ error: 'Missing data' });
      return;
    }

    const parentId = req.body.parentId || 0;
    const isPublic = req.body.isPublic || false;
    const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';
    const { files } = dbClient;

    if (parentId !== 0 && parentId !== '0') {
      const file = await files.findOne({
        _id: ObjectId(parentId),
      });
      if (!file) {
        res.status(400).json({ error: 'Parent not found' });
        return;
      }
      if (file && file.type !== 'folder') {
        res.status(400).json({ error: 'Parent is not a folder' });
        return;
      }
    }

    const newFile = {
      name,
      type,
      parentId: (parentId === 0) || (parentId === '0') ? 0 : ObjectId(parentId),
      isPublic,
      userId: ObjectId(userDocument._id.toString()),
    };
    if (type !== 'folder') {
      const mkdirAsync = promisify(mkdir);
      const writeFileAsync = promisify(writeFile);
      const fileName = v4();
      const savePath = join(FOLDER_PATH, fileName);
      newFile.localPath = savePath;
      await mkdirAsync(FOLDER_PATH, { recursive: true });
      await writeFileAsync(savePath, Buffer.from(data, 'base64'));
    }
    const insertInfo = await files.insertOne(newFile);
    const fileId = insertInfo.insertedId.toString();
    res.status(201).json({
      id: fileId,
      userId: userDocument._id.toString(),
      name,
      type,
      isPublic,
      parentId,
    });
  }

  static async getShow(req, res) {
    const fileId = req.params.id;
    const userDocument = await FileController.retrieveUser(req);
    if (!userDocument) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { files } = dbClient;

    const file = await files.findOne({
      _id: ObjectId(fileId),
      userId: ObjectId(userDocument._id.toString()),
    });
    if (!file) {
      res.status(404).json({ error: 'Not found' });
    } else {
      res.status(200).json({
        id: fileId,
        userId: userDocument._id.toString(),
        name: file.name,
        type: file.type,
        isPublic: file.isPublic,
        parentId: file.parentId,
      });
    }
  }

  static async getIndex(req, res) {
    const userDocument = await FileController.retrieveUser(req);
    if (!userDocument) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const parentId = req.query.parentId || 0;
    const page = req.query.page || 0;
    const { files } = dbClient;

    let query;
    if (parentId) {
      query = {
        userId: ObjectId(userDocument._id.toString()),
        parentId: ObjectId(parentId),
      };
    } else {
      query = {
        userId: ObjectId(userDocument._id.toString()),
      };
    }

    const pageSize = 20;
    const skip = Number.parseInt(page, 10) * pageSize;

    const relatedFiles = await files.aggregate([
      {
        $match: query,
      },
      {
        $sort: { _id: -1 },
      },
      {
        $skip: skip,
      },
      {
        $limit: pageSize,
      },
    ]).toArray();

    const filesArray = relatedFiles.map((file) => {
      const fixFile = {
        id: file._id,
        userId: file.userId,
        name: file.name,
        type: file.type,
        isPublic: file.isPublic,
        parentId: file.parentId,
      };
      return fixFile;
    });

    res.status(200).json(filesArray);
  }

  static async retrieveUser(req) {
    const token = req.header('X-Token');
    if (!token) {
      return null;
    }

    const key = `auth_${token}`;

    const userId = await redisClient.get(key);
    if (!userId) {
      return null;
    }

    const { users } = dbClient;

    const userDocument = await users.findOne({
      _id: ObjectId(userId),
    });
    if (!userDocument) {
      return null;
    }
    return userDocument;
  }
}

export default FileController;
