## SQL Adapter Checklist

- Identify every `node:sqlite` import and DB constructor.
- Keep schema format stable unless the task explicitly requires migration.
- Verify extension loading on a real configured `vec0` path.
- Verify fallback behavior when sqlite support is unavailable.
- Run focused retrieval and memory tests after changes.
