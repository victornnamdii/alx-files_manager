import AppController from '../controllers/AppController';
import UsersController from '../controllers/UsersController';
import AuthController from '../controllers/AuthController';

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
};

export default router;
