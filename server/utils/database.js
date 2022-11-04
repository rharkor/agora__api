const { Client } = require("pg");
const client = new Client({
  user: process.env.DATABASE_USER,
  host: process.env.DATABASE_HOST,
  database: process.env.DATABASE_NAME,
  password: process.env.DATABASE_PASSWORD,
  port: process.env.DATABASE_PORT,
});

const connect = async () => {
  try {
    client.connect();
    await client.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);
    await client.query(`CREATE TABLE IF NOT exists users (
          id SERIAL PRIMARY KEY,
          email TEXT NOT NULL UNIQUE,
          univusername TEXT NOT NULL,
          password TEXT NOT NULL,
          admin BOOL NOT NULL
      );`);
    await client.query(`CREATE TABLE IF NOT EXISTS info(
      onerow_id bool PRIMARY KEY DEFAULT TRUE,
      multipleusers BOOL NOT NULL,
      CONSTRAINT onerow_uni CHECK (onerow_id)
    );`);
    try {
      await client.query(`INSERT INTO info(multipleusers) VALUES (false)`);
    } catch (e) {}
    await client.query(`CREATE TABLE IF NOT EXISTS notifications(
      id SERIAL PRIMARY KEY,
      user_id INT UNIQUE,
      subscription_endpoint text,
      subscription_keys text,
      basic_notification BOOL,
      constraint fk_user foreign key(user_id) references users(id)
    );`);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
};

module.exports = {
  connect,
  client,
};
