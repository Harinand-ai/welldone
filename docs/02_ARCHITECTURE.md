
Customer Management
The customer management module should remain extremely simple because the business operates on repeat customers who are generally identified by their phone numbers. The objective is to allow the cashier to either find an existing customer within seconds or register a new customer with minimal effort.
A customer's phone number should act as the primary lookup field. Whenever a phone number is entered during billing, the system should automatically search the database. If the customer already exists, their details should be displayed immediately, avoiding duplicate records whenever possible. If the phone number is not found, the cashier should be able to create a new customer directly from the billing screen without navigating elsewhere.
The customer profile should contain only information that provides business value. This includes the customer's name, phone number, optional address, optional email address, and a history of all previous orders. The email field is important because future notifications may be sent through email if a free notification solution is used.
The customer's order history should be accessible to the owner and cashier. This helps answer common questions such as previous services, past spending, repeat orders, and previous delivery dates.
Customer records should never be permanently deleted. If necessary, they should only be marked as inactive so historical billing data always remains consistent.
Service Management
Laundry services form the foundation of the billing process. The software should initially include predefined services supplied by the customer. These services will be added through seed data during installation so the application is immediately usable after deployment.
The owner should have complete control over these services. New services should be created without modifying the source code. Existing services should be editable, including service names, descriptions, pricing, and availability. Services that are no longer offered should simply be disabled instead of deleted to preserve historical order information.
The system should never assume a fixed list of laundry services. The database should be designed so additional services can be introduced in the future without requiring architectural changes.
Order Management
Order management is the core of the application and should be optimized for speed and simplicity.
When a customer arrives, the cashier should create a new order from a single screen. The customer is selected or created, required services are chosen, quantities are entered, discounts are applied if necessary, and the payment is recorded. Once saved, the system automatically generates a unique order number and prepares the receipt for printing.
Each order should have a clear lifecycle. Initially, the order enters the system with the status Received. As work progresses, the status can be updated to Pending if it is still being processed. Once the customer collects the clothes, the order is marked as Delivered.
The status system intentionally remains simple because the customer requested a lightweight workflow rather than a detailed production tracking system. Additional statuses can always be introduced in future versions if the business expands.
Every order should include timestamps for creation and completion. The system should also store the expected delivery date so staff can quickly answer customer enquiries.
Orders should never disappear after page refreshes, server restarts, or power failures. Data persistence is a mandatory requirement.
Billing and Payments
Billing should require as few interactions as possible. The cashier should be able to complete an order quickly, even during busy periods.
The application should automatically calculate totals based on selected services and quantities. Discounts may be applied whenever required, and the receipt must clearly display the original amount, discount amount, and final payable amount.
The application should support three payment methods: Cash, UPI, and Card. The selected payment method should be stored as part of the order history and included on the printed receipt.
Future payment methods should be easy to introduce without modifying the billing workflow.
Receipt Generation
Every completed billing operation should generate a professional receipt designed specifically for an 80 mm thermal printer.
The receipt should include the business name, customer information, order number, billing date and time, list of selected services, quantities, individual prices, subtotal, discount, final amount, payment method, and a QR code associated with the order.
The receipt should remain clean and easy to read while minimizing paper usage. Since thermal printers have limited width, careful attention should be paid to spacing and alignment.
The cashier should also be able to reprint previous receipts whenever required.
QR Code
Each order should have its own QR code generated automatically.
Initially, the QR code may simply represent the order identifier. Future versions can expand this functionality to support customer order tracking, order verification, or direct links to online order information.
The QR implementation should therefore remain flexible and extensible.
Dashboard
The dashboard should immediately communicate the current state of the business without requiring users to open multiple pages.
The owner should be able to see today's total orders, pending orders, delivered orders, total revenue, payment method breakdown, and recent activity.
The dashboard should also summarize expenses so that the owner can understand the day's approximate profit without performing manual calculations.
Visual elements such as charts and graphs should remain clean and minimal. They should improve readability rather than decorate the interface.
Expenses
The application should allow the owner to record business expenses. Examples include detergent purchases, electricity bills, rent, maintenance costs, salaries, transportation expenses, and miscellaneous operational costs.
Expenses should be categorized so reports can later group them meaningfully.
Daily, weekly, monthly, and custom date summaries should be supported.
The objective is not to become a full accounting system but to provide enough financial visibility for managing the business effectively.
Reports
The reporting system should remain practical and focused on real business needs.
The owner should be able to generate summaries showing total revenue, expenses, completed orders, pending orders, payment method distribution, and customer activity over selectable date ranges.
Reports should be exportable in common formats such as PDF or spreadsheet files where practical.
The reporting module should also remain modular so additional analytics can be introduced in future versions.
Notifications
The system should be capable of notifying customers when their laundry is ready for collection.
Because paid messaging services are intentionally avoided during Version 1, the preferred notification mechanism should use free solutions whenever legally and technically feasible. Email is an acceptable initial implementation because it does not introduce recurring operational costs.
The notification architecture should remain modular so SMS, WhatsApp, or push notifications can be integrated in future releases without redesigning the system.
Search
Searching must be extremely fast because it will be used continuously throughout the day.
Users should be able to search using customer phone numbers, customer names, order numbers, or receipt numbers. Search results should appear almost instantly and provide quick access to relevant orders and customer histories.