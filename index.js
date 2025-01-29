const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'joyas',
    password: 'postgres',
    port: 5432,
});

const logRequest = (req, res, next) => {
    console.log(`Request received: ${req.method} ${req.url} at ${new Date().toISOString()}`);
    next();
};

app.use(logRequest);

const getJoyas = async (limit, page, order_by) => {
    const offset = (page - 1) * limit;
    const order = order_by ? order_by.replace('_', ' ') : 'id ASC';
    const query = `SELECT * FROM inventario ORDER BY ${order} LIMIT $1 OFFSET $2`;
    const values = [limit, offset];
    const result = await pool.query(query, values);
    return result.rows;
};

const getJoyasHATEOAS = (joyas) => {
    return {
        total: joyas.length,
        data: joyas.map(j => ({
            ...j,
            links: [{
                rel: "self",
                href: `/joyas/${j.id}`
            }]
        }))
    };
};

app.get('/joyas', async (req, res) => {
    try {
        const { limit = 10, page = 1, order_by } = req.query;
        const joyas = await getJoyas(parseInt(limit), parseInt(page), order_by);
        res.json(getJoyasHATEOAS(joyas));
    } catch (error) {
        console.error('Error obteniendo las joyas:', error);
        res.status(500).send('Error en el servidor');
    }
});

app.get('/joyas/filtros', async (req, res) => {
    try {
        const { precio_max, precio_min, categoria, metal } = req.query;
        let query = 'SELECT * FROM inventario WHERE 1=1';
        const values = [];
        
        if (precio_max) {
            values.push(precio_max);
            query += ` AND precio <= $${values.length}`;
        }
        if (precio_min) {
            values.push(precio_min);
            query += ` AND precio >= $${values.length}`;
        }
        if (categoria) {
            values.push(categoria);
            query += ` AND categoria = $${values.length}`;
        }
        if (metal) {
            values.push(metal);
            query += ` AND metal = $${values.length}`;
        }

        const result = await pool.query(query, values);
        res.json(result.rows);
    } catch (error) {
        console.error('Error aplicando los filtros:', error);
        res.status(500).send('Error en el servidor');
    }
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
