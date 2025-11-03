# My File Structure will look like: 
```

prisma/
├──  schema.prisma
src/
├── repositories/     # Data access layer
├── exceptions/       # Custom error classes
├── constants/        # App-wide constants
|   ├── role.ts
├── interfaces/       # TypeScript interfaces
└── tests/           # Unit and integration tests
├── config/
│   ├── database.ts/ #👈 prisma client
├── controllers/
│   ├── auth-controller.ts
│   ├── user-controller.ts
├── middleware/
│   ├── logger-middleware.ts
│   ├── validate-middleware.ts
├── routes/
│   ├── auth-route.ts
│   ├── user-route.ts
├── service/
│   ├── auth-service.ts
├── types/
├── utils/
│   ├── async-handler.ts
│   ├── jwt.ts
├── validators/
│   ├── login-validator.ts
│   ├── register-validator.ts
├── database/        # DB-related files
│   ├── migrations/
│   ├── seeders/
│   └── factories/
├── app.ts
├── server.ts
/.env
/.env.example
/.gitignore
/package-lock.json
/package.json
/tsconfig.json

```
