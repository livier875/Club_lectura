import psycopg2
try:
    conn = psycopg2.connect(dbname='postgres', user='postgres', password='1234', host='localhost', port='5432')
    conn.autocommit = True
    cur = conn.cursor()
    cur.execute("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'club_lectura';")
    print('Conexiones a club_lectura terminadas.')
except Exception as e:
    print('Error:', e)
