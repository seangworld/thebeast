"""Existing secure DEV key only; no inference unless explicit dispatch arguments authorize it."""
import os, pathlib, shlex, sys
if not sys.argv[1:]:
    raise SystemExit('Provide offline --check or explicitly approved --execute arguments')
env = os.environ.copy()
if not env.get('OPENAI_API_KEY'):
    credential = pathlib.Path.home() / '.config/seangworld/avery-dev.env'
    if not credential.is_file() or credential.is_symlink() or credential.stat().st_mode & 0o077:
        raise SystemExit('Configure OPENAI_API_KEY in your private DEV shell; never paste it in chat')
    for line in credential.read_text().splitlines():
        line = line.strip().removeprefix('export ')
        if line.startswith('OPENAI_API_KEY='):
            env['OPENAI_API_KEY'] = shlex.split(line.split('=', 1)[1])[0]
if not env.get('OPENAI_API_KEY', '').startswith('sk-'):
    raise SystemExit('Secure DEV key unavailable')
for key in ['VERCEL', 'VERCEL_ENV', 'SUPABASE_SERVICE_ROLE_KEY', 'OPENAI_DIGITAL_STAFF_MODEL', 'OPENAI_DIGITAL_STAFF_FAST_MODEL', 'OPENAI_DIGITAL_STAFF_STRONG_MODEL']:
    env.pop(key, None)
env['NODE_ENV'] = 'development'
os.execvpe('node', ['node', 'scripts/guidance-evaluation-dispatch.mjs', *sys.argv[1:]], env)
