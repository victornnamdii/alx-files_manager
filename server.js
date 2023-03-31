import router from './routes';

const express = require('express');

const server = express();
const PORT = process.env.PORT || 5000;

server.use(express.json());
server.use(express.urlencoded({ extended: true }));
router(server);

server.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
