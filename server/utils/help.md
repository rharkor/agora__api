-- Show tables
SELECT \*
FROM pg_catalog.pg_tables
WHERE schemaname != 'pg_catalog' AND
schemaname != 'information_schema';

-- show databases
SELECT datname FROM pg_database;

-- Create db
CREATE DATABASE user_9_sales OWNER user_9_lachica;

-- delete database
drop database sales;

-- show users
SELECT \*
FROM pg_catalog.pg_user;

-- show users simplified
select pg_user.usename from pg_catalog.pg_user;

-- Create user
CREATE USER user_9_default WITH PASSWORD 'test123';

-- Delete user
DROP USER IF EXISTS user_9_default;

-- Show tablespace
SELECT \* FROM pg_tablespace;

-- Create tablespace
CREATE TABLESPACE user_9_tablespace OWNER user_9_lachica location '/data';
