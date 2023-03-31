/* eslint-disable no-unused-vars */
import AppController from '../controllers/AppController';

const router = (app) => {
  app.get('/status', AppController.getStatus);
  app.get('/stats', AppController.getStats);
};

export default router;
