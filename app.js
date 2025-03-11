import express from 'express';
import bodyParser from 'body-parser';
import postgresRoutes from './src/routes/postgresRoute.js';
import mongoRoutes from './src/routes/mongoRoute.js';

const app = express();

app.use(bodyParser.json());

app.use('/', postgresRoutes);
app.use('/', mongoRoutes);

app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});