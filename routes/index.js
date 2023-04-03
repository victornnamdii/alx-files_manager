import AppController from '../controllers/AppController';
import UsersController from '../controllers/UsersController';
import AuthController from '../controllers/AuthController';
import FileController from '../controllers/FilesController';

const router = (app) => {
  /* App Status and stats */
  app.get('/status', AppController.getStatus);
  app.get('/stats', AppController.getStats);

  /* Users */
  app.post('/users', UsersController.postNew);
  app.get('/users/me', UsersController.getMe);

  /* Authorization */
  app.get('/connect', AuthController.getConnect);
  app.get('/disconnect', AuthController.getDisconnect);

  /* Files */
  app.post('/files', FileController.postUpload);
  app.get('/files/:id', FileController.getShow);
  app.get('/files', FileController.getIndex);
  app.put('/files/:id/publish', FileController.putPublish);
  app.put('/files/:id/unpublish', FileController.putUnpublish);
  app.get('/files/:id/data', FileController.getFile);
};

export default router;
