const express = require("express");
const router = express.Router();
const onlyLettersPattern = new RegExp(/^[A-Za-z0-9_]+$/);

const { client, getPoolDatabase } = require("../../utils/database");

router.get("/db-user", async (req, res, next) => {
  try {
    const user = await client.query(
      "select pg_user.usename from pg_catalog.pg_user where pg_user.usename = $1;",
      [`user_${req.body.id}_default`]
    );

    if (user.rows.length > 0) {
      return res.json({ status: "success", user: user.rows[0].usename });
    }

    throw "No user found";
  } catch (e) {
    next(e);
  }
});

router.get("/projects", async (req, res, next) => {
  try {
    const projects = await client.query(
      "SELECT datname FROM pg_database where datname LIKE $1;",
      [`user_${req.body.id}_%`]
    );

    return res.json({
      projects: projects.rows.map((row) =>
        row.datname.replace(`user_${req.body.id}_`, "")
      ),
    });
  } catch (e) {
    next(e);
  }
});

router.post("/new-project", async (req, res, next) => {
  try {
    const { name, password, id } = req.body;
    if (!name) {
      throw "Need a project name";
    }
    if (!password) {
      throw "Need a database password";
    }

    if (
      !id.toString().match(onlyLettersPattern) ||
      !name.match(onlyLettersPattern) ||
      !password.match(onlyLettersPattern)
    ) {
      throw "No special characters excepting '_' please!";
    }

    try {
      await client.query(
        `CREATE USER user_${id}_default WITH PASSWORD '${password}';`
      );
    } catch (e) {
      if (e.message !== `role "user_${id}_default" already exists`) {
        console.error(e);
        throw e;
      }
    }

    await client.query(
      `CREATE DATABASE user_${id}_${name} OWNER user_${id}_default;`
    );

    return res.json({ status: "success" });
  } catch (e) {
    next(e);
  }
});

router.post("/delete-project", async (req, res, next) => {
  try {
    const { name, id } = req.body;

    if (!name) {
      throw "Need the project name";
    }

    if (
      !id.toString().match(onlyLettersPattern) ||
      !name.match(onlyLettersPattern)
    ) {
      throw "No special characters excepting '_' please!";
    }

    const owner = await client.query(
      "SELECT datdba::regrole FROM pg_database WHERE datname = $1;",
      [`user_${id}_${name}`]
    );

    if (owner.rows.length <= 0) {
      throw "No database found";
    }

    if (owner.rows[0].datdba !== `user_${id}_default`) {
      throw "You're not the owner";
    }

    await client.query(`drop database user_${id}_${name};`);

    return res.json({ status: "success" });
  } catch (e) {
    next(e);
  }
});

router.get("/project/:name", async (req, res, next) => {
  try {
    const { name } = req.params;
    const { id } = req.body;

    const databaseName = `user_${id}_${name}`;

    const uri = {
      host: process.env.DATABASE_HOST,
      port: process.env.DATABASE_PORT,
      user: `user_${id}_default`,
      database: databaseName,
    };

    const pool = getPoolDatabase(databaseName);

    const tables = (
      await pool.query(`SELECT *
    FROM pg_catalog.pg_tables
    WHERE schemaname != 'pg_catalog' AND
    schemaname != 'information_schema';`)
    ).rows;

    await pool.end();

    return res.json({
      status: "success",
      uri,
      tables,
    });
  } catch (e) {
    next(e);
  }
});

router.get("/project/:name", async (req, res, next) => {
  try {
    const { name } = req.params;
    const { id, tableName, columns } = req.body;

    if (!tableName || !columns) {
      throw "You must specify tableName and columns";
    }

    if (!tableName.match(onlyLettersPattern)) {
      throw "No special characters excepting '_' please!";
    }

    const databaseName = `user_${id}_${name}`;

    const uri = {
      host: process.env.DATABASE_HOST,
      port: process.env.DATABASE_PORT,
      user: `user_${id}_default`,
      database: databaseName,
    };

    const pool = getPoolDatabase(databaseName);

 
      
      await pool.query(`CREATE TABLE ${tableName} (
        ${columns}
      )`)
    ;

    await pool.end();

    return res.json({
      status: "success",
    });
  } catch (e) {
    next(e);
  }
});

router.get("/project/:name/:table", async (req, res, next) => {
  try {
    const { name, table } = req.params;
    const { id } = req.body;
    const page = isNaN(req.query.page) ? 0 : req.query.page;

    if (!table.toString().match(onlyLettersPattern)) {
      throw "No special characters excepting '_' please!";
    }

    const databaseName = `user_${id}_${name}`;

    const pool = getPoolDatabase(databaseName);

    const rows = await pool.query(`SELECT * FROM ${table} LIMIT 20 OFFSET $1`, [
      page,
    ]);

    await pool.end();

    return res.json({
      status: "success",
      rows: rows.rows,
      fields: rows.fields,
    });
  } catch (e) {
    next(e);
  }
});

router.put("/project/:name/:table", async (req, res, next) => {
  try {
    const { name, table } = req.params;
    const { id, rows } = req.body;

    if (!table.toString().match(onlyLettersPattern)) {
      throw "No special characters excepting '_' please!";
    }

    const databaseName = `user_${id}_${name}`;

    const pool = getPoolDatabase(databaseName);

    const allPromises = [];

    rows.forEach((row) => {
      allPromises.push(
        pool.query(
          `INSERT INTO ${table}(${Object.keys(row).join(
            ", "
          )}) VALUES (${Array.from(Array(Object.values(row).length)).reduce(
            (old, act, i) =>
              (old += i === 0 ? "$" + (i + 1) : "," + " $" + (i + 1)),
            ""
          )})`,
          Object.values(row)
        )
      );
    });

    await Promise.all(allPromises);

    await pool.end();

    return res.json({
      status: "success",
    });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
