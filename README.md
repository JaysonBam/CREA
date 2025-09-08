Sakai is an application template for Vue based on the [create-vue](https://github.com/vuejs/create-vue), the recommended way to start a Vite-powered Vue projects.

Visit the [documentation](https://sakai.primevue.org/documentation) to get started.

A testCrud is created to show how update, edit and delete is done.
We use an MVC structure. 

A migration is a file that you create that creates the table in the database. We want this because it makes it easy to recreate the database. If we didn't have this, every time we wanted to make a database change, we wouldve done it directly in the database, which is not ideal, because each person in the group wouldve had to change it in each of their databases. So please don't change anything directly from the database, use a migration. Migrations are stored at /backend/migrations. 

A model is linked to a table in a database. It represents that table and makes it easy to extract from and change information for that model. So for each table you want to create in the database, you have to add a model. Here we should specify which fields the table has and also what relationships it has with other models ( belongs to, has many etc...). These are saved under /backend/models. 

Seeders are basically commands we run to populate the database with dummy content. These are saved in /backend/seeders.

Here is the typical process you have to follow when doing CRUD(create, read, update, delete) operations.

Firstly, you have to define API routes for the CRUD operations. API routes is how the frontend communicates with the backend. So for example if we want to extract all the Report Issues in the database and display it in the frontend, we have to send a fetch request to the backend to extract this data. This is what the API route is for. I added a TestCrudRoutes example to show you how it is done. Also note that the TestCrudRoutes are actually appended with a /api/test-crud that is specified in the index.js file in this line: app.use("/api/test-crud", testCrudRoutes); The testCrudRoutes in this case points to the file TestCrudRoutes. Inside this file, is a collection of related routes all of which will have the api/test-crud prepended, since this is what was specified in its parent component(index.js)

So if we use this route as an example: router.get("/:id", controller.getOne); The actual route to the backend will be /api/test-crud/:id. The id in this case is just a parameter that is passed in the route to indicate the unique autonumbered id corresponding to the record in the database. This is how we know which record to update, edit or delete. We look through the table for a record with that id and then do CRUD operations with it. This can be autonumbered, which is fine, but usually for security purposes we make it a long random string of characters. So what does this mean: router.get("/:id", controller.getOne); It means if it receives the route /api/test-crud/:id, run the function getOne that is defined in the controller(in this case the TestCrudController as specified in the TestCrudRoutes)

Controllers are basically where we write the backend functionality to edit, update and delete records. 

Then lastly we have the frontend part. Here we have something called a router. A router is where you specify a route and tell it which page to load if it gets that route. For example, if i have something like this: { path: "/login", name: "login", component: Login, meta: { guestOnly: true } },
It means that if I go to /login, the component Login should be rendered. All of this is done in the index.js file under frontend/src/router. 

Also check AppMenu, this is where the sidebar is rendered. 







