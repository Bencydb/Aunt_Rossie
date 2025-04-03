"use strict";
(function () {
    function CheckLogin() {
        if (sessionStorage.getItem("user")) {
            $("#login").html(`<a id="logout" class="nav-ver" href="/login"> Logout</a>`);
        }
        else {
            $("header").hide();
        }
        $("#logout").on("click", function () {
            sessionStorage.clear();
            location.href = "/login";
        });
    }
    function Loadheader(html_data) {
        if (router.ActiveLink === "login" || router.ActiveLink === "register") {
            $("header").hide();
            return;
        }
        $.get("/views/components/header.html", function (html_data) {
            $("header").html(html_data);
            if (typeof router !== "undefined" && router.ActiveLink) {
                document.title = capitalizeFirstLetter(router.ActiveLink);
                $(`li > a:contains(${document.title})`).addClass("active").attr("aria-current", "page");
            }
            AddNavigationEvents();
            CheckLogin();
        });
    }
    function capitalizeFirstLetter(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
    function AddNavigationEvents() {
        let navlinks = $("ul>li>a");
        navlinks.off("click");
        navlinks.off("mouseenter");
        navlinks.on("mouseenter", function () {
            $(this).css("cursor", "pointer");
        });
    }
    function DisplayLoginPage() {
        console.log("Called DisplayLoginPage()");
        let messageArea = $("#messageArea");
        messageArea.hide();
        $("#loginButton").on("click", function () {
            let username = document.forms[0].username.value;
            let password = document.forms[0].password.value;
            fetch("/api/users/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ username, password }),
            })
                .then((response) => {
                if (!response.ok) {
                    throw new Error("Invalid Login Credentials");
                }
                return response.json();
            })
                .then((user) => {
                let newUser = new core.User();
                newUser.fromJSON(user);
                let redirectURL = "";
                if (user.role === "Admin") {
                    redirectURL = "/dashboard";
                }
                sessionStorage.setItem("user", JSON.stringify(user));
                messageArea.removeAttr("class").hide();
                location.href = redirectURL;
            })
                .catch((error) => {
                console.error("Error during login:", error);
                $("#username").trigger("focus").trigger("select");
                messageArea
                    .addClass("alert alert-danger")
                    .text("Error: Invalid Login Credentials")
                    .show();
            });
        });
        $("#cancelButton").on("click", function () {
            document.forms[0].reset();
            location.href = "/home";
        });
    }
    function Display404Page() {
        console.log("Display404Page() Called..");
    }
    function DisplayHomePage() {
        console.log("DisplayHomePage() Called..");
    }
    function DisplayAboutPage() {
        console.log("DisplayAboutPage() Called..");
    }
    function DisplayCheckoutPage() {
        console.log("DisplayCheckoutPage() Called..");
        function generateReceipt(order) {
            if (!order) {
                console.error("No order data provided");
                return;
            }
            const doc = new jsPDF();
            doc.setFontSize(18);
            doc.text("Order Receipt", 105, 20, { align: "center" });
            doc.setFontSize(12);
            doc.text(`Order Number: #${order.id}`, 20, 40);
            doc.text(`Order Date: ${formatDate(order.order_date)}`, 20, 50);
            let y = 70;
            doc.setFontSize(12);
            doc.text("Item", 20, y);
            doc.text("Quantity", 90, y);
            doc.text("Price", 130, y);
            doc.text("Total", 170, y);
            doc.line(20, y + 2, 190, y + 2);
            y += 15;
            doc.text(order.ingredient_name, 20, y);
            doc.text(order.quantity.toString(), 95, y);
            doc.text(`$${order.ingredients_price.toFixed(2)}`, 130, y);
            doc.text(`$${(order.ingredients_price * order.quantity).toFixed(2)}`, 170, y);
            y += 20;
            doc.setFontSize(14);
            doc.text("Total:", 130, y);
            doc.text(`$${(order.ingredients_price * order.quantity).toFixed(2)}`, 170, y);
            doc.save(`Order_Receipt_${order.id}.pdf`);
        }
        function safeParseNumber(value) {
            const num = typeof value === "string" ? parseFloat(value) : Number(value);
            return isNaN(num) ? 0 : num;
        }
        function formatDate(isoDate) {
            if (!isoDate)
                return "Invalid Date";
            try {
                const date = new Date(isoDate);
                return date.toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                });
            }
            catch (e) {
                console.error("Date formatting error:", e);
                return "Invalid Date";
            }
        }
        function displayOrderConfirmation() {
            const orderId = window.location.hash.substring(1);
            console.log("Extracted Order ID:", orderId);
            if (!orderId || isNaN(Number(orderId))) {
                console.error("Invalid Order ID in URL");
                const messageElement = document.getElementById("confirmation-message");
                if (messageElement) {
                    messageElement.innerHTML = `
                    <h3>Order Not Found</h3>
                    <p>Please check your order number.</p>
                `;
                }
                return;
            }
            fetch(`http://localhost:5000/api/ingredients_orders/${orderId}`)
                .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
                .then((data) => {
                console.log("Raw API Data:", data);
                if (!data || typeof data !== "object") {
                    throw new Error("Invalid data received from API");
                }
                const orderData = Array.isArray(data) ? data[0] : data;
                const order = {
                    id: orderData.id || 0,
                    ingredient_name: orderData.ingredient_name || "Unknown Item",
                    order_date: formatDate(orderData.order_date),
                    price: safeParseNumber(orderData.price),
                    quantity: safeParseNumber(orderData.quantity),
                    ingredients_price: safeParseNumber(orderData.ingredients_price),
                };
                console.log("Processed Order Data:", order);
                const orderNumberElement = document.getElementById("order-number");
                const orderDateElement = document.getElementById("order-date");
                const orderItemsBodyElement = document.getElementById("order-items-body");
                const orderTotalElement = document.getElementById("order-total");
                if (orderNumberElement)
                    orderNumberElement.textContent = `#${order.id}`;
                if (orderDateElement)
                    orderDateElement.textContent = order.order_date;
                if (orderItemsBodyElement) {
                    orderItemsBodyElement.innerHTML = `
                        <tr>
                            <td>${order.ingredient_name}</td>
                            <td>${order.quantity}</td>
                            <td>$${order.ingredients_price.toFixed(2)}</td>
                            <td>$${order.price}</td>
                        </tr>
                    `;
                }
                if (orderTotalElement)
                    orderTotalElement.textContent = `$${(order.ingredients_price * order.quantity).toFixed(2)}`;
                const ReceiptBtn = document.getElementById("print-btn");
                if (ReceiptBtn) {
                    ReceiptBtn.addEventListener("click", () => {
                        if (order) {
                            generateReceipt(order);
                        }
                        else {
                            console.error("Order data is not available.");
                        }
                    });
                }
            })
                .catch(error => {
                console.error("Error fetching order:", error);
                const messageElement = document.getElementById("confirmation-message");
                if (messageElement) {
                    messageElement.innerHTML = `
                        <h3>Error Loading Order</h3>
                        <p>We couldn't retrieve your order details. Please check your order number and try again.</p>
                    `;
                }
            });
        }
        displayOrderConfirmation();
    }
    function DisplayMenuPage() {
        console.log("DisplayMenuPage() Called..");
        fetch("http://localhost:5000/api/product")
            .then((response) => {
            if (!response.ok) {
                throw new Error("Error fetching product data");
            }
            return response.json();
        })
            .then((data) => {
            buildTable(data);
        })
            .catch((error) => console.error("Error fetching product data:", error));
        function buildTable(data) {
            const piesTable = document.querySelector("#pies-output");
            const preservesTable = document.querySelector("#preserves-output");
            let piesOutput = `
        <h2 class="category-heading" >Pies</h2>
        <table class="table">
            <thead>
                <tr>
                    <th>Image</th>
                    <th>Product</th>
                    <th>Size & Price</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody>
    `;
            let preservesOutput = `
        <h2 class="category-heading" >Preserves</h2>
        <table class="table">
            <thead>
                <tr>
                    <th>Image</th>
                    <th>Product</th>
                    <th>Size & Price</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody>
    `;
            for (const product of data) {
                const row = `
            <tr>
                <td><img src="${product.image_url}" alt="${product.product_name}" width="100"></td>
                <td>${product.product_name}</td>
                <td>${product.sizes_and_prices}</td>
                <td>
                    <button class="btn btn-primary" onclick="productInfo('${product.productid}')"><i class="fa-solid fa-circle-info"></i> Info</button>
                    <button class="btn btn-primary" onclick="productShop('${product.productid}')"><i class="fa-solid fa-cart-shopping"></i> Buy</button>
                </td>
            </tr>
        `;
                if (product.category_id === 1) {
                    piesOutput += row;
                }
                else if (product.category_id === 2) {
                    preservesOutput += row;
                }
            }
            piesOutput += `</tbody></table>`;
            preservesOutput += `</tbody></table>`;
            piesTable.innerHTML = piesOutput;
            preservesTable.innerHTML = preservesOutput;
        }
        window.productInfo = (productid) => {
            window.location.href = `/labels#${productid}`;
        };
        window.productShop = (productid) => {
            window.location.href = `/shop#${productid}`;
        };
    }
    function DisplayShopPage() {
        console.log("DisplayShopPage() Called..");
        const productId = window.location.hash.substring(1);
        if (!productId) {
            const piesTable = document.querySelector("#pies-output");
            piesTable.innerHTML = `<div class="alert alert-danger">Product ID not specified in URL</div>`;
            return;
        }
        fetch(`http://localhost:5000/api/product/${productId}`)
            .then((response) => {
            if (!response.ok) {
                throw new Error(`Error fetching product data: ${response.statusText}`);
            }
            return response.json();
        })
            .then((data) => {
            if (!Array.isArray(data)) {
                buildTable([data]);
            }
            else {
                buildTable(data);
            }
        })
            .catch((error) => {
            console.error("Error fetching product data:", error);
            const piesTable = document.querySelector("#pies-output");
            piesTable.innerHTML = `<div class="alert alert-danger">Error loading product: ${error.message}</div>`;
        });
        function buildTable(data) {
            const piesTable = document.querySelector("#pies-output");
            if (!data || data.length === 0) {
                piesTable.innerHTML = "<div class='alert alert-info'>No product details available</div>";
                return;
            }
            let piesOutput = `
    <table class="table table-striped table-hover">
        <thead class="thead-dark">
            <tr>
                <th>Image</th>
                <th>Product</th>
                <th>Size</th>
                <th>Price</th>
                <th>Qty</th>
                <th>Action</th>
            </tr>
        </thead>
        <tbody>`;
            for (const product of data) {
                piesOutput += `
    <tr>
        <td><img src="${product.image_url}" alt="${product.product_name}" class="img-thumbnail" width="100"></td>
        <td>${product.product_name}</td>
        <td>${product.product_size}</td>
        <td>$${parseFloat(product.product_price).toFixed(2)}</td>
        <td>
            <input type="number" 
                   id="qty-${product.productid}-${product.product_sizeid}" 
                   class="form-control" 
                   min="1" 
                   max="10" 
                   value="1"
                   style="width: 70px;">
        </td>
        <td>
            <button class="btn btn-primary" 
                    onclick="addToCart(
                        '${product.productid}', 
                        '${product.product_sizeid}', 
                        '${product.product_price}',
                        document.getElementById('qty-${product.productid}-${product.product_sizeid}').value
                    )">
                Add to Cart
            </button>
        </td>
    </tr>`;
            }
            piesOutput += `</tbody></table>`;
            piesTable.innerHTML = piesOutput;
        }
    }
    window.addToCart = async (productId, sizeId, price, quantity) => {
        const qty = parseInt(quantity);
        if (isNaN(qty) || qty < 1) {
            alert("Please enter a valid quantity (1-10)");
            return;
        }
        const totalAmount = parseFloat(price) * qty;
        try {
            const response = await fetch('http://localhost:5000/api/orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    productid: productId,
                    product_qty: qty,
                    total_amount: totalAmount.toFixed(2)
                })
            });
            if (!response.ok) {
                throw new Error('Failed to add to cart');
            }
            const result = await response.json();
            console.log('Order added:', result);
            window.location.href = `/order-confirmation#${result.orderid}`;
        }
        catch (error) {
            console.error('Error adding to cart:', error);
            alert('Error adding to cart. Please try again.');
        }
    };
    function DisplayDashboardPage() {
        console.log("DisplayDashboardPage() Called..");
    }
    function DisplaySalesPage() {
        console.log("DisplaySalesPage() Called..");
        function createTable(headers, rows) {
            const table = document.createElement('table');
            table.className = 'data-table';
            const thead = document.createElement('thead');
            const headerRow = document.createElement('tr');
            headers.forEach(headerText => {
                const th = document.createElement('th');
                th.textContent = headerText;
                headerRow.appendChild(th);
            });
            thead.appendChild(headerRow);
            table.appendChild(thead);
            const tbody = document.createElement('tbody');
            rows.forEach(rowData => {
                const row = document.createElement('tr');
                rowData.forEach(cellData => {
                    const td = document.createElement('td');
                    td.textContent = cellData;
                    row.appendChild(td);
                });
                tbody.appendChild(row);
            });
            table.appendChild(tbody);
            return table;
        }
        function createDownloadButton(panelId, title, headers, data) {
            const button = document.createElement('button');
            button.className = 'download-btn';
            const icon = document.createElement('i');
            icon.className = 'fa-solid fa-file-pdf';
            icon.style.marginRight = '8px';
            const text = document.createTextNode('Report');
            button.appendChild(icon);
            button.appendChild(text);
            button.onclick = () => {
                try {
                    const { jsPDF } = window.jspdf;
                    const doc = new jsPDF();
                    doc.setFontSize(18);
                    doc.text(title, 14, 15);
                    const tableData = data.map(row => [...row]);
                    doc.setFontSize(10);
                    doc.autoTable({
                        head: [headers],
                        body: tableData,
                        startY: 25,
                        theme: 'grid',
                        headStyles: {
                            fillColor: [41, 128, 185],
                            textColor: 255
                        }
                    });
                    doc.save(`${title.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`);
                }
                catch (error) {
                    console.error('Error generating PDF:', error);
                    alert('Error generating PDF. Please try again.');
                }
            };
            return button;
        }
        async function fetchAndDisplay(panelId, endpoint, headers, dataMapper) {
            const panel = document.getElementById(panelId);
            if (!panel)
                return;
            try {
                const panelTitle = panel.querySelector('h2')?.textContent || '';
                panel.innerHTML = `<h2>${panelTitle}</h2>`;
                const response = await fetch(endpoint);
                if (!response.ok)
                    throw new Error(`HTTP error! status: ${response.status}`);
                const data = await response.json();
                console.log('API Data:', data);
                const tableData = dataMapper(data);
                const table = createTable(headers, tableData);
                panel.appendChild(table);
                const downloadBtn = createDownloadButton(panelId, panelTitle, headers, tableData);
                panel.appendChild(downloadBtn);
            }
            catch (error) {
                console.error(`Error loading ${panelId}:`, error);
                panel.innerHTML += `<p class="error">Error loading data</p>`;
            }
        }
        fetchAndDisplay('daily-sales', 'http://localhost:5000/api/daily-sales', ['Date', 'Revenue', 'Orders', 'Items Sold'], (data) => data.map((d) => [
            new Date(d.Date).toLocaleDateString() || '-',
            d['Daily Revenue'] ? `$${parseFloat(d['Daily Revenue']).toFixed(2)}` : '-',
            d['Number of Orders'] || '-',
            d['Total Items Sold'] || '-'
        ]));
        fetchAndDisplay('monthly-sales', 'http://localhost:5000/api/monthly-sales', ['Month', 'Revenue', 'Orders', 'Items Sold'], (data) => data.map((m) => {
            const date = m.Month ? new Date(m.Month) : null;
            const monthYear = date ?
                `${date.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' })} ${date.getUTCFullYear()}` :
                '-';
            return [
                monthYear,
                m['Monthly Revenue'] ? `$${parseFloat(m['Monthly Revenue']).toFixed(2)}` : '-',
                m['Total Orders'] || '-',
                m['Total Items Sold'] || '-'
            ];
        }));
        fetchAndDisplay('top-products', 'http://localhost:5000/api/best-selling', ['Rank', 'Product', 'Quantity Sold', 'Revenue'], (data) => data.map((p, index) => [
            (index + 1).toString(),
            p.product_name || '-',
            p['Total Quantity Sold'] || '-',
            p['Total Revenue'] ? `$${parseFloat(p['Total Revenue']).toFixed(2)}` : '-'
        ]));
    }
    function DisplayLabelsPage() {
        console.log("DisplayLabelsPage() Called..");
        async function fetchIngredients(productId) {
            try {
                const response = await fetch(`/api/ingredients/${productId}`);
                if (!response.ok) {
                    throw new Error("Product not found");
                }
                return await response.json();
            }
            catch (error) {
                console.error("Error fetching ingredients:", error);
                return [];
            }
        }
        function getProductIdFromUrl() {
            return window.location.hash ? window.location.hash.substring(1) : null;
        }
        async function fetchNutritionalData(productId) {
            try {
                const response = await fetch(`http://localhost:5000/api/nutritional/${productId}`);
                if (!response.ok) {
                    throw new Error("Nutritional data not found");
                }
                return await response.json();
            }
            catch (error) {
                console.error("Error fetching nutritional data:", error);
                return null;
            }
        }
        window.generatePDFReport = async function (productId) {
            const nutritional = await fetchNutritionalData(productId);
            const ingredients = await fetchIngredients(productId);
            if (!nutritional) {
                alert("Error fetching nutritional details.");
                return;
            }
            const doc = new jsPDF();
            doc.setFontSize(30);
            doc.setFont("helvetica", "bold");
            doc.text(`${nutritional.product_name}`, 10, 10);
            doc.setFont("times new roman", "bold");
            doc.setFontSize(16);
            doc.text("Nutritional Value:", 10, 40);
            doc.setFont("times new roman", "normal");
            doc.setFontSize(12);
            doc.text(`Calories: ${nutritional.calories} kcal`, 10, 50);
            doc.text(`Carbohydrates: ${nutritional.carbs} g`, 10, 60);
            doc.text(`Sugar: ${nutritional.sugar} g`, 10, 70);
            doc.text(`Fat: ${nutritional.fat} g`, 10, 80);
            doc.text(`Protein: ${nutritional.protein} g`, 10, 90);
            doc.text(`Sodium: ${nutritional.sodium}`, 10, 100);
            doc.setFontSize(16);
            doc.setFont("times new roman", "bold");
            doc.text("Ingredients:", 10, 120);
            doc.setFont("times new roman", "normal");
            doc.setFontSize(12);
            ingredients.forEach((ingredient, index) => {
                doc.text(`${index + 1}. ${ingredient.ingredients_name}`, 10, 130 + index * 10);
            });
            doc.save(`Product_Report_${nutritional.productid}.pdf`);
        };
        const productid = getProductIdFromUrl();
        if (!productid) {
            alert("No Product Id provided");
        }
        else {
            fetchNutritionalData(productid).then((data) => {
                if (data) {
                    fetchIngredients(productid).then((ingredients) => {
                        displayNutritionalDetails(data, ingredients);
                    });
                }
            });
        }
        function displayNutritionalDetails(nutritional, ingredients) {
            const productHeader = document.getElementById("ProductHeader");
            const nutritionDiv = document.getElementById("NutritionDetail");
            const ingredientsDiv = document.getElementById("IngredientsDetail");
            const buttonContainer = document.getElementById("ReportButtonContainer");
            if (!productHeader || !nutritionDiv || !ingredientsDiv || !buttonContainer) {
                console.error("Required elements not found");
                return;
            }
            productHeader.innerHTML = `
        <h1 class="product-title">${nutritional.product_name}</h1>
    `;
            const nutritionalHTML = `
        <h2>Nutritional Information</h2>
        <p><strong>Calories:</strong> ${nutritional.calories} kcal</p>
        <p><strong>Carbohydrates:</strong> ${nutritional.carbs} g</p>
        <p><strong>Sugar:</strong> ${nutritional.sugar} g</p>
        <p><strong>Fat:</strong> ${nutritional.fat} g</p>
        <p><strong>Protein:</strong> ${nutritional.protein} g</p>
        <p><strong>Sodium:</strong> ${nutritional.sodium}</p>
    `;
            const ingredientsList = ingredients.map(ing => `<li>${ing.ingredients_name}</li>`).join("");
            const ingredientsHTML = `
        <h2>Ingredients</h2>
        <ul>${ingredientsList}</ul>
    `;
            const buttonHTML = `
        <button class="btn btn-secondary" onclick="generatePDFReport('${nutritional.productid}')">
            <i class="fa-solid fa-file-pdf"></i>Report
        </button>
    `;
            nutritionDiv.innerHTML = nutritionalHTML;
            ingredientsDiv.innerHTML = ingredientsHTML;
            buttonContainer.innerHTML = buttonHTML;
        }
    }
    function DisplayInventoryPage() {
        console.log("DisplayInventoryPage() Called..");
        let selectedIngredients = [];
        fetch("http://localhost:5000/api/ingredients")
            .then(response => response.json())
            .then((data) => {
            const list = document.getElementById("ingredients-list");
            const modal = document.getElementById("myModal");
            const closeBtn = document.querySelector(".close");
            const quantityInput = document.getElementById("quantity");
            const form = document.getElementById("quantity-form");
            let selectedIngredient = null;
            let selectedButton = null;
            if (!list || !modal || !closeBtn || !quantityInput || !form) {
                console.error("Some elements not found.");
                return;
            }
            const table = document.createElement("table");
            table.classList.add("ingredient-table");
            const tableHeader = document.createElement("thead");
            tableHeader.innerHTML = `
                <tr>
                    <th>Ingredient Name</th>
                    <th>Price</th>
                    <th>Action</th>
                </tr>
            `;
            table.appendChild(tableHeader);
            const tableBody = document.createElement("tbody");
            table.appendChild(tableBody);
            list?.appendChild(table);
            data.forEach((item) => {
                const row = document.createElement("tr");
                let price = parseFloat(item.ingredients_price);
                if (isNaN(price)) {
                    price = 0;
                }
                const ingredientNameCell = document.createElement("td");
                ingredientNameCell.textContent = item.ingredients_name;
                const ingredientPriceCell = document.createElement("td");
                ingredientPriceCell.textContent = `$${price.toFixed(2)}`;
                const actionCell = document.createElement("td");
                const addButton = document.createElement("button");
                addButton.textContent = "Add";
                addButton.classList.add("add-button");
                addButton.addEventListener("click", () => {
                    modal.style.display = "block";
                    selectedIngredient = item;
                    selectedButton = addButton;
                });
                actionCell.appendChild(addButton);
                row.appendChild(ingredientNameCell);
                row.appendChild(ingredientPriceCell);
                row.appendChild(actionCell);
                tableBody.appendChild(row);
                closeBtn.addEventListener("click", () => {
                    modal.style.display = "none";
                });
                form.addEventListener("submit", (event) => {
                    event.preventDefault();
                    const quantity = parseInt(quantityInput.value);
                    if (quantity && selectedIngredient && selectedButton) {
                        console.log(`Adding Ingredient: ${selectedIngredient.ingredients_name}, Quantity: ${quantity}`);
                        selectedIngredients.push({
                            name: selectedIngredient.ingredients_name,
                            quantity: quantity,
                            price: selectedIngredient.ingredients_price * quantity,
                        });
                        if (selectedButton) {
                            selectedButton.textContent = "Added";
                        }
                        modal.style.display = "none";
                        form.reset();
                        updateCheckoutTable();
                    }
                });
            });
        })
            .catch(error => console.error("Error fetching ingredients:", error));
        function updateCheckoutTable() {
            const checkoutBody = document.getElementById("checkout-body");
            if (!checkoutBody)
                return;
            checkoutBody.innerHTML = "";
            selectedIngredients.forEach(ingredient => {
                const row = document.createElement("tr");
                const nameCell = document.createElement("td");
                nameCell.textContent = ingredient.name;
                const priceCell = document.createElement("td");
                priceCell.textContent = `$${(ingredient.price / ingredient.quantity).toFixed(2)}`;
                const quantityCell = document.createElement("td");
                quantityCell.textContent = `${ingredient.quantity}`;
                const totalCell = document.createElement("td");
                totalCell.textContent = `$${(ingredient.price).toFixed(2)}`;
                row.appendChild(nameCell);
                row.appendChild(quantityCell);
                row.appendChild(priceCell);
                row.appendChild(totalCell);
                checkoutBody.appendChild(row);
            });
        }
        const checkoutButton = document.getElementById("checkout-btn");
        if (checkoutButton) {
            checkoutButton.addEventListener("click", async () => {
                updateCheckoutTable();
                if (selectedIngredients.length > 0) {
                    console.log("Proceeding to checkout...");
                    try {
                        const orderPromises = selectedIngredients.map(ingredient => {
                            return fetch("http://localhost:5000/api/ingredients_orders", {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json",
                                },
                                body: JSON.stringify({
                                    ingredient_name: ingredient.name,
                                    price: ingredient.price,
                                    quantity: ingredient.quantity,
                                }),
                            }).then(response => response.json());
                        });
                        const orderResults = await Promise.all(orderPromises);
                        const firstOrderId = orderResults[0]?.id;
                        if (firstOrderId) {
                            console.log("Orders successfully saved:", orderResults);
                            alert("Order placed successfully!");
                            window.location.href = `/checkout#${firstOrderId}`;
                        }
                        else {
                            throw new Error("No order ID returned from server");
                        }
                    }
                    catch (error) {
                        console.error("Error saving order:", error);
                        alert("There was an error while placing the order.");
                    }
                }
                else {
                    console.log("No items selected.");
                    alert("No items in the cart!");
                }
            });
        }
    }
    function DisplayEmployeesPage() {
        console.log("DisplayEmployeesPage() Called..");
        async function fetchEmployees() {
            try {
                const response = await fetch('/api/employees');
                const data = await response.json();
                const tableBody = document.querySelector('#employeeTable tbody');
                const payTableBody = document.querySelector('#payTable tbody');
                if (!tableBody || !payTableBody)
                    return;
                tableBody.innerHTML = '';
                payTableBody.innerHTML = '';
                data.forEach(employee => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                <td>${employee.employee_id}</td>
                <td>${employee.emp_name}</td>
                <td>${employee.emp_type}</td>
                <td>${employee.sin_num}</td>
                <td><button class="delete-btn" data-id="${employee.employee_id}">Delete</button></td>`;
                    tableBody.appendChild(row);
                    const biweeklyPay = (employee.emp_hours * employee.emp_pay).toFixed(2);
                    const payRow = document.createElement('tr');
                    payRow.innerHTML = `
                <td>${employee.employee_id}</td>
                <td>${employee.emp_name}</td>
                <td>${employee.emp_hours}</td>
                <td>${employee.emp_pay}</td>
                <td>$${biweeklyPay}</td>`;
                    payTableBody.appendChild(payRow);
                });
                document.querySelectorAll('.delete-btn').forEach(button => {
                    button.addEventListener('click', () => deleteEmployee(button.dataset.id));
                });
            }
            catch (error) {
                console.error('Error fetching employee data:', error);
            }
        }
        document.getElementById('addEmployeeForm')?.addEventListener('submit', async function (e) {
            e.preventDefault();
            const empName = document.getElementById('emp_name').value;
            const empType = document.getElementById('emp_type').value;
            const empHours = parseFloat(document.getElementById('emp_hours').value);
            const empPay = parseFloat(document.getElementById('emp_pay').value);
            const sinNum = document.getElementById('sin_num').value;
            const newEmployee = { emp_name: empName, emp_type: empType, emp_hours: empHours, emp_pay: empPay, sin_num: sinNum };
            try {
                await fetch('/api/employees', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newEmployee),
                });
                document.getElementById('addEmployeeForm').reset();
                fetchEmployees();
            }
            catch (error) {
                console.error('Error adding employee:', error);
            }
        });
        document.getElementById('updateHoursForm')?.addEventListener('submit', async function (e) {
            e.preventDefault();
            const employeeId = document.getElementById('employee_id').value;
            const newHours = parseFloat(document.getElementById('new_hours').value);
            try {
                const response = await fetch(`/api/employees/${employeeId}/hours`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ emp_hours: newHours }),
                });
                const data = await response.json();
                alert(data.message);
                document.getElementById('updateHoursForm').reset();
                fetchEmployees();
            }
            catch (error) {
                console.error('Error updating employee hours:', error);
            }
        });
        async function deleteEmployee(employeeId) {
            try {
                const response = await fetch(`/api/employees/${employeeId}`, { method: 'DELETE' });
                const data = await response.json();
                alert(data.message);
                fetchEmployees();
            }
            catch (error) {
                console.error('Error deleting employee:', error);
            }
        }
        document.getElementById('clearFormBtn')?.addEventListener('click', () => {
            document.getElementById('addEmployeeForm').reset();
        });
        document.getElementById('clearUpdateFormBtn')?.addEventListener('click', () => {
            document.getElementById('updateHoursForm').reset();
        });
        fetchEmployees();
    }
    function DisplayOrderConfirmation() {
        console.log("DisplayOrderConfirmation() Called..");
        const orderId = window.location.hash.substring(1);
        const orderOutput = document.querySelector("#order-output");
        if (!orderOutput) {
            console.error("Order output element not found");
            return;
        }
        if (!orderId) {
            orderOutput.innerHTML = `<div class="alert alert-danger">Invalid order</div>`;
            return;
        }
        fetch(`http://localhost:5000/api/orders/${orderId}`)
            .then(response => {
            if (!response.ok) {
                throw new Error("Failed to fetch order details");
            }
            return response.json();
        })
            .then(data => {
            orderOutput.innerHTML = `
                <h2>Order Confirmation</h2>
                    <div id = "Confirmation">
                        Thank you! Your order #${orderId} has been placed. <i class="fa-solid fa-check-double"></i>
                    </div>
                    <div id = "Summary">
                        <p>Order Number: ${orderId}</p>
                        <p>${data.product_name}</p>
                        <p>Quantity: ${data.product_qty}</p>
                <p>Total: $${parseFloat(data.total_amount).toFixed(2)}</p>
                </div>
                <br>
                <a href="/menu" class="btn btn-primary">Continue Shopping</a>
            `;
        })
            .catch(error => {
            console.error("Error fetching order:", error);
            orderOutput.innerHTML = `<div class="alert alert-danger">Error loading order details</div>`;
        });
    }
    function LoadContent() {
        let page_name = router.ActiveLink;
        let callback = ActiveLinkCallback();
        $.get(`./views/content/${page_name}.html`, function (html_data) {
            $("main").html(html_data);
            callback();
        });
    }
    function AuthGuard() {
        let protected_routes = ["dashboard"];
        if (protected_routes.indexOf(router.ActiveLink) > -1) {
            if (!sessionStorage.getItem("user")) {
                location.href = "/login";
            }
        }
    }
    function ActiveLinkCallback() {
        switch (router.ActiveLink) {
            case "login": return DisplayLoginPage;
            case "404": return Display404Page;
            case "home": return DisplayHomePage;
            case "about": return DisplayAboutPage;
            case "menu": return DisplayMenuPage;
            case "shop": return DisplayShopPage;
            case "dashboard": return DisplayDashboardPage;
            case "sales": return DisplaySalesPage;
            case "labels": return DisplayLabelsPage;
            case "inventory": return DisplayInventoryPage;
            case "employees": return DisplayEmployeesPage;
            case "checkout": return DisplayCheckoutPage;
            case "order-confirmation": return DisplayOrderConfirmation;
            default:
                console.error("ERROR: Callback doesn't exist for ActiveLink - " + router.ActiveLink);
                return function () { };
        }
    }
    function Start() {
        console.log("App Started");
        let html_data = "";
        Loadheader(html_data);
        AuthGuard();
        LoadContent();
    }
    window.addEventListener("load", Start);
})();
//# sourceMappingURL=app.js.map