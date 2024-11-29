# afterSchoolBackend
Backend stuff for after school project

Got 4 middlewares in this

1.	CORS Middleware:
	•   Allows requests from https://hammaddii.github.io to access my render server and handles the permissions for different types of requests.

2.	Express JSON Middleware:
	•	Lets the server understand and work with data sent in JSON format (like in the request body).

3.	MongoDB Connection Middleware:
	•	Connects the server to the MongoDB database. If it fails, it stops the app and shows an error.

4.	Order Data Validation Middleware:
	•	Checks if the data sent for an order (like name, phone number, and club details) is correct before processing it.