# Files Manager

A simple file management API built with Express, MongoDB, Redis, Bull, and Node.js and can handle authentication, pagination and background processing.

**Features of the platform include:**

* User authentication via a token.
* List all files.
* Upload a new file.
* Change permission of a file.
* View a file.
* Generate thumbnails for images.

- - - -

## Requirements

* Redis
* MongoDB
* Node.js

## Environment Variables

| Name | Required | Description |
|:-|:-|:-|
| PORT | No (Default: `5000`)| The port the server should listen at. |
| DB_HOST | No (Default: `localhost`)| The database host. |
| DB_PORT | No (Default: `27017`)| The database port. |
| DB_DATABASE | No (Default: `files_manager`)| The database name. |
| FOLDER_PATH | No (Default: `/tmp/files_manager` (Linux, Mac OS X) & `%TEMP%/files_manager` (Windows)) | The local folder where files are saved. |

## Installation

* Clone this repository: `git clone "https://github.com/victornnamdii/alx-files-manager"`.
* Access the directory: `cd alx-files-manager`.
* Install the packages: `npm install`.

## Starting the server

* Start the Redis and MongoDB services.
* Run (with default values for environment variables):

```bash
npm run start-server
```

> To run with different values, add your variables with the format `Name=Value` on the same line with the above command.

* Run the command:

```bash
npm run start-worker
```

- - - -

## Documentation

### `GET /status`

Returns the status of Redis and MongoDB:

```bash
curl 0.0.0.0:5000/status ; echo ""

{"redis":true,"db":true}
```

`redis` shows status of the redis server.
`db` shows the status of the MongoDB client.
`true` shows it is connected and `false` means it is not connected.
**Status code: 200**

### `GET /stats`

Return the number of users and files in the Database:

```bash
curl 0.0.0.0:5000/stats ; echo ""

{"users":4,"files":30}
```

`users` shows the number of users in the database.
`files` shows the total number of files in the database.
**Status code: 200**

### `POST /users`

Creates a new user in the Database.

An unused `email` and a `password` must be specified along with the POST request.

After a successful request, the endpoint returns the user's `email` and `id` (auto generated by MongoDB): **Status code: 201**

```bash
curl 0.0.0.0:5000/users -XPOST -H "Content-Type: application/json" -d '{ "email": "bob@dylan.com", "password": "toto1234!" }' ; echo ""

{"id":"5f1e7d35c7ba06511e683b21","email":"bob@dylan.com"}
```

If there was an error was encountered during the user creation, the endpoint returns the error message:

```bash
curl 0.0.0.0:5000/users -XPOST -H "Content-Type: application/json" -d '{ "email": "bob@dylan.com", "password": "toto1234!" }' ; echo ""

{"error":"Already exist"}
```

#### Error Messages

`Already exist`: Email already exists.
`Missing email`: Email wasn't specified along with request.
`Missing password`: Password wasn't specified along with request.
**Status code: 400**

### `GET /connect`

Signs in a user and returns an authentication token:
**Status code: 200**

```bash
curl 0.0.0.0:5000/connect -H "Authorization: Basic Ym9iQGR5bGFuLmNvbTp0b3RvMTIzNCE=" ; echo ""

{"token":"031bffac-3edc-4e51-aaae-1c121317da8a"}
```

> This token is active for only 24 hoours.

The user's `email` and `password` should be passed in a header `Authorization` with the format `Basic [Base64 of email:password]`. Example: `Basic Ym9iQGR5bGFuLmNvbTp0b3RvMTIzNCE=` where `Ym9iQGR5bGFuLmNvbTp0b3RvMTIzNCE=` is the base64 of `bob@dylan.com:toto1234!`

#### Error Messages

`Unauthorized`: The user details were incorrect
**Status code: 401**

### `GET /disconnect`

Logs out the users and deactivates their authentication token.
**Status code: 204**

The users's authentication token should be passed inside the header `X-Token` along with the request.

#### Error Messages

`Unauthorized`: The authentication token was invalid.
**Status code: 401**

### `GET /users/me`

Returns the `email` and `id` of the logged in user:
**Status code: 200**

```bash
curl 0.0.0.0:5000/users/me -H "X-Token: 031bffac-3edc-4e51-aaae-1c121317da8a" ; echo ""

{"id":"5f1e7cda04a394508232559d","email":"bob@dylan.com"}
```

The users's authentication token should be passed inside the header `X-Token` along with the request.

