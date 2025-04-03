"use strict";
declare const jsPDF: any;

(function (){


    function CheckLogin() {
        if (sessionStorage.getItem("user")) {
            $("#login").html(`<a id="logout" class="nav-ver" href="/login"> Logout</a>`);
        //
        }
        else{
            $("header").hide();
        }
        $("#logout").on("click", function() {
            sessionStorage.clear();
            location.href = "/login";
        });
    }

    function Loadheader(html_data: string): void {

        if (router.ActiveLink === "login"|| router.ActiveLink === "register") {
            $("header").hide();
            return;
        }

        $.get("/views/components/header.html", function (html_data) {
            $("header").html(html_data);

            // Ensure router is defined and has ActiveLink
            if (typeof router !== "undefined" && router.ActiveLink) {
                document.title = capitalizeFirstLetter(router.ActiveLink);
                $(`li > a:contains(${document.title})`).addClass("active").attr("aria-current", "page");
            }

            AddNavigationEvents();
            CheckLogin();
        });
    }

    function capitalizeFirstLetter(str: string): string {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    function AddNavigationEvents(): void {
        let navlinks: JQuery<HTMLElement> = $("ul>li>a");
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
            let username: string = document.forms[0].username.value;
            let password: string = document.forms[0].password.value;

            // Fetch user data from the backend server
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

                    // Set redirection based on user role
                    let redirectURL = "";
                    if (user.role === "Admin") {
                        redirectURL = "/dashboard"; // Redirect Admin
                    }

                    sessionStorage.setItem("user", JSON.stringify(user));

                    messageArea.removeAttr("class").hide();
                    location.href = redirectURL; // Redirect user to the appropriate page
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


    function Display404Page(){
        console.log("Display404Page() Called..");
    }

    function DisplayHomePage(){
        console.log("DisplayHomePage() Called..");

    }

    function DisplayAboutPage(){
        console.log("DisplayAboutPage() Called..");
    }
    function DisplayCheckoutPage() {
        console.log("DisplayCheckoutPage() Called..");

        interface OrderItem {
            id: number;
            ingredient_name: string;
            order_date: string;
            price: number;
            quantity: number;
            ingredients_price: number;
        }

        function generateReceipt(order: OrderItem) {
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

        function safeParseNumber(value: any): number {
            const num = typeof value === "string" ? parseFloat(value) : Number(value);
            return isNaN(num) ? 0 : num;
        }

        function formatDate(isoDate: string | null): string {
            if (!isoDate) return "Invalid Date";
            try {
                const date = new Date(isoDate);
                return date.toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                });
            } catch (e) {
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
                .then((data: any) => {
                    console.log("Raw API Data:", data);

                    if (!data || typeof data !== "object") {
                        throw new Error("Invalid data received from API");
                    }

                    const orderData = Array.isArray(data) ? data[0] : data;

                    const order: OrderItem = {
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

                    if (orderNumberElement) orderNumberElement.textContent = `#${order.id}`;
                    if (orderDateElement) orderDateElement.textContent = order.order_date;
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
                    if (orderTotalElement) orderTotalElement.textContent = `$${(order.ingredients_price * order.quantity).toFixed(2)}`;

                    // Generate receipt automatically
                    const ReceiptBtn = document.getElementById("print-btn");
                    if (ReceiptBtn) {
                        ReceiptBtn.addEventListener("click", () => {
                            if (order) {
                                generateReceipt(order);
                            } else {
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


    function DisplayMenuPage(): void {
        console.log("DisplayMenuPage() Called..");
        interface Product {
            productid: string;
            product_name: string;
            category_id: number;
            image_url: string;
            sizes_and_prices: string;
        }


        // Fetch product data from the backend API
        fetch("http://localhost:5000/api/product")
            .then((response) => {
                if (!response.ok) {
                    throw new Error("Error fetching product data");
                }
                return response.json();
            })
            .then((data: Product[]) => {
                buildTable(data);
            })
            .catch((error: Error) => console.error("Error fetching product data:", error));

        function buildTable(data: Product[]): void {
            const piesTable = document.querySelector("#pies-output") as HTMLElement;
            const preservesTable = document.querySelector("#preserves-output") as HTMLElement;

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
                } else if (product.category_id === 2) {
                    preservesOutput += row;
                }
            }

            piesOutput += `</tbody></table>`;
            preservesOutput += `</tbody></table>`;

            piesTable.innerHTML = piesOutput;
            preservesTable.innerHTML = preservesOutput;
        }

        (window as any).productInfo = (productid: string): void => {
            window.location.href = `/labels#${productid}`;
        };
        (window as any).productShop = (productid: string): void => {
            window.location.href = `/shop#${productid}`;
        };

    }

    function DisplayShopPage(): void {
        console.log("DisplayShopPage() Called..");

        interface Product {
            productid: string;
            product_name: string;
            category_id: number;
            image_url: string;
            product_price: string;
            product_size: string;
            product_sizeid: string;
        }

        // Get product ID from URL hash (e.g., #1)
        const productId = window.location.hash.substring(1); // Removes the '#'

        if (!productId) {
            const piesTable = document.querySelector("#pies-output") as HTMLElement;
            piesTable.innerHTML = `<div class="alert alert-danger">Product ID not specified in URL</div>`;
            return;
        }

        // Fetch specific product data from the backend API
        fetch(`http://localhost:5000/api/product/${productId}`)
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`Error fetching product data: ${response.statusText}`);
                }
                return response.json();
            })
            .then((data: Product[]) => {
                if (!Array.isArray(data)) {
                    // If API returns a single object, wrap it in an array
                    buildTable([data]);
                } else {
                    buildTable(data);
                }
            })
            .catch((error: Error) => {
                console.error("Error fetching product data:", error);
                const piesTable = document.querySelector("#pies-output") as HTMLElement;
                piesTable.innerHTML = `<div class="alert alert-danger">Error loading product: ${error.message}</div>`;
            });

        function buildTable(data: Product[]): void {
            const piesTable = document.querySelector("#pies-output") as HTMLElement;

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


    (window as any).addToCart = async (productId: string, sizeId: string, price: string, quantity: string): Promise<void> => {
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

            // Redirect to order confirmation page
            window.location.href = `/order-confirmation#${result.orderid}`;

        } catch (error) {
            console.error('Error adding to cart:', error);
            alert('Error adding to cart. Please try again.');
        }
    };
    function DisplayDashboardPage() {
        console.log("DisplayDashboardPage() Called..");
    }
    function DisplaySalesPage() {
        console.log("DisplaySalesPage() Called..");

        function createTable(headers: string[], rows: any[][]) {
            const table = document.createElement('table');
            table.className = 'data-table';

            // Create header
            const thead = document.createElement('thead');
            const headerRow = document.createElement('tr');

            headers.forEach(headerText => {
                const th = document.createElement('th');
                th.textContent = headerText;
                headerRow.appendChild(th);
            });

            thead.appendChild(headerRow);
            table.appendChild(thead);

            // Create body
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

        function createDownloadButton(panelId: string, title: string, headers: string[], data: any[][]) {
            const button = document.createElement('button');
            button.className = 'download-btn';
            const icon = document.createElement('i');
            icon.className = 'fa-solid fa-file-pdf';
            icon.style.marginRight = '8px'; // Add some spacing between icon and text
            const text = document.createTextNode('Report');
            button.appendChild(icon);
            button.appendChild(text);
            button.onclick = () => {
                try {
                    // @ts-ignore - jsPDF is loaded from CDN
                    const { jsPDF } = window.jspdf;
                    const doc = new jsPDF();

                    // Add title
                    doc.setFontSize(18);
                    doc.text(title, 14, 15);

                    // Prepare table data
                    const tableData = data.map(row => [...row]);

                    // Add table
                    doc.setFontSize(10);
                    // @ts-ignore - autoTable is loaded from CDN
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

                    // Save the PDF
                    doc.save(`${title.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.pdf`);
                } catch (error) {
                    console.error('Error generating PDF:', error);
                    alert('Error generating PDF. Please try again.');
                }
            };
            return button;
        }

        // Rest of your code remains the same...
        async function fetchAndDisplay(panelId: string, endpoint: string, headers: string[], dataMapper: (data: any) => any[][]) {
            const panel = document.getElementById(panelId);
            if (!panel) return;

            try {
                const panelTitle = panel.querySelector('h2')?.textContent || '';
                panel.innerHTML = `<h2>${panelTitle}</h2>`;

                const response = await fetch(endpoint);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

                const data = await response.json();
                console.log('API Data:', data);

                const tableData = dataMapper(data);
                const table = createTable(headers, tableData);
                panel.appendChild(table);

                // Add download button
                const downloadBtn = createDownloadButton(panelId, panelTitle, headers, tableData);
                panel.appendChild(downloadBtn);

            } catch (error) {
                console.error(`Error loading ${panelId}:`, error);
                panel.innerHTML += `<p class="error">Error loading data</p>`;
            }
        }

        // Daily Sales
        fetchAndDisplay(
            'daily-sales',
            'http://localhost:5000/api/daily-sales',
            ['Date', 'Revenue', 'Orders', 'Items Sold'],
            (data) => data.map((d: any) => [
                new Date(d.Date).toLocaleDateString() || '-',
                d['Daily Revenue'] ? `$${parseFloat(d['Daily Revenue']).toFixed(2)}` : '-',
                d['Number of Orders'] || '-',
                d['Total Items Sold'] || '-'
            ])
        );

        // Monthly Sales
        fetchAndDisplay(
            'monthly-sales',
            'http://localhost:5000/api/monthly-sales',
            ['Month', 'Revenue', 'Orders', 'Items Sold'],
            (data) => data.map((m: any) => {
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
            })
        );

        // Top Products
        fetchAndDisplay(
            'top-products',
            'http://localhost:5000/api/best-selling',
            ['Rank', 'Product', 'Quantity Sold', 'Revenue'],
            (data) => data.map((p: any, index: number) => [
                (index + 1).toString(),
                p.product_name || '-',
                p['Total Quantity Sold'] || '-',
                p['Total Revenue'] ? `$${parseFloat(p['Total Revenue']).toFixed(2)}` : '-'
            ])
        );
    }

    function DisplayLabelsPage() {
        console.log("DisplayLabelsPage() Called..");

        async function fetchIngredients(productId: string): Promise<{ ingredients_name: string; product_name: string }[]> {
            try {
                const response = await fetch(`/api/ingredients/${productId}`);
                if (!response.ok) {
                    throw new Error("Product not found");
                }
                return await response.json();
            } catch (error) {
                console.error("Error fetching ingredients:", error);
                return [];
            }
        }

        interface Nutritional {
            nutritionalid: number;
            productid: number;
            calories: number;
            carbs: number;
            sugar: number;
            fat: number;
            protein: number;
            sodium: string;
            product_name: string;
        }

        function getProductIdFromUrl(): string | null {
            return window.location.hash ? window.location.hash.substring(1) : null;
        }

        async function fetchNutritionalData(productId: string): Promise<Nutritional | null> {
            try {
                const response = await fetch(`http://localhost:5000/api/nutritional/${productId}`);
                if (!response.ok) {
                    throw new Error("Nutritional data not found");
                }
                return await response.json();
            } catch (error) {
                console.error("Error fetching nutritional data:", error);
                return null;
            }
        }

        (window as any).generatePDFReport = async function(productId: string) {
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

            doc.setFont("times new roman","bold");

            doc.setFontSize(16);
            doc.text("Nutritional Value:", 10, 40);
            doc.setFont("times new roman","normal");
            doc.setFontSize(12);
            doc.text(`Calories: ${nutritional.calories} kcal`, 10, 50);
            doc.text(`Carbohydrates: ${nutritional.carbs} g`, 10, 60);
            doc.text(`Sugar: ${nutritional.sugar} g`, 10, 70);
            doc.text(`Fat: ${nutritional.fat} g`, 10, 80);
            doc.text(`Protein: ${nutritional.protein} g`, 10, 90);
            doc.text(`Sodium: ${nutritional.sodium}`, 10, 100);

            doc.setFontSize(16);
            doc.setFont("times new roman","bold");
            doc.text("Ingredients:", 10, 120);
            doc.setFont("times new roman","normal");
            doc.setFontSize(12);
            ingredients.forEach((ingredient, index) => {
                doc.text(`${index + 1}. ${ingredient.ingredients_name}`, 10, 130 + index * 10);
            });

            doc.save(`Product_Report_${nutritional.productid}.pdf`);
        };

        const productid = getProductIdFromUrl();
        if (!productid) {
            alert("No Product Id provided");
        } else {
            fetchNutritionalData(productid).then((data) => {
                if (data) {
                    fetchIngredients(productid).then((ingredients) => {
                        displayNutritionalDetails(data, ingredients);
                    });
                }
            });
        }

        function displayNutritionalDetails(
            nutritional: Nutritional,
            ingredients: { ingredients_name: string }[]
        ): void {
            // Get all elements with null checks
            const productHeader = document.getElementById("ProductHeader");
            const nutritionDiv = document.getElementById("NutritionDetail");
            const ingredientsDiv = document.getElementById("IngredientsDetail");
            const buttonContainer = document.getElementById("ReportButtonContainer");

            if (!productHeader || !nutritionDiv || !ingredientsDiv || !buttonContainer) {
                console.error("Required elements not found");
                return;
            }

            // Product Header
            productHeader.innerHTML = `
        <h1 class="product-title">${nutritional.product_name}</h1>
    `;

            // Nutritional Information (without product name)
            const nutritionalHTML = `
        <h2>Nutritional Information</h2>
        <p><strong>Calories:</strong> ${nutritional.calories} kcal</p>
        <p><strong>Carbohydrates:</strong> ${nutritional.carbs} g</p>
        <p><strong>Sugar:</strong> ${nutritional.sugar} g</p>
        <p><strong>Fat:</strong> ${nutritional.fat} g</p>
        <p><strong>Protein:</strong> ${nutritional.protein} g</p>
        <p><strong>Sodium:</strong> ${nutritional.sodium}</p>
    `;

            // Ingredients Information
            const ingredientsList = ingredients.map(ing => `<li>${ing.ingredients_name}</li>`).join("");
            const ingredientsHTML = `
        <h2>Ingredients</h2>
        <ul>${ingredientsList}</ul>
    `;

            // Button HTML
            const buttonHTML = `
        <button class="btn btn-secondary" onclick="generatePDFReport('${nutritional.productid}')">
            <i class="fa-solid fa-file-pdf"></i>Report
        </button>
    `;

            // Assign HTML content
            nutritionDiv.innerHTML = nutritionalHTML;
            ingredientsDiv.innerHTML = ingredientsHTML;
            buttonContainer.innerHTML = buttonHTML;
        }

    }

    function DisplayInventoryPage() {
        console.log("DisplayInventoryPage() Called..");

        interface Ingredient {
            ingredients_name: string;
            ingredients_price: any;  // Allow it to be any type to handle potential issues
        }

        // Array to hold selected ingredients for checkout
        let selectedIngredients: Array<{ name: string, price: number, quantity: number }> = [];

        // Fetch ingredients data from the API
        fetch("http://localhost:5000/api/ingredients")
            .then(response => response.json())
            .then((data: Ingredient[]) => {
                const list = document.getElementById("ingredients-list");
                const modal = document.getElementById("myModal") as HTMLElement;
                const closeBtn = document.querySelector(".close") as HTMLElement;
                const quantityInput = document.getElementById("quantity") as HTMLInputElement;
                const form = document.getElementById("quantity-form") as HTMLFormElement;

                let selectedIngredient: Ingredient | null = null;
                let selectedButton: HTMLButtonElement | null = null;

                if (!list || !modal || !closeBtn || !quantityInput || !form) {
                    console.error("Some elements not found.");
                    return;
                }

                // Create the table to display the ingredients
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

                // Loop through the ingredients data and display them in the table
                data.forEach((item: Ingredient) => {
                    const row = document.createElement("tr");

                    let price = parseFloat(item.ingredients_price);  // Convert price to number
                    if (isNaN(price)) {
                        price = 0; // If price is not a valid number, set it to 0
                    }

                    const ingredientNameCell = document.createElement("td");
                    ingredientNameCell.textContent = item.ingredients_name;

                    const ingredientPriceCell = document.createElement("td");
                    ingredientPriceCell.textContent = `$${price.toFixed(2)}`;

                    const actionCell = document.createElement("td");
                    const addButton = document.createElement("button");
                    addButton.textContent = "Add";
                    addButton.classList.add("add-button");

                    // When "Add" button is clicked, show the modal and select the ingredient
                    addButton.addEventListener("click", () => {
                        modal.style.display = "block";
                        selectedIngredient = item;
                        selectedButton = addButton;  // Store reference to the button
                    });

                    actionCell.appendChild(addButton);
                    row.appendChild(ingredientNameCell);
                    row.appendChild(ingredientPriceCell);
                    row.appendChild(actionCell);
                    tableBody.appendChild(row);

                    // Close button in modal
                    closeBtn.addEventListener("click", () => {
                        modal.style.display = "none";
                    });

                    // When the form is submitted
                    form.addEventListener("submit", (event) => {
                        event.preventDefault();

                        const quantity = parseInt(quantityInput.value);
                        if (quantity && selectedIngredient && selectedButton) {
                            console.log(`Adding Ingredient: ${selectedIngredient.ingredients_name}, Quantity: ${quantity}`);

                            // Add the selected ingredient to the selectedIngredients array
                            selectedIngredients.push({
                                name: selectedIngredient.ingredients_name,
                                quantity: quantity,
                                price: selectedIngredient.ingredients_price * quantity,
                            });

                            // Update the button text to "Added" after adding
                            if (selectedButton) {
                                selectedButton.textContent = "Added";
                            }

                            // Close modal and reset form
                            modal.style.display = "none";
                            form.reset();

                            // Update the checkout table
                            updateCheckoutTable();
                        }
                    });
                });
            })
            .catch(error => console.error("Error fetching ingredients:", error));
        function updateCheckoutTable() {
            const checkoutBody = document.getElementById("checkout-body") as HTMLTableSectionElement;
            if (!checkoutBody) return;
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
                // Ensure the table is updated before proceeding
                updateCheckoutTable();

                if (selectedIngredients.length > 0) {
                    console.log("Proceeding to checkout...");

                    try {
                        // Create an array to store all the order promises
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

                        // Wait for all orders to complete
                        const orderResults = await Promise.all(orderPromises);

                        // Assuming the backend returns the created order with an ID
                        // Get the first order ID (or handle multiple IDs as needed)
                        const firstOrderId = orderResults[0]?.id;

                        if (firstOrderId) {
                            console.log("Orders successfully saved:", orderResults);
                            alert("Order placed successfully!");

                            // Redirect to checkout page with the order ID
                            window.location.href = `/checkout#${firstOrderId}`;
                        } else {
                            throw new Error("No order ID returned from server");
                        }
                    } catch (error) {
                        console.error("Error saving order:", error);
                        alert("There was an error while placing the order.");
                    }
                } else {
                    console.log("No items selected.");
                    alert("No items in the cart!");
                }
            });
        }
    }

    function DisplayEmployeesPage(){
        console.log("DisplayEmployeesPage() Called..");

        interface Employee {
            employee_id: number;
            emp_name: string;
            emp_type: string;
            emp_hours: number;
            emp_pay: number;
            sin_num: string;
        }

        async function fetchEmployees(): Promise<void> {
            try {
                const response = await fetch('/api/employees');
                const data: Employee[] = await response.json();

                const tableBody = document.querySelector<HTMLTableSectionElement>('#employeeTable tbody');
                const payTableBody = document.querySelector<HTMLTableSectionElement>('#payTable tbody');

                if (!tableBody || !payTableBody) return;

                tableBody.innerHTML = '';
                payTableBody.innerHTML = '';

                data.forEach(employee => {
                    // Main Employee Table
                    const row = document.createElement('tr');
                    row.innerHTML = `
                <td>${employee.employee_id}</td>
                <td>${employee.emp_name}</td>
                <td>${employee.emp_type}</td>
                <td>${employee.sin_num}</td>
                <td><button class="delete-btn" data-id="${employee.employee_id}">Delete</button></td>`;
                    tableBody.appendChild(row);

                    // Biweekly Pay Table
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

                document.querySelectorAll<HTMLButtonElement>('.delete-btn').forEach(button => {
                    button.addEventListener('click', () => deleteEmployee(button.dataset.id!));
                });
            } catch (error) {
                console.error('Error fetching employee data:', error);
            }
        }

        document.getElementById('addEmployeeForm')?.addEventListener('submit', async function (e) {
            e.preventDefault();

            const empName = (document.getElementById('emp_name') as HTMLInputElement).value;
            const empType = (document.getElementById('emp_type') as HTMLInputElement).value;
            const empHours = parseFloat((document.getElementById('emp_hours') as HTMLInputElement).value);
            const empPay = parseFloat((document.getElementById('emp_pay') as HTMLInputElement).value);
            const sinNum = (document.getElementById('sin_num') as HTMLInputElement).value;

            const newEmployee: Partial<Employee> = { emp_name: empName, emp_type: empType, emp_hours: empHours, emp_pay: empPay, sin_num: sinNum };

            try {
                await fetch('/api/employees', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newEmployee),
                });
                (document.getElementById('addEmployeeForm') as HTMLFormElement).reset();
                fetchEmployees();
            } catch (error) {
                console.error('Error adding employee:', error);
            }
        });

        document.getElementById('updateHoursForm')?.addEventListener('submit', async function (e) {
            e.preventDefault();

            const employeeId = (document.getElementById('employee_id') as HTMLInputElement).value;
            const newHours = parseFloat((document.getElementById('new_hours') as HTMLInputElement).value);

            try {
                const response = await fetch(`/api/employees/${employeeId}/hours`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ emp_hours: newHours }),
                });
                const data = await response.json();
                alert(data.message);
                (document.getElementById('updateHoursForm') as HTMLFormElement).reset();
                fetchEmployees();
            } catch (error) {
                console.error('Error updating employee hours:', error);
            }
        });

        async function deleteEmployee(employeeId: string): Promise<void> {
            try {
                const response = await fetch(`/api/employees/${employeeId}`, { method: 'DELETE' });
                const data = await response.json();
                alert(data.message);
                fetchEmployees();
            } catch (error) {
                console.error('Error deleting employee:', error);
            }
        }

        document.getElementById('clearFormBtn')?.addEventListener('click', () => {
            (document.getElementById('addEmployeeForm') as HTMLFormElement).reset();
        });

        document.getElementById('clearUpdateFormBtn')?.addEventListener('click', () => {
            (document.getElementById('updateHoursForm') as HTMLFormElement).reset();
        });

        fetchEmployees();

    }

    function DisplayOrderConfirmation(): void {
        console.log("DisplayOrderConfirmation() Called..");

        // Get order ID from URL hash
        const orderId = window.location.hash.substring(1);
        const orderOutput = document.querySelector("#order-output");

        // Check if element exists
        if (!orderOutput) {
            console.error("Order output element not found");
            return;
        }

        if (!orderId) {
            orderOutput.innerHTML = `<div class="alert alert-danger">Invalid order</div>`;
            return;
        }

        // Fetch order details (optional)
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

    function LoadContent(): void {
        let page_name: string = router.ActiveLink;
        let callback: () => void = ActiveLinkCallback();
        $.get(`./views/content/${page_name}.html`, function(html_data: string): void {
            $("main").html(html_data);
            callback();
        });
    }
    function AuthGuard(){
        let protected_routes = ["dashboard"];

        if(protected_routes.indexOf(router.ActiveLink) > -1){
            if(!sessionStorage.getItem("user")) {
                location.href = "/login";
            }
        }
    }

    function ActiveLinkCallback(): () => void {
        switch(router.ActiveLink) {
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
                return function() {};
        }
    }


    function Start(): void {
        console.log("App Started");
        let html_data: string = "";
        Loadheader(html_data);
        AuthGuard();
        LoadContent();
    }


    window.addEventListener("load",Start);

})()