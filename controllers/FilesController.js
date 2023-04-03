import {
  ObjectId,
} from 'mongodb';
import { join } from 'path';
import {
  v4,
} from 'uuid';
import {
  mkdir, writeFile, access, constants,
} from 'fs';
import mime from 'mime-types';
import Queue from 'bull/lib/queue';
import { promisify } from 'util';
import redisClient from '../utils/redis';
import dbClient from '../utils/db';

const fileQueue = new Queue('thumbnail generation');

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

    if (type === 'image') {
      const jobName = `Image thumbnail [${userDocument._id.toString()}-${fileId}]`;
      fileQueue.add({ userId: userDocument._id.toString(), fileId, name: jobName });
    }
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

  static async putPublish(req, res) {
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
      return;
    }
    await files.update({
      _id: ObjectId(fileId),
    }, {
      $set: { isPublic: true },
    });
    const newFile = await files.findOne({
      _id: ObjectId(fileId),
    });
    console.log(newFile);
    res.status(200).json({
      id: newFile._id,
      userId: newFile.userId,
      name: newFile.name,
      type: newFile.type,
      isPublic: newFile.isPublic,
      parentId: newFile.parentId,
    });
  }

  static async putUnpublish(req, res) {
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
      return;
    }
    await files.updateOne({
      _id: ObjectId(fileId),
    }, {
      $set: { isPublic: false },
    });
    const newFile = await files.findOne({
      _id: ObjectId(fileId),
    });
    res.status(200).json({
      id: newFile._id.toString(),
      userId: newFile.userId,
      name: newFile.name,
      type: newFile.type,
      isPublic: newFile.isPublic,
      parentId: newFile.parentId,
    });
  }

  static async getFile(req, res) {
    const fileId = req.params.id;
    const userDocument = await FileController.retrieveUser(req);
    const userId = userDocument ? userDocument._id.toString() : null;
    const { size } = req.query;
    /* if (!userDocument) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    } */

    const { files } = dbClient;

    const file = await files.findOne({
      _id: ObjectId(fileId),
    });
    if (!file || (!file.isPublic && (file.userId.toString() !== userId))) {
      res.status(404).json({ error: 'Not found' });
    } else if (file.type === 'folder') {
      res.status(400).json({ error: 'A folder doesn\'t have content' });
    } else {
      const exists = (path) => new Promise((resolve) => {
        access(path, constants.F_OK, (err) => {
          resolve(!err);
        });
      });
      const path = size && file.type === 'image' ? `${file.localPath}_${size}` : file.localPath;
      if (!(await exists(path))) {
        res.status(404).json({ error: 'Not found' });
      } else {
        res.set('Content-Type', mime.lookup(file.name));
        res.status(200).sendFile(file.localPath);
      }
    }
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