#### Error Messages

`Unauthorized`: The authentication token was invalid
**Status code: 401**

### `POST /files`

Creates a new file in the database and local disk and returns information about the file.
**Status code: 201**

The users's authentication token should be passed inside the header `X-Token` along with the request.

#### Parameters to pass

`name`: File name
`type`: File type (either `folder`, `file`, or `image`)
`parentId` (optional): ID of the parent (default: 0 -> root)
`isPublic` (optional): as boolean to define if the file is public or not (default: false)
`data` (only for type=file|image): as Base64 of the file content

All files will be stored locally in the path specified in the environment variable `FOLDER_PATH` and files stored locally are stored using a UUID for the filename.

If file type is `image`, it also creates image thumbnails of the image locally with sizes 500, 250 and 100.

```bash
curl -XPOST 0.0.0.0:5000/files -H "X-Token: f21fb953-16f9-46ed-8d9c-84c6450ec80f" -H "Content-Type: application/json" -d '{ "name": "myText.txt", "type": "file", "data": "SGVsbG8gV2Vic3RhY2shCg==" }' ; echo ""

{"id":"5f1e879ec7ba06511e683b22","userId":"5f1e7cda04a394508232559d","name":"myText.txt","type":"file","isPublic":false,"parentId":0}

ls /tmp/files_manager/

2a1f4fc3-687b-491a-a3d2-5808a02942c9

cat /tmp/files_manager/2a1f4fc3-687b-491a-a3d2-5808a02942c9

Hello Webstack!
```

#### Error Messages

`Unauthorized`: The authentication token was invalid
**Status code: 401**

`Missing name`: `name` was not specified along with request.
`Missing type`: `type` was not specified along with request.
`Missing data`: `data` was not specified along with request and `type` is not `folder`
`Parent not found`: `parentId` specified is invalid
`Parent is not a folder`: `parentId` specified is not for a `folder` type.
**Status code: 400**

### `GET /files/:id`

Returns the file document linked to the id.
**Status code: 200**

The users's authentication token should be passed inside the header `X-Token` along with the request.

```bash
curl -XGET 0.0.0.0:5000/files/5f1e8896c7ba06511e683b25 -H "X-Token: f21fb953-16f9-46ed-8d9c-84c6450ec80f" ; echo ""

{"id":"5f1e8896c7ba06511e683b25","userId":"5f1e7cda04a394508232559d","name":"image.png","type":"image","isPublic":true,"parentId":"5f1e881cc7ba06511e683b23"}
```

#### Error Messages

`Unauthorized`: The authentication token was invalid.
**Status code: 401**

`Not found`: No file linked to the user and the ID passed.
**Status code: 404**

### `GET /files`

Retrieves all user files with a limit of 20 files per page.

The users's authentication token should be passed inside the header `X-Token` along with the request.

#### Query Parameters

The query parameters are optional, but can help retrieve more specific results.

* `parentId`: Parent id of files to retrieve. Default is `0` (the root)
* `page`: The page which results should start from. `0` is the first page and also the default if `page` is not specified.
**Status code: 200**

```bash
curl -XGET 0.0.0.0:5000/files -H "X-Token: f21fb953-16f9-46ed-8d9c-84c6450ec80f" ; echo ""

[{"id":"5f1e879ec7ba06511e683b22","userId":"5f1e7cda04a394508232559d","name":"myText.txt","type":"file","isPublic":false,"parentId":0},{"id":"5f1e881cc7ba06511e683b23","userId":"5f1e7cda04a394508232559d","name":"images","type":"folder","isPublic":false,"parentId":0},{"id":"5f1e8896c7ba06511e683b25","userId":"5f1e7cda04a394508232559d","name":"image.png","type":"image","isPublic":true,"parentId":"5f1e881cc7ba06511e683b23"}]

curl -XGET 0.0.0.0:5000/files?parentId=5f1e881cc7ba06511e683b23 -H "X-Token: f21fb953-16f9-46ed-8d9c-84c6450ec80f" ; echo ""

[{"id":"5f1e8896c7ba06511e683b25","userId":"5f1e7cda04a394508232559d","name":"image.png","type":"image","isPublic":true,"parentId":"5f1e881cc7ba06511e683b23"}]
```

#### Error Messages

`Unauthorized`: The authentication token was invalid.
**Status code: 401**

### `PUT /files/:id/publish`

