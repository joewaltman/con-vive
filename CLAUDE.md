# Claude Code Project Memory

## Database Access

Railway PostgreSQL public URL:
```
postgresql://postgres:VrApfHFsgMTGpswaJlrsxHyPdFIsmBYT@hopper.proxy.rlwy.net:31285/railway
```

To query the database:
```bash
node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:VrApfHFsgMTGpswaJlrsxHyPdFIsmBYT@hopper.proxy.rlwy.net:31285/railway', ssl: { rejectUnauthorized: false } });
pool.query('YOUR QUERY HERE')
  .then(r => { console.log(JSON.stringify(r.rows, null, 2)); pool.end(); })
  .catch(e => { console.error(e); pool.end(); });
"
```

## Project Notes

- Admin dashboard is at `/admin/*`
- Gender values should be: "Male", "Female", "Non-binary", "Prefer not to say"
- Signup form submits to `/api/signup` (POST for page 1, PATCH for pages 2-3)
