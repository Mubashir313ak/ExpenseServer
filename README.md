# Expense Tracker API

A production-oriented REST API for a personal expense tracker, built with
Node.js + Express + MongoDB (Mongoose) and packaged to run either as a normal
Node server locally or on **AWS Lambda** via `serverless-http`.

## Features

- JWT authentication (`jsonwebtoken`) with `bcryptjs` password hashing
- Users, Categories, Transactions, and monthly Summary endpoints
- Centralized error handling with consistent `{ "error": "message" }` responses
- Input validation via `express-validator`
- **Cached MongoDB connection** reused across warm Lambda invocations
- CORS enabled (all origins)

## Project structure

```
server/
├── app.js                # Express app: middleware + route mounting (no listen)
├── server.js             # Local dev entry point (app.listen)
├── lambda.js             # AWS Lambda entry point (serverless-http)
├── db.js                 # Cached Mongoose connection
├── config.js             # Validated env configuration
├── models/               # User, Category, Transaction schemas
├── routes/               # auth / categories / transactions / summary routers
├── controllers/          # Route handler logic
├── middleware/           # authMiddleware, errorHandler, validate
└── utils/                # ApiError, asyncHandler, month range helper
```

## Setup (local)

1. Install dependencies:

```bash
npm install
```

2. Create your environment file from the template and fill in values:

```bash
cp .env.example .env
```

Set at minimum:

- `MONGODB_URI` – your MongoDB connection string
- `JWT_SECRET` – a long random string

3. Run in development (auto-reload):

```bash
npm run dev
```

The API starts on `http://localhost:3000`. Health check: `GET /health`.

To run without auto-reload:

```bash
npm start
```

## API overview

All protected routes require an `Authorization: Bearer <token>` header.

### Auth (public)
| Method | Path              | Description                                   |
|--------|-------------------|-----------------------------------------------|
| POST   | `/api/auth/signup`| Create user, seed default categories, get JWT |
| POST   | `/api/auth/login` | Validate credentials, get JWT                 |
| GET    | `/api/auth/me`    | Current user (protected)                       |

### Categories (protected)
| Method | Path                  | Description                          |
|--------|-----------------------|--------------------------------------|
| GET    | `/api/categories`     | List the user's categories           |
| POST   | `/api/categories`     | Create a custom category             |
| DELETE | `/api/categories/:id` | Delete (not default, must be owned)  |

### Transactions (protected)
| Method | Path                    | Description                                       |
|--------|-------------------------|---------------------------------------------------|
| GET    | `/api/transactions`     | List; filters: `month=YYYY-MM`, `category`, `type`|
| POST   | `/api/transactions`     | Create a transaction                              |
| PUT    | `/api/transactions/:id` | Update (must be owned)                             |
| DELETE | `/api/transactions/:id` | Delete (must be owned)                             |

### Summary (protected)
| Method | Path                        | Description                                       |
|--------|-----------------------------|---------------------------------------------------|
| GET    | `/api/summary?month=YYYY-MM`| Totals + net balance + expense breakdown by category |

## Deploying to AWS Lambda

The Lambda handler is exported from `lambda.js` as `handler`
(i.e. set the function handler to `lambda.handler`).

Set the following environment variables on the Lambda function:

- `MONGODB_URI`
- `JWT_SECRET`
- (optional) `JWT_EXPIRES_IN`, `NODE_ENV=production`

### Package a deployment zip

Install only production dependencies and zip the folder:

```bash
npm install --production && zip -r function.zip . -x ".git/*"
```

Upload `function.zip` to your Lambda function (or wire it up through your
IaC / CI of choice), set the handler to `lambda.handler`, and put an
API Gateway (HTTP API or REST API) or ALB in front of it.

> Tip: if your MongoDB is in a VPC (or you use Atlas PrivateLink), attach the
> Lambda to the appropriate VPC/subnets and security groups. Otherwise ensure
> your Atlas IP access list allows the Lambda's egress (e.g. via a NAT gateway).

## CI/CD (GitHub Actions)

Automated deploys are configured via GitHub Actions in `.github/workflows/`:

| Workflow            | Trigger            | Env source                        | Alias updated |
|---------------------|--------------------|-----------------------------------|---------------|
| `deploy-dev.yml`    | push to `dev`      | `DEV_MONGODB_URI` + `JWT_SECRET`  | `dev`         |
| `deploy-prod.yml`   | push to `main`     | `PROD_MONGODB_URI` + `JWT_SECRET` | `prod`        |

Each workflow performs the same pipeline:

1. Checkout code and set up Node.js 20.
2. `npm install --production` and zip the package (excluding `.git/` and `.github/`).
3. Configure AWS credentials.
4. `aws lambda update-function-code` — upload the new code, then wait for the
   update to finish.
5. **Set environment variables → wait → publish.** The workflow runs
   `aws lambda update-function-configuration` to set the correct env vars, waits
   for the config update to complete, and only *then* publishes a new version.
   This ordering matters: publishing snapshots `$LATEST`, so env vars must be set
   **before** `publish-version` — otherwise they would stay on `$LATEST` and the
   published version would capture stale/missing values.
6. `aws lambda publish-version` and point the environment's alias
   (`dev` or `prod`) at the newly published version.

> Because dev and prod use different databases, `MONGODB_URI` is set per
> environment (`DEV_MONGODB_URI` / `PROD_MONGODB_URI`) at deploy time rather than
> managed manually on the function.

### Required GitHub Actions secrets

Add these under **Settings → Secrets and variables → Actions** in the backend repo:

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `JWT_SECRET`
- `DEV_MONGODB_URI`
- `PROD_MONGODB_URI`

### AWS prerequisites

- A Lambda function named `expensetracker` with handler `lambda.handler`.
- Two aliases already created on that function: `dev` and `prod`.
- The IAM user behind the AWS credentials needs: `lambda:UpdateFunctionCode`,
  `lambda:UpdateFunctionConfiguration`, `lambda:PublishVersion`,
  `lambda:UpdateAlias`, and `lambda:GetFunction`.

> Heads up: pushing to `main` triggers the **prod** deploy immediately. Use the
> `dev` branch for testing before merging to `main`.

## Notes

- Secrets are read only from environment variables — nothing is hardcoded.
- The Mongo connection is cached on the module/global scope so warm Lambda
  invocations reuse it instead of reconnecting on every request.