Sets `isPublic` to `true` on the file document based on the ID. This allows users to access the file without an authentication token.

The users's authentication token should be passed inside the header `X-Token` along with the request.
**Status code: 200**

```bash
curl -XGET 0.0.0.0:5000/files/5f1e8896c7ba06511e683b25 -H "X-Token: f21fb953-16f9-46ed-8d9c-84c6450ec80f" ; echo ""

{"id":"5f1e8896c7ba06511e683b25","userId":"5f1e7cda04a394508232559d","name":"image.png","type":"image","isPublic":false,"parentId":"5f1e881cc7ba06511e683b23"}

curl -XPUT 0.0.0.0:5000/files/5f1e8896c7ba06511e683b25/publish -H "X-Token: f21fb953-16f9-46ed-8d9c-84c6450ec80f" ; echo ""

{"id":"5f1e8896c7ba06511e683b25","userId":"5f1e7cda04a394508232559d","name":"image.png","type":"image","isPublic":true,"parentId":"5f1e881cc7ba06511e683b23"}
```

#### Error Messages

`Unauthorized`: The authentication token was invalid.
**Status code: 401**

`Not found`: No file linked to the user and the ID passed.
**Status code: 404**

### `PUT /files/:id/unpublish`

Sets `isPublic` to `false` on the file document based on the ID.

The users's authentication token should be passed inside the header `X-Token` along with the request.
**Status code: 200**

```bash
curl -XGET 0.0.0.0:5000/files/5f1e8896c7ba06511e683b25 -H "X-Token: f21fb953-16f9-46ed-8d9c-84c6450ec80f" ; echo ""

{"id":"5f1e8896c7ba06511e683b25","userId":"5f1e7cda04a394508232559d","name":"image.png","type":"image","isPublic":true,"parentId":"5f1e881cc7ba06511e683b23"}

curl -XPUT 0.0.0.0:5000/files/5f1e8896c7ba06511e683b25/publish -H "X-Token: f21fb953-16f9-46ed-8d9c-84c6450ec80f" ; echo ""

{"id":"5f1e8896c7ba06511e683b25","userId":"5f1e7cda04a394508232559d","name":"image.png","type":"image","isPublic":false,"parentId":"5f1e881cc7ba06511e683b23"}
```

#### Error Messages

`Unauthorized`: The authentication token was invalid.
**Status code: 401**

`Not found`: No file linked to the user and the ID passed.
**Status code: 404**

### `GET /files/:id/data`

Returns the content of the file document based on the ID.
**Status code: 200**

The users's authentication token should be passed inside the header `X-Token` along with the request if the file is not Public else, it's not necessary.

#### Query Parameters

The query parameters are optional, but they help return a more specific result.

`size`: can be `500`, `250`, or `100`. Indicates which size of the image being requested will be returned.

```bash
curl -XPUT 0.0.0.0:5000/files/5f1e879ec7ba06511e683b22/publish -H "X-Token: f21fb953-16f9-46ed-8d9c-84c6450ec80f" ; echo ""

{"id":"5f1e879ec7ba06511e683b22","userId":"5f1e7cda04a394508232559d","name":"myText.txt","type":"file","isPublic":true,"parentId":0}

curl -XGET 0.0.0.0:5000/files/5f1e879ec7ba06511e683b22/data ; echo ""

Hello Webstack!

curl -XPUT 0.0.0.0:5000/files/5f1e879ec7ba06511e683b22/unpublish -H "X-Token: f21fb953-16f9-46ed-8d9c-84c6450ec80f" ; echo ""

{"id":"5f1e879ec7ba06511e683b22","userId":"5f1e7cda04a394508232559d","name":"myText.txt","type":"file","isPublic":false,"parentId":0}

curl -XGET 0.0.0.0:5000/files/5f1e879ec7ba06511e683b22/data -H "X-Token: f21fb953-16f9-46ed-8d9c-84c6450ec80f" ; echo ""

Hello Webstack!

curl -XGET 0.0.0.0:5000/files/5f1e8896c7ba06511e683b25/data?size=100 -so new_image.png ; file new_image.png

new_image.png: PNG image data, 100 x 109, 8-bit/color RGBA, non-interlaced
```

#### Error Messages

`Unauthorized`: The authentication token was invalid.
**Status code: 401**

`Not found`: No file linked to the user and the ID passed.
**Status code: 404**

`A folder doesn't have content`: ID is linked to a folder
**Status code: 400**
