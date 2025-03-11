import pkg from 'pg';
const { Client } = pkg;
import mongoose from "mongoose";
import dotenv from 'dotenv';
dotenv.config();

// import { Sequelize } from "sequelize";

// Postgresql for local connection
// const sequelize = new Sequelize(
//   //"postgres://postgres:123456@localhost:5432/nudgedb", // local connection
//   {
//     dialect: "postgres",
//     logging: console.log,
//   }
// );
console.log("Connecting to PostgreSQL...");

/*  "db_name": "dic_mission_service_db"
 "db_name": "dic_survey_engine_db", */

const createPostgresClient = (dbName) => {

  return new Client({
    host: process.env.PG_HOST,
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    database: dbName,
    port: process.env.PG_PORT,
    ssl: {
      rejectUnauthorized: false // Set to `false` if you are using a self-signed certificate (only for testing)
    }
  });
};


// MongoDB connection with dynamic db_name
// const createMongoClient = (dbName) => {
//   return mongoose.connect(`mongodb://localhost:27017/${dbName}`);
// };

// MongoDB
mongoose.connect("mongodb://localhost:27017/nudgedb")
  .then(() => {
    console.log("MongoDB connected");
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });

export { createPostgresClient, mongoose };
