"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const fs_1 = __importDefault(require("fs"));
const mime_types_1 = __importDefault(require("mime-types"));
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const pool = new pg_1.Pool({
    user: process.env.USER,
    host: process.env.HOST,
    database: process.env.DATABASE,
    password: process.env.PASSWORD,
    port: 5432,
    ssl: {
        rejectUnauthorized: false
    }
});
let lookup = mime_types_1.default.lookup;
const port = process.env.PORT || 5000;
const server = http_1.default.createServer(async (req, res) => {
    const path = req.url;
    if (path === "/api/users/login" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => {
            body += chunk.toString();
        });
        req.on("end", async () => {
            try {
                const { username, password } = JSON.parse(body);
                const result = await pool.query("SELECT * FROM users WHERE username = $1 AND password = $2", [username, password]);
                if (result.rows.length > 0) {
                    const user = result.rows[0];
                    res.writeHead(200, { "Content-Type": "application/json" });
                    res.end(JSON.stringify(user));
                }
                else {
                    res.writeHead(401, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ message: "Invalid Login Credentials" }));
                }
            }
            catch (error) {
                console.error("Error during login:", error);
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "Internal Server Error" }));
            }
        });
    }
    else if (path === "/api/ingredients" && req.method === "GET") {
        try {
            const result = await pool.query("SELECT ingredients_name , ingredients_price FROM ingredients");
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify(result.rows));
        }
        catch (err) {
            console.error("Error fetching ingredients data:", err);
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Internal Server Error" }));
        }
    }
    else if (path === "/api/ingredients_orders" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => {
            body += chunk.toString();
        });
        req.on("end", async () => {
            try {
                const { ingredient_name, price, quantity } = JSON.parse(body);
                const result = await pool.query("INSERT INTO ingredients_orders (ingredient_name, price, quantity,order_date) VALUES ($1, $2, $3,NOW()) RETURNING *", [ingredient_name, price, quantity]);
                if (result.rows.length > 0) {
                    const newOrder = result.rows[0];
                    res.writeHead(200, { "Content-Type": "application/json" });
                    res.end(JSON.stringify(newOrder));
                }
                else {
                    res.writeHead(400, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ message: "Invalid Login Credentials" }));
                }
            }
            catch (error) {
                console.error("Error during login:", error);
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "Internal Server Error" }));
            }
        });
    }
    else if (path === "/api/ingredients_orders" && req.method === "GET") {
        try {
            const result = await pool.query("SELECT ingredient_name,price ,quantity FROM ingredients_orders");
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify(result.rows));
        }
        catch (err) {
            console.error("Error fetching ingredients data:", err);
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Internal Server Error" }));
        }
    }
    else if (path.startsWith("/api/ingredients_orders/") && req.method === "GET") {
        const orederId = parseInt(path.split("/").pop() || "", 10);
        if (isNaN(orederId)) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Invalid product ID" }));
            return;
        }
        try {
            const result = await pool.query(`SELECT ingredients_orders.*, ingredients.ingredients_price 
                FROM ingredients_orders JOIN ingredients ON ingredients_orders.ingredient_name = ingredients.ingredients_name 
                WHERE ingredients_orders.id = $1;`, [orederId]);
            if (result.rows.length > 0) {
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify(result.rows));
            }
            else {
                res.writeHead(404, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ message: "Order not found" }));
            }
        }
        catch (error) {
            console.error("Error fetching product data:", error);
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Internal Server Error" }));
        }
    }
    else if (path.startsWith("/api/ingredients/") && req.method === "GET") {
        const productId = parseInt(path.split("/").pop() || "", 10);
        if (isNaN(productId)) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Invalid product ID" }));
            return;
        }
        try {
            const result = await pool.query(`SELECT i.ingredients_name, p.product_name 
                FROM ingredients i
                JOIN products_ingredients pi ON i.ingredientsid = pi.ingredientsid
                JOIN product p ON pi.productid = p.productid
                WHERE p.productid = $1`, [productId]);
            if (result.rows.length > 0) {
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify(result.rows));
            }
            else {
                res.writeHead(404, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ message: "Product not found" }));
            }
        }
        catch (error) {
            console.error("Error fetching product data:", error);
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Internal Server Error" }));
        }
    }
    else if (path.startsWith("/api/ingredients/") && req.method === "POST") {
        const productId = parseInt(path.split("/").pop() || "", 10);
        if (isNaN(productId)) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Invalid product ID" }));
            return;
        }
        let body = "";
        req.on("data", (chunk) => {
            body += chunk;
        });
        req.on("end", async () => {
            try {
                const { ingredients } = JSON.parse(body);
                if (!Array.isArray(ingredients) || ingredients.length === 0) {
                    res.writeHead(400, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ error: "Invalid ingredients data" }));
                    return;
                }
                for (const ingredient of ingredients) {
                    let ingredientId;
                    const existingIngredient = await pool.query("SELECT ingredientsid FROM ingredients WHERE ingredients_name = $1", [ingredient]);
                    if (existingIngredient.rows.length > 0) {
                        ingredientId = existingIngredient.rows[0].ingredientsid;
                    }
                    else {
                        const newIngredient = await pool.query("INSERT INTO ingredients (ingredients_name, ingredients_price) VALUES ($1, 0) RETURNING ingredientsid", [ingredient]);
                        ingredientId = newIngredient.rows[0].ingredientsid;
                    }
                    await pool.query("INSERT INTO products_ingredients (productid, ingredientsid) VALUES ($1, $2)", [productId, ingredientId]);
                }
                res.writeHead(201, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ message: "Ingredients added successfully to product" }));
            }
            catch (error) {
                console.error("Error adding ingredients:", error);
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "Internal Server Error" }));
            }
        });
    }
    else if (path.startsWith("/api/nutritional/") && req.method === "GET") {
        const productId = parseInt(path.split("/").pop() || "", 10);
        if (isNaN(productId)) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Invalid product ID" }));
            return;
        }
        try {
            const result = await pool.query("SELECT n.*, p.product_name " +
                "FROM nutritional n " +
                "JOIN product p ON n.productid = p.productid " +
                "WHERE n.productid = $1", [productId]);
            if (result.rows.length > 0) {
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify(result.rows[0]));
            }
            else {
                res.writeHead(404, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ message: "Product not found" }));
            }
        }
        catch (error) {
            console.error("Error fetching product data:", error);
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Internal Server Error" }));
        }
    }
    else if (path === "/api/nutritional" && req.method === "POST") {
        let body = "";
        req.on("data", chunk => {
            body += chunk.toString();
        });
        req.on("end", async () => {
            try {
                const { productid, calories, carbs, sugar, fat, protein, sodium } = JSON.parse(body);
                const result = await pool.query("INSERT INTO nutritional (productid, calories, carbs, sugar, fat, protein, sodium) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *", [productid, calories, carbs, sugar, fat, protein, sodium]);
                res.writeHead(201, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ message: "Nutritional info added", data: result.rows[0] }));
            }
            catch (error) {
                console.error("Error adding nutritional info:", error);
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "Internal Server Error" }));
            }
        });
    }
    else if (path.startsWith("/api/product/") && req.method === "GET") {
        const productId = parseInt(path.split("/").pop() || "", 10);
        if (isNaN(productId)) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Invalid product ID" }));
            return;
        }
        try {
            const result = await pool.query("SELECT p.*, ps.product_price, ps.product_size, ps.product_sizeid " +
                "FROM product_size ps JOIN product p ON ps.product_id = p.productid " +
                "WHERE p.productid = $1", [productId]);
            if (result.rows.length > 0) {
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify(result.rows));
            }
            else {
                res.writeHead(404, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ message: "Product not found" }));
            }
        }
        catch (error) {
            console.error("Error fetching product data:", error);
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Internal Server Error" }));
        }
    }
    else if (path === "/api/orders" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => {
            body += chunk.toString();
        });
        req.on("end", async () => {
            try {
                const { productid, product_qty, total_amount } = JSON.parse(body);
                if (!productid || !product_qty || !total_amount) {
                    res.writeHead(400, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ error: "Missing required fields" }));
                    return;
                }
                const result = await pool.query("INSERT INTO orders (productid, product_qty, total_amount) VALUES ($1, $2, $3) RETURNING orderid", [productid, product_qty, total_amount]);
                if (result.rows.length > 0) {
                    const orderId = result.rows[0].orderid;
                    res.writeHead(201, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({
                        orderid: orderId,
                        message: "Order created successfully"
                    }));
                }
                else {
                    res.writeHead(500, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ error: "Failed to create order" }));
                }
            }
            catch (error) {
                console.error("Error creating order:", error);
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "Internal Server Error" }));
            }
        });
    }
    else if (path.startsWith("/api/orders/") && req.method === "GET") {
        const orderId = parseInt(path.split("/").pop() || "", 10);
        if (isNaN(orderId)) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Invalid order ID" }));
            return;
        }
        try {
            const result = await pool.query("SELECT o.*, p.product_name FROM orders " +
                "o JOIN product p ON o.productid = p.productid WHERE o.orderid = $1", [orderId]);
            if (result.rows.length > 0) {
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify(result.rows[0]));
            }
            else {
                res.writeHead(404, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ message: "Order not found" }));
            }
        }
        catch (error) {
            console.error("Error fetching order:", error);
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Internal Server Error" }));
        }
    }
    else if (path === "/api/product" && req.method === "GET") {
        try {
            const result = await pool.query("SELECT p.productid, p.product_name, " +
                "p.category_id, p.image_url, STRING_AGG(ps.product_size || ' ($' || ps.product_price || ')', ', ') AS " +
                "sizes_and_prices FROM product p JOIN product_size ps ON p.productid = ps.product_id GROUP BY " +
                "p.productid, p.product_name, p.category_id, p.image_url;");
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify(result.rows));
        }
        catch (error) {
            console.error("Error fetching product data:", error);
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Internal Server Error" }));
        }
    }
    else if (path === "/api/product" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => {
            body += chunk.toString();
        });
        req.on("end", async () => {
            try {
                const { product_name, category_id, image_url, sizes_and_prices } = JSON.parse(body);
                const productResult = await pool.query("INSERT INTO product (product_name, category_id, image_url) VALUES ($1, $2, $3) RETURNING productid", [product_name, category_id, image_url]);
                const newProductId = productResult.rows[0].productid;
                for (let sizePrice of sizes_and_prices) {
                    await pool.query("INSERT INTO product_size (product_id, product_size, product_price) VALUES ($1, $2, $3)", [newProductId, sizePrice.product_size, sizePrice.product_price]);
                }
                const updatedProducts = await pool.query("SELECT p.productid, p.product_name, p.category_id, p.image_url, " +
                    "STRING_AGG(ps.product_size || ' ($' || ps.product_price || ')', ', ') AS sizes_and_prices " +
                    "FROM product p " +
                    "JOIN product_size ps ON p.productid = ps.product_id " +
                    "GROUP BY p.productid, p.product_name, p.category_id, p.image_url");
                res.writeHead(201, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ message: "Product added successfully", products: updatedProducts.rows }));
            }
            catch (error) {
                console.error("Error adding product:", error);
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "Internal Server Error" }));
            }
        });
    }
    else if (path.startsWith("/api/product/") && req.method === "DELETE") {
        const productId = parseInt(path.split("/").pop() || "", 10);
        if (isNaN(productId)) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Invalid product ID" }));
            return;
        }
        try {
            await pool.query("DELETE FROM product_size WHERE product_id = $1", [productId]);
            const result = await pool.query("DELETE FROM product WHERE productid = $1 RETURNING *", [productId]);
            if (result.rowCount > 0) {
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ message: "Product deleted successfully!" }));
            }
            else {
                res.writeHead(404, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ message: "Product not found" }));
            }
        }
        catch (error) {
            console.error("Error deleting product:", error);
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Internal Server Error" }));
        }
    }
    else if (path.startsWith("/api/product-size/") && req.method === "DELETE") {
        const sizeId = parseInt(path.split("/").pop() || "", 10);
        if (isNaN(sizeId)) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Invalid size ID" }));
            return;
        }
        try {
            const result = await pool.query("DELETE FROM product_size WHERE product_sizeid = $1 RETURNING *", [sizeId]);
            if (result.rowCount > 0) {
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ message: "Product size deleted successfully!" }));
            }
            else {
                res.writeHead(404, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ message: "Product size not found" }));
            }
        }
        catch (error) {
            console.error("Error deleting product size:", error);
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Internal Server Error" }));
        }
    }
    else if (path === "/api/employees" && req.method === "GET") {
        try {
            const result = await pool.query("SELECT employee_id, emp_name, emp_type, emp_hours, emp_pay, sin_num FROM employee");
            if (result.rows.length > 0) {
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify(result.rows));
            }
            else {
                res.writeHead(404, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ message: "No employees found" }));
            }
        }
        catch (error) {
            console.error("Error fetching employee data:", error);
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Internal Server Error" }));
        }
    }
    else if (path === "/api/employees" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => {
            body += chunk.toString();
        });
        req.on("end", async () => {
            try {
                const { emp_name, emp_type, emp_hours, emp_pay, sin_num } = JSON.parse(body);
                const result = await pool.query("INSERT INTO employee (emp_name, emp_type, emp_hours, emp_pay, sin_num) VALUES ($1, $2, $3, $4, $5) RETURNING *", [emp_name, emp_type, emp_hours, emp_pay, sin_num]);
                res.writeHead(201, { "Content-Type": "application/json" });
                res.end(JSON.stringify(result.rows[0]));
            }
            catch (error) {
                console.error("Error adding employee:", error);
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "Internal Server Error" }));
            }
        });
    }
    else if (path.startsWith("/api/employees/") && req.method === "DELETE") {
        const employeeId = path.split("/").pop();
        if (isNaN(Number(employeeId))) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Invalid employee ID" }));
            return;
        }
        try {
            const result = await pool.query("DELETE FROM employee WHERE employee_id = $1 RETURNING *", [employeeId]);
            if (result.rows.length > 0) {
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ message: "Employee deleted successfully" }));
            }
            else {
                res.writeHead(404, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ message: "Employee not found" }));
            }
        }
        catch (error) {
            console.error("Error deleting employee:", error);
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Internal Server Error" }));
        }
    }
    else if (path.startsWith("/api/employees/") && path.endsWith("/hours") && req.method === "PUT") {
        try {
            const employeeId = path.split("/")[3];
            if (isNaN(Number(employeeId))) {
                res.writeHead(400, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "Invalid employee ID" }));
                return;
            }
            let body = '';
            req.on('data', (chunk) => {
                body += chunk.toString();
            });
            req.on('end', async () => {
                try {
                    const { emp_hours } = JSON.parse(body);
                    if (emp_hours === undefined || emp_hours === null || isNaN(emp_hours)) {
                        res.writeHead(400, { "Content-Type": "application/json" });
                        res.end(JSON.stringify({ error: "Invalid hours value" }));
                        return;
                    }
                    const result = await pool.query("UPDATE employee SET emp_hours = $1 WHERE employee_id = $2 RETURNING *", [emp_hours, employeeId]);
                    if (result.rows.length > 0) {
                        const response = {
                            message: "Employee hours updated successfully",
                            employee: result.rows[0]
                        };
                        res.writeHead(200, { "Content-Type": "application/json" });
                        res.end(JSON.stringify(response));
                    }
                    else {
                        res.writeHead(404, { "Content-Type": "application/json" });
                        res.end(JSON.stringify({ message: "Employee not found" }));
                    }
                }
                catch (error) {
                    console.error("Error processing request:", error);
                    res.writeHead(400, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ error: "Invalid request body" }));
                }
            });
        }
        catch (error) {
            console.error("Error updating employee hours:", error);
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Internal Server Error" }));
        }
    }
    else if (path.startsWith("/api/daily-sales") && req.method === "GET") {
        try {
            const result = await pool.query("SELECT order_date AS \"Date\", " +
                "COUNT(orderid) AS \"Number of Orders\", SUM(product_qty) AS \"Total Items Sold\", SUM(total_amount) " +
                "AS \"Daily Revenue\" FROM orders GROUP BY order_date ORDER BY order_date DESC;");
            if (result.rows.length > 0) {
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify(result.rows));
            }
            else {
                res.writeHead(404, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ message: "No sales data found" }));
            }
        }
        catch (error) {
            console.error("Error fetching sales data:", error);
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Internal Server Error" }));
        }
    }
    else if (path.startsWith("/api/monthly-sales") && req.method === "GET") {
        try {
            const result = await pool.query("SELECT DATE_TRUNC('month', order_date) AS \"Month\", " +
                "COUNT(orderid) AS \"Total Orders\", SUM(product_qty) AS \"Total Items Sold\", SUM(total_amount) AS \"Monthly Revenue\" " +
                "FROM orders GROUP BY DATE_TRUNC('month', order_date) ORDER BY \"Month\" DESC;");
            if (result.rows.length > 0) {
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify(result.rows));
            }
            else {
                res.writeHead(404, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ message: "No employees found" }));
            }
        }
        catch (error) {
            console.error("Error fetching employee data:", error);
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Internal Server Error" }));
        }
    }
    else if (path.startsWith("/api/best-selling") && req.method === "GET") {
        try {
            const result = await pool.query("SELECT p.product_name, SUM(o.product_qty) " +
                "AS \"Total Quantity Sold\", SUM(o.total_amount) AS \"Total Revenue\" FROM orders o JOIN product p ON " +
                "o.productid = p.productid GROUP BY p.product_name ORDER BY \"Total Revenue\" DESC;\n");
            if (result.rows.length > 0) {
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify(result.rows));
            }
            else {
                res.writeHead(404, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ message: "No employees found" }));
            }
        }
        catch (error) {
            console.error("Error fetching employee data:", error);
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Internal Server Error" }));
        }
    }
    else {
        let filePath = path;
        if (path === "/" ||
            path === "/home" ||
            path === "/login" ||
            path === "/about" ||
            path === "/dashboard" ||
            path === "/employees" ||
            path === "/inventory" ||
            path === "/labels" ||
            path === "/menu" ||
            path === "/sales" ||
            path === "/checkout" ||
            path === "/order-confirmation" ||
            path === "/shop") {
            filePath = "/index.html";
        }
        let mime_type = lookup(filePath.substring(1));
        fs_1.default.readFile(__dirname + filePath, function (err, data) {
            if (err) {
                res.writeHead(404);
                res.end("Error 404 - File Not Found" + err.message);
                return;
            }
            if (!mime_type) {
                mime_type = "text/plain";
            }
            res.setHeader("X-Content-Type-Options", "nosniff");
            res.writeHead(200, { "Content-Type": mime_type });
            res.end(data);
        });
    }
});
server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});
//# sourceMappingURL=server.js.map