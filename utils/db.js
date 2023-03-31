import mongodb from 'mongodb';

class DBClient {
  constructor() {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || 27017;
    const database = process.env.DB_DATABASE || 'files_manager';
    const url = `mongodb://${host}:${port}`;
    this.client = new mongodb.MongoClient(url, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    this.isConnected = false;
    this.client.on('open', () => {
      this.isConnected = true;
    });
    this.client.on('topologyClosed', () => {
      this.isConnected = true;
    });
    this.client.connect();
    this.db = this.client.db(database);
    this.users = this.db.collection('users');
    this.files = this.db.collection('files');
  }

  isAlive() {
    return this.isConnected;
  }

  async nbUsers() {
    return this.users.countDocuments();
  }

  async nbFiles() {
    return this.files.countDocuments();
  }
}

const dbClient = new DBClient();

export default dbClient;
