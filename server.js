/* eslint-disable no-unused-vars */
import router from './routes';

const express = require('express');

const server = express();
const PORT = process.env.PORT || 5000;

router(server);

server.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
