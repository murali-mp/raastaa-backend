# Contributing to Raastaa Backend

Thank you for your interest in contributing to Raastaa Backend!

## Development Setup

1. **Clone repository**
```bash
git clone https://github.com/your-org/raastaa-backend.git
cd raastaa-backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Setup environment**
```bash
cp .env.example .env
# Edit .env with your local database credentials
```

4. **Setup database**
```bash
# Start PostgreSQL with PostGIS (using Docker)
docker run --name raastaa-postgres -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgis/postgis:15-3.4

# Run migrations
npm run prisma:migrate

# Seed data
npx ts-node prisma/seed.ts
```

5. **Start development server**
```bash
npm run dev
```

## Code Standards

### TypeScript
- Use TypeScript for all new code
- Enable strict mode
- Avoid `any` types when possible

### Code Style
- Run `npm run lint` before committing
- Run `npm run format` to auto-format code
- Follow existing patterns in codebase

### Naming Conventions
- Files: `kebab-case.ts`
- Classes: `PascalCase`
- Functions/variables: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- Interfaces: `PascalCase` (no `I` prefix)

## Commit Messages

Follow conventional commits format:
```
feat: add vendor search endpoint
fix: resolve PostGIS distance calculation
docs: update API documentation
refactor: simplify auth middleware
test: add wallet service tests
```

## Pull Request Process

1. Create a feature branch
```bash
git checkout -b feature/your-feature-name
```

2. Make your changes
- Write clean, documented code
- Add tests for new features
- Update documentation if needed

3. Test your changes
```bash
npm run lint
npm test
npm run build
```

4. Commit and push
```bash
git add .
git commit -m "feat: your feature description"
git push origin feature/your-feature-name
```

5. Open Pull Request
- Provide clear description
- Reference related issues
- Wait for review

## Testing

### Unit Tests
```bash
npm test
```

### Integration Tests
```bash
npm run test:integration
```

### Test Coverage
```bash
npm test -- --coverage
```

## Database Changes

### Creating Migrations
```bash
npx prisma migrate dev --name your_migration_name
```

### Important Notes
- Always test migrations locally first
- Include rollback instructions
- Update seed data if needed
- Document schema changes

## API Changes

When adding/modifying endpoints:
1. Update OpenAPI/Swagger docs
2. Add validation schemas
3. Write tests
4. Update API_DOCS.md
5. Version breaking changes

## Questions?

- Open an issue for bugs
- Discussion forum for questions
- Email: dev@raastaa.com

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
