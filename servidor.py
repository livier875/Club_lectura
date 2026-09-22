from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import psycopg2
from psycopg2.extras import RealDictCursor
import os
import datetime

app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

@app.route('/')
def index():
    return send_from_directory(BASE_DIR, 'index.html')

@app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory(BASE_DIR, filename)

DB_CONFIG = {
    'dbname': 'club_lectura',
    'user': 'postgres',
    'password': '1234', 
    'host': 'localhost',
    'port': '5432'
}

try:
    conn = psycopg2.connect(**DB_CONFIG)
    try:
        print("\n✅ EXCELENTE: Conexión exitosa a PostgreSQL.")
    finally:
        conn.close()
except Exception as e:
    print(f"\n❌ ERROR de conexión: {e}")

def obtener_id_usuario(cur, identificador):
    cur.execute("SELECT id_usuario FROM Usuarios WHERE LOWER(username) = LOWER(%s) OR nombre_completo = %s LIMIT 1", (identificador, identificador))
    row = cur.fetchone()
    if not row: return None
    try:
        return row['id_usuario']
    except (TypeError, KeyError):
        return row[0]

def obtener_id_autor(cur, identificador):
    if not identificador: return None
    cur.execute("SELECT id_usuario FROM Usuarios WHERE (LOWER(username) = LOWER(%s) OR nombre_completo = %s) AND rol = 'autor' LIMIT 1", (identificador, identificador))
    row = cur.fetchone()
    if not row: return None
    try:
        return row['id_usuario']
    except (TypeError, KeyError):
        return row[0]

@app.route('/api/login', methods=['POST'])
def login():
    datos = request.get_json()
    conn = None
    cur = None
    
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        cur.execute("SELECT * FROM Usuarios WHERE username = %s AND password_hash = %s", 
                    (datos.get('username'), datos.get('password')))
        usuario = cur.fetchone()
        
        if not usuario:
            return jsonify({"exito": False, "mensaje": "Usuario o contraseña incorrectos"})

        cur.execute("""
            SELECT c.id_club, c.nombre, c.tematica, u.username as org_username, u.nombre_completo as organizador, c.cupo_maximo, 
                   c.modalidad as es_online, c.horario_texto as horario, c.portada_url as imagenURL,
                   c.enlace_online
            FROM Clubes c
            JOIN Usuarios u ON c.id_organizador = u.id_usuario
        """)
        clubes_db = cur.fetchall()
        
        lista_clubes = []
        for c in clubes_db:
            lista_clubes.append({
                "id_club": c['id_club'],
                "nombre": c['nombre'], "tematica": c['tematica'], "organizador": c['organizador'], "org_username": c['org_username'],
                "sede": c['enlace_online'] if c['enlace_online'] else ("Online" if c['es_online'] == 'Online' else "Por definir"),
                "max_cupo": c['cupo_maximo'], "es_online": c['es_online'] == 'Online',
                "horario": c['horario'], "imagenURL": c['imagenurl']
            })

        response_data = {
            "exito": True,
            "usuario": {
                "id_usuario": usuario['id_usuario'],
                "username": usuario['username'], "rol": usuario['rol'], "nombre": usuario['nombre_completo'],
                "correo": usuario['correo'], "ciudad": usuario['ciudad'], "bio": usuario['bio'] or "",
                "telefono": usuario['telefono'],
                "foto": usuario['foto_perfil_url'] or "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23999'><path d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/></svg>"
            },
            "clubes_globales": lista_clubes,
            "datos_extra": {}
        }

        cur.execute("SELECT nombre_referencia, contenido FROM Notas_Personales WHERE id_usuario = %s", (usuario['id_usuario'],))
        notas_list = cur.fetchall()
        notas_formateadas = {}
        for n in notas_list:
            ref = n['nombre_referencia'] if n['nombre_referencia'] else "General"
            if ref not in notas_formateadas:
                notas_formateadas[ref] = []
            notas_formateadas[ref].append(n['contenido'])
        response_data["datos_extra"]["notas"] = notas_formateadas

        if usuario['rol'] == 'lector':
            cur.execute("""
                SELECT lu.id_lectura, l.id_libro, l.titulo, 
                       COALESCE(u.nombre_completo, l.nombre_autor_externo) as autor, 
                       l.portada_url, lu.paginas_leidas, l.paginas, lu.estado
                FROM Lecturas_Usuario lu
                JOIN Libros l ON lu.id_libro = l.id_libro
                LEFT JOIN Usuarios u ON l.id_autor_interno = u.id_usuario
                WHERE lu.id_usuario = %s
            """, (usuario['id_usuario'],))
            lecturas = cur.fetchall()
            
            response_data["datos_extra"]["proximas"] = [{"id_libro": r['id_libro'], "titulo": r['titulo'], "autor": r['autor'], "img": r['portada_url']} for r in lecturas if r['estado'] == 'por_leer']
            response_data["datos_extra"]["actuales"] = [{"id_libro": r['id_libro'], "titulo": r['titulo'], "autor": r['autor'], "leidas": r['paginas_leidas'], "totales": r['paginas']} for r in lecturas if r['estado'] == 'leyendo']
            response_data["datos_extra"]["terminadas"] = [{"id_libro": r['id_libro'], "titulo": r['titulo'], "autor": r['autor']} for r in lecturas if r['estado'] == 'terminado']

            # Traer todas las reseñas escritas por este lector en específico
            cur.execute("SELECT id_libro, calificacion, comentario FROM Resenas WHERE id_usuario = %s", (usuario['id_usuario'],))
            mis_resenas_list = cur.fetchall()
            response_data["datos_extra"]["mis_resenas"] = {r['id_libro']: dict(r) for r in mis_resenas_list}

            # 1. PRIMERO OBTENEMOS LOS CLUBES DE LA BASE DE DATOS
            cur.execute("""
                SELECT c.id_club, c.nombre, c.tematica, u_org.nombre_completo as organizador, u_org.username as org_username,
                       c.horario_texto as horario, c.portada_url as portada, c.enlace_online as sede, c.libro_actual, c.estado_club
                FROM Miembros_Club mc
                JOIN Clubes c ON mc.id_club = c.id_club
                JOIN Usuarios u_org ON c.id_organizador = u_org.id_usuario
                WHERE mc.id_usuario = %s AND mc.estado_solicitud = 'Aceptado'
            """, (usuario['id_usuario'],))
            response_data["datos_extra"]["mis_clubes"] = [dict(r) for r in cur.fetchall()]

           # 2. AHORA SÍ CALCULAMOS LAS ESTADÍSTICAS
            cur.execute("SELECT COUNT(*) as total FROM Resenas WHERE id_usuario = %s", (usuario['id_usuario'],))
            conteo_resenas = cur.fetchone()['total']

            response_data["datos_extra"]["estadisticas"] = {
                "libros_leidos": len(response_data["datos_extra"]["terminadas"]),
                "clubes_unidos": len(response_data["datos_extra"]["mis_clubes"]),
                "resenas": conteo_resenas  
            }

            cur.execute("""
                SELECT c.id_club, c.nombre, c.tematica, u_org.nombre_completo as organizador, u_org.username as org_username,
                       c.horario_texto as horario, c.portada_url as portada, c.enlace_online as sede, c.libro_actual, c.estado_club
                FROM Miembros_Club mc
                JOIN Clubes c ON mc.id_club = c.id_club
                JOIN Usuarios u_org ON c.id_organizador = u_org.id_usuario
                WHERE mc.id_usuario = %s AND mc.estado_solicitud = 'Aceptado'
            """, (usuario['id_usuario'],))
            response_data["datos_extra"]["mis_clubes"] = [dict(r) for r in cur.fetchall()]

        elif usuario['rol'] == 'organizador':
            cur.execute("SELECT id_tarea as id, texto, estado FROM Tareas_Organizador WHERE id_organizador = %s AND estado = 'Pendiente' ORDER BY id_tarea ASC", (usuario['id_usuario'],))
            response_data["datos_extra"]["tareas"] = [dict(r) for r in cur.fetchall()]
            
            cur.execute("""
                SELECT c.id_club, c.nombre, c.tematica, c.nombre_autor_asignado as autor, c.estado_asistencia_autor as "estadoAutor",
                       c.modalidad, c.enlace_online as sede, c.estado_pago_sede as "estadoSede", c.abono_sede as abono,
                       c.cupo_maximo as cupo, c.horario_texto as horario, c.portada_url as portada, c.libro_actual, c.estado_club,
                       (SELECT COUNT(*) FROM Miembros_Club mc WHERE mc.id_club = c.id_club AND mc.estado_solicitud = 'Aceptado') as inscritos
                FROM Clubes c WHERE c.id_organizador = %s ORDER BY c.id_club ASC
            """, (usuario['id_usuario'],))
            response_data["datos_extra"]["mis_clubes"] = [dict(r) for r in cur.fetchall()]
            
            cur.execute("""
                SELECT mc.id_club, mc.id_usuario, u.nombre_completo as nombreuser, c.nombre as club
                FROM Miembros_Club mc
                JOIN Usuarios u ON mc.id_usuario = u.id_usuario
                JOIN Clubes c ON mc.id_club = c.id_club
                WHERE c.id_organizador = %s AND mc.estado_solicitud = 'Pendiente'
            """, (usuario['id_usuario'],))
            solicitudes_db = cur.fetchall()
            response_data["datos_extra"]["solicitudes"] = [{"id_club": r['id_club'], "id_usuario": r['id_usuario'], "nombreUser": r['nombreuser'], "club": r['club']} for r in solicitudes_db]
            
            cur.execute("""
                SELECT c.id_cotizacion, u.nombre_completo as sede_nombre, u.username as sede_username, c.concepto, c.precio_estimado, c.precio_persona, c.notas_sede
                FROM Cotizaciones c
                JOIN Usuarios u ON c.id_sede = u.id_usuario
                WHERE c.id_organizador = %s AND c.estado = 'Respondida'
            """, (usuario['id_usuario'],))
            response_data["datos_extra"]["cotizaciones_respondidas"] = [dict(r) for r in cur.fetchall()]

        elif usuario['rol'] == 'autor':
            cur.execute("SELECT id_libro, titulo, genero, paginas, sinopsis, portada_url FROM Libros WHERE id_autor_interno = %s ORDER BY id_libro DESC", (usuario['id_usuario'],))
            response_data["datos_extra"]["libros"] = [dict(r) for r in cur.fetchall()]
            
            # Traer invitaciones pendientes con los detalles de la propuesta
            cur.execute("""
                SELECT c.id_club, c.nombre as club_nombre, u.nombre_completo as organizador, u.username as org_username,
                       p.formato, p.fecha, p.hora, p.sede_nombre, p.pais, p.municipio, p.ciudad
                FROM Clubes c
                JOIN Usuarios u ON c.id_organizador = u.id_usuario
                LEFT JOIN Propuestas_Autor p ON p.id_club = c.id_club AND p.id_autor = c.id_autor_invitado
                WHERE c.id_autor_invitado = %s AND c.estado_asistencia_autor = 'Pendiente'
                ORDER BY p.id_propuesta DESC
            """, (usuario['id_usuario'],))
            response_data["datos_extra"]["invitaciones"] = [dict(r) for r in cur.fetchall()]

            # --- NUEVO: Traer eventos CONFIRMADOS ---
            cur.execute("""
                SELECT c.id_club, c.nombre as club_nombre, u.nombre_completo as organizador, u.username as org_username,
                       p.formato, p.fecha, p.hora, p.sede_nombre, p.pais, p.municipio, p.ciudad
                FROM Clubes c
                JOIN Usuarios u ON c.id_organizador = u.id_usuario
                LEFT JOIN Propuestas_Autor p ON p.id_club = c.id_club AND p.id_autor = c.id_autor_invitado
                WHERE c.id_autor_invitado = %s AND c.estado_asistencia_autor = 'Confirmada'
                ORDER BY p.fecha ASC
            """, (usuario['id_usuario'],))
            response_data["datos_extra"]["eventos_confirmados"] = [dict(r) for r in cur.fetchall()]
            
            # ... (Aquí está tu código de los eventos Confirmados) ...

            # --- NUEVO: Traer eventos TERMINADOS (Historial) ---
            cur.execute("""
                SELECT c.id_club, c.nombre as club_nombre, u.nombre_completo as organizador, u.username as org_username,
                       p.formato, p.fecha, p.hora, p.sede_nombre, p.pais, p.municipio, p.ciudad
                FROM Clubes c
                JOIN Usuarios u ON c.id_organizador = u.id_usuario
                LEFT JOIN Propuestas_Autor p ON p.id_club = c.id_club AND p.id_autor = c.id_autor_invitado
                WHERE c.id_autor_invitado = %s AND c.estado_asistencia_autor = 'Terminada'
                ORDER BY p.fecha DESC
            """, (usuario['id_usuario'],))
            response_data["datos_extra"]["historial_eventos"] = [dict(r) for r in cur.fetchall()]

        elif usuario['rol'] == 'sede':
            cur.execute("SELECT * FROM Sedes_Info WHERE id_usuario = %s", (usuario['id_usuario'],))
            info_sede = cur.fetchone()
            
            cur.execute("""
                SELECT e.id_evento, e.nombre_evento, u.nombre_completo as organizador, e.fecha_hora, e.asistentes_esperados, 
                       e.estado, e.total_acordado, e.abono_recibido
                FROM Eventos e
                JOIN Usuarios u ON e.id_organizador = u.id_usuario
                WHERE e.id_sede = %s AND e.estado != 'Pendiente' AND e.estado != 'Cancelado'
            """, (usuario['id_usuario'],))
            eventos = cur.fetchall()
            
            eventos_lista = []
            for ev in eventos:
                fecha_obj = ev['fecha_hora']
                if isinstance(fecha_obj, datetime.datetime):
                    fecha_str = fecha_obj.strftime('%Y-%m-%d')
                    hora_str = fecha_obj.strftime('%H:%M hrs')
                else:
                    fecha_str = str(fecha_obj)
                    hora_str = ""

                eventos_lista.append({
                    "id_evento": ev['id_evento'],
                    "nombre": ev['nombre_evento'], "organizador": ev['organizador'],
                    "fecha": fecha_str, "hora": hora_str,
                    "personas": ev['asistentes_esperados'], "estado": ev['estado'],
                    "total": float(ev['total_acordado']), "abono": float(ev['abono_recibido'])
                })
            
            cur.execute("""
                SELECT e.id_evento, e.nombre_evento, u.nombre_completo as organizador, u.username as org_username, e.fecha_hora, e.asistentes_esperados, e.total_acordado, e.notas
                FROM Eventos e
                JOIN Usuarios u ON e.id_organizador = u.id_usuario
                WHERE e.id_sede = %s AND e.estado = 'Pendiente'
            """, (usuario['id_usuario'],))
            reservas_raw = cur.fetchall()
            
            reservas_pendientes = []
            for res in reservas_raw:
                fh = res['fecha_hora']
                if isinstance(fh, datetime.datetime):
                    fh = fh.strftime('%Y-%m-%d %H:%M')
                else:
                    fh = str(fh)
                reservas_pendientes.append({
                    "id_evento": res['id_evento'], "nombre_evento": res['nombre_evento'], "organizador": res['organizador'], "org_username": res['org_username'],
                    "fecha_hora": fh, "asistentes_esperados": res['asistentes_esperados'], "total_acordado": float(res['total_acordado'] or 0),
                    "notas": res.get('notas', '')
                })

            cur.execute("""
                SELECT c.id_cotizacion, u.nombre_completo as organizador, u.username as org_username, c.concepto, c.personas, c.fecha_evento, c.estado, c.precio_estimado, c.precio_persona
                FROM Cotizaciones c
                JOIN Usuarios u ON c.id_organizador = u.id_usuario
                WHERE c.id_sede = %s AND c.estado != 'Eliminada'
            """, (usuario['id_usuario'],))
            
            response_data["datos_extra"]["info_sede"] = dict(info_sede) if info_sede else None
            response_data["datos_extra"]["eventos"] = eventos_lista
            response_data["datos_extra"]["reservas_pendientes"] = reservas_pendientes
            response_data["datos_extra"]["cotizaciones_pendientes"] = [dict(r) for r in cur.fetchall()]
            
        return jsonify(response_data)
            
    except Exception as e:
        return jsonify({"exito": False, "mensaje": f"Error del servidor: {e}"})
    finally:
        if cur: cur.close()
        if conn: conn.close()

@app.route('/api/register', methods=['POST'])
def register():
    datos = request.get_json()
    conn = None
    cur = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        conn.autocommit = True
        cur = conn.cursor()
        
        cur.execute("SELECT id_usuario FROM Usuarios WHERE username = %s OR correo = %s", 
                    (datos.get('username'), datos.get('correo')))
        if cur.fetchone():
            return jsonify({"exito": False, "mensaje": "El nombre de usuario o correo ya está en uso."})

        query_usuario = """
            INSERT INTO Usuarios (username, password_hash, rol, nombre_completo, correo, telefono, pais, ciudad)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING id_usuario
        """
        cur.execute(query_usuario, (
            datos.get('username'), datos.get('password'), datos.get('rol'),
            datos.get('nombre_completo'), datos.get('correo'), datos.get('telefono'),
            datos.get('pais', None), datos.get('ciudad', None)
        ))
        
        id_usuario_nuevo = cur.fetchone()[0]

        if datos.get('rol') == 'sede':
            query_sede = "INSERT INTO Sedes_Info (id_usuario, direccion_completa, capacidad_maxima) VALUES (%s, %s, %s)"
            cur.execute(query_sede, (id_usuario_nuevo, datos.get('direccion', 'Sin dirección'), 50))
        
        return jsonify({"exito": True, "mensaje": "Usuario registrado correctamente."})
    except Exception as e:
        return jsonify({"exito": False, "mensaje": f"Error de base de datos: {e}"})
    finally:
        if cur: cur.close()
        if conn: conn.close()

@app.route('/api/update_profile', methods=['POST'])
def update_profile():
    datos = request.get_json()
    conn = None
    cur = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        conn.autocommit = True
        cur = conn.cursor()
        
        query = """
            UPDATE Usuarios 
            SET nombre_completo = %s, correo = %s, telefono = %s, foto_perfil_url = %s, ciudad = %s, bio = %s
            WHERE username = %s
        """
        cur.execute(query, (
            datos.get('nombre'), datos.get('correo'), datos.get('telefono'), 
            datos.get('foto'), datos.get('ciudad'), datos.get('bio'), datos.get('username')
        ))
        return jsonify({"exito": True, "mensaje": "Perfil actualizado correctamente"})
    except Exception as e:
        return jsonify({"exito": False, "mensaje": f"Error al actualizar perfil: {e}"})
    finally:
        if cur: cur.close()
        if conn: conn.close()

@app.route('/api/nuevo_libro', methods=['POST'])
def nuevo_libro():
    datos = request.get_json()
    conn = None
    cur = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        conn.autocommit = True
        cur = conn.cursor()
        
        id_autor = obtener_id_usuario(cur, datos.get('username'))
        if not id_autor:
            return jsonify({"exito": False, "mensaje": "Usuario no encontrado"})
            
        query = """
            INSERT INTO Libros (titulo, id_autor_interno, nombre_autor_externo, genero, paginas, sinopsis, portada_url)
            VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id_libro
        """
        cur.execute(query, (datos.get('titulo'), id_autor, datos.get('autor'), datos.get('genero'), int(datos.get('paginas')), datos.get('sinopsis'), datos.get('portada')))
        id_nuevo_libro = cur.fetchone()[0]
        return jsonify({"exito": True, "mensaje": "Libro publicado con éxito.", "id_libro": id_nuevo_libro})
    except Exception as e:
        return jsonify({"exito": False, "mensaje": str(e)})
    finally:
        if cur: cur.close()
        if conn: conn.close()

@app.route('/api/editar_libro', methods=['POST'])
def editar_libro():
    datos = request.get_json()
    conn = None
    cur = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        conn.autocommit = True
        cur = conn.cursor()
        
        query = """
            UPDATE Libros 
            SET titulo=%s, genero=%s, paginas=%s, sinopsis=%s, portada_url=%s
            WHERE id_libro=%s
        """
        cur.execute(query, (datos.get('titulo'), datos.get('genero'), int(datos.get('paginas')), datos.get('sinopsis'), datos.get('portada'), datos.get('id_libro')))
        return jsonify({"exito": True, "mensaje": "Libro actualizado."})
    except Exception as e:
        return jsonify({"exito": False, "mensaje": str(e)})
    finally:
        if cur: cur.close()
        if conn: conn.close()

@app.route('/api/crear_club', methods=['POST'])
def crear_club():
    datos = request.get_json()
    conn = None
    cur = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        conn.autocommit = True
        cur = conn.cursor()
        
        id_organizador = obtener_id_usuario(cur, datos.get('organizador_username'))
        if not id_organizador:
            return jsonify({"exito": False, "mensaje": "Organizador no encontrado."})
            
        id_autor_invitado = obtener_id_autor(cur, datos.get('autor'))
        
        cupo = int(datos.get('cupo') or 0)
        abono = float(datos.get('abonoSede') or 0.0)

        query = """
            INSERT INTO Clubes (
                nombre, tematica, id_organizador, modalidad, cupo_maximo, 
                horario_texto, estado_asistencia_autor, estado_pago_sede, abono_sede, portada_url, enlace_online, nombre_autor_asignado, libro_actual, id_autor_invitado
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id_club
        """
        cur.execute(query, (
            datos.get('nombre'), datos.get('tematica'), id_organizador, datos.get('modalidad'),
            cupo, datos.get('horario'), datos.get('estadoAutor'),
            datos.get('estadoSede'), abono, datos.get('portada'), datos.get('sede'), datos.get('autor'), datos.get('libro_actual'), id_autor_invitado
        ))
        id_nuevo_club = cur.fetchone()[0]
        return jsonify({"exito": True, "mensaje": "Club creado correctamente.", "id_club": id_nuevo_club})
    except Exception as e:
        return jsonify({"exito": False, "mensaje": f"Error de BD: {str(e)}"})
    finally:
        if cur: cur.close()
        if conn: conn.close()

@app.route('/api/clubes', methods=['GET'])
def get_clubes():
    conn = None
    cur = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
            SELECT c.id_club, c.nombre, c.tematica, u.username as org_username, u.nombre_completo as organizador, c.cupo_maximo, 
                   c.modalidad as es_online, c.horario_texto as horario, c.portada_url as imagenURL,
                   c.enlace_online, c.libro_actual, c.estado_club
            FROM Clubes c
            JOIN Usuarios u ON c.id_organizador = u.id_usuario
            WHERE c.estado_club != 'Terminado'
            ORDER BY c.id_club DESC
        """)
        clubes_db = cur.fetchall()
        
        lista_clubes = []
        for c in clubes_db:
            lista_clubes.append({
                "id_club": c['id_club'],
                "nombre": c['nombre'], "tematica": c['tematica'], "organizador": c['organizador'], "org_username": c['org_username'],
                "sede": c['enlace_online'] if c['enlace_online'] else ("Online" if c['es_online'] == 'Online' else "Por definir"),
                "max_cupo": c['cupo_maximo'], "es_online": c['es_online'] == 'Online',
                "horario": c['horario'], "imagenURL": c['imagenurl'],
                "libro_actual": c['libro_actual']
            })
        return jsonify({"exito": True, "clubes": lista_clubes})
    except Exception as e:
        return jsonify({"exito": False, "mensaje": str(e)})
    finally:
        if cur: cur.close()
        if conn: conn.close()

@app.route('/api/libros', methods=['GET'])
def get_libros():
    conn = None
    cur = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
            SELECT l.id_libro, l.titulo, u.nombre_completo as autor, 
                   l.genero, l.paginas, l.sinopsis, l.portada_url
            FROM Libros l
            JOIN Usuarios u ON l.id_autor_interno = u.id_usuario
            ORDER BY l.id_libro DESC
        """)
        return jsonify({"exito": True, "libros": [dict(r) for r in cur.fetchall()]})
    except Exception as e:
        return jsonify({"exito": False, "mensaje": str(e)})
    finally:
        if cur: cur.close()
        if conn: conn.close()

@app.route('/api/sedes', methods=['GET'])
def get_sedes():
    conn = None
    cur = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
            SELECT u.nombre_completo as nombre, u.foto_perfil_url as foto, u.username,
                   s.direccion_completa as direccion, s.capacidad_minima as min, 
                   s.capacidad_maxima as max, s.precio_persona as precio, 
                   s.amenidades, s.promociones
            FROM Sedes_Info s
            JOIN Usuarios u ON s.id_usuario = u.id_usuario
        """)
        return jsonify({"exito": True, "sedes": cur.fetchall()})
    except Exception as e:
        return jsonify({"exito": False, "mensaje": str(e)})
    finally:
        if cur: cur.close()
        if conn: conn.close()

@app.route('/api/comunidad', methods=['GET'])
def get_comunidad():
    conn = None
    cur = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # 1. Traemos SOLO a los organizadores
        cur.execute("""
            SELECT id_usuario, username, nombre_completo, rol, bio, foto_perfil_url, ciudad, telefono 
            FROM Usuarios 
            WHERE rol = 'organizador'
        """)
        organizadores = cur.fetchall()
        
        # 2. Por cada organizador, buscamos qué clubes tiene activos
        for org in organizadores:
            cur.execute("""
                SELECT id_club, nombre, tematica, modalidad, enlace_online, horario_texto, portada_url, libro_actual, cupo_maximo 
                FROM Clubes 
                WHERE id_organizador = %s
            """, (org['id_usuario'],))
            org['clubes'] = [dict(c) for c in cur.fetchall()]
            
        return jsonify({"exito": True, "usuarios": organizadores})
    except Exception as e:
        return jsonify({"exito": False, "mensaje": str(e)})
    finally:
        if cur: cur.close()
        if conn: conn.close()

@app.route('/api/autores', methods=['GET'])
def get_autores():
    conn = None
    cur = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor(cursor_factory=RealDictCursor)
        # Traer solo a los usuarios que tienen el rol 'autor'
        cur.execute("""
            SELECT id_usuario, username, nombre_completo, foto_perfil_url as foto, bio 
            FROM Usuarios 
            WHERE rol = 'autor'
        """)
        return jsonify({"exito": True, "autores": cur.fetchall()})
    except Exception as e:
        return jsonify({"exito": False, "mensaje": str(e)})
    finally:
        if cur: cur.close()
        if conn: conn.close()

@app.route('/api/conectar', methods=['POST'])
def conectar():
    datos = request.get_json()
    conn = None
    cur = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        conn.autocommit = True
        cur = conn.cursor()
        
        id_remitente = obtener_id_usuario(cur, datos.get('remitente'))
        id_destinatario = obtener_id_usuario(cur, datos.get('destinatario'))
        
        if not id_remitente or not id_destinatario:
            return jsonify({"exito": False, "mensaje": "Usuario no encontrado."})
            
        cur.execute("SELECT estado FROM Conexiones WHERE id_seguidor=%s AND id_seguido=%s", (id_remitente, id_destinatario))
        existe = cur.fetchone()
        
        if existe:
            cur.execute("DELETE FROM Conexiones WHERE id_seguidor=%s AND id_seguido=%s", (id_remitente, id_destinatario))
            estado = "desconectado"
        else:
            cur.execute("INSERT INTO Conexiones (id_seguidor, id_seguido, estado) VALUES (%s, %s, 'Pendiente')", (id_remitente, id_destinatario))
            estado = "conectado"
            
        return jsonify({"exito": True, "estado": estado})
    except Exception as e:
        return jsonify({"exito": False, "mensaje": str(e)})
    finally:
        if cur: cur.close()
        if conn: conn.close()

@app.route('/api/bandeja_mensajes', methods=['POST'])
def bandeja_mensajes():
    datos = request.get_json()
    username = datos.get('username')
    conn = None
    cur = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor(cursor_factory=RealDictCursor)
        id_user = obtener_id_usuario(cur, username)
        
        # 1. Traer usuarios con fecha del último mensaje y contador de no leídos
        cur.execute("""
            SELECT u.username as id_chat, u.nombre_completo as nombre, u.foto_perfil_url as foto, u.rol,
                   (SELECT contenido FROM Mensajes 
                    WHERE (id_remitente = %s AND id_destinatario = u.id_usuario) 
                       OR (id_remitente = u.id_usuario AND id_destinatario = %s)
                    ORDER BY fecha_envio DESC LIMIT 1) as ultimo_mensaje,
                   (SELECT fecha_envio FROM Mensajes 
                    WHERE (id_remitente = %s AND id_destinatario = u.id_usuario) 
                       OR (id_remitente = u.id_usuario AND id_destinatario = %s)
                    ORDER BY fecha_envio DESC LIMIT 1) as ultima_fecha,
                   (SELECT COUNT(*) FROM Mensajes 
                    WHERE id_remitente = u.id_usuario AND id_destinatario = %s AND leido = FALSE) as sin_leer
            FROM Usuarios u WHERE u.id_usuario != %s
        """, (id_user, id_user, id_user, id_user, id_user, id_user))
        usuarios = cur.fetchall()
        
        # 2. Traer clubes con fecha del último mensaje y contador
        cur.execute("""
            SELECT c.nombre as id_chat, c.nombre as nombre, c.portada_url as foto, 'club' as rol,
                   (SELECT contenido FROM Mensajes_Club mc WHERE mc.id_club = c.id_club ORDER BY fecha_envio DESC LIMIT 1) as ultimo_mensaje,
                   (SELECT fecha_envio FROM Mensajes_Club mc WHERE mc.id_club = c.id_club ORDER BY fecha_envio DESC LIMIT 1) as ultima_fecha,
                   (SELECT COUNT(*) FROM Mensajes_Club mc 
                    WHERE mc.id_club = c.id_club 
                      AND mc.id_remitente != %s 
                      AND mc.fecha_envio > COALESCE(
                          (SELECT ultimo_acceso FROM Accesos_Chat_Club acc WHERE acc.id_club = c.id_club AND acc.id_usuario = %s), 
                          '1970-01-01'::timestamp
                      )
                   ) as sin_leer
            FROM Clubes c
            LEFT JOIN Miembros_Club m ON c.id_club = m.id_club
            WHERE (m.id_usuario = %s AND m.estado_solicitud = 'Aceptado') OR (c.id_organizador = %s)
            GROUP BY c.id_club
        """, (id_user, id_user, id_user, id_user))
        clubes = cur.fetchall()
        
        contactos = []
        for r in usuarios: contactos.append(dict(r))
        for c in clubes: contactos.append(dict(c))
            
        # 3. Ordenar del más reciente al más antiguo usando la fecha
        def sort_key(c):
            from datetime import datetime
            fecha = c.get('ultima_fecha')
            if fecha:
                return fecha
            return datetime.min # Si no hay mensajes, se va al fondo
            
        contactos.sort(key=sort_key, reverse=True)
        
        return jsonify({"exito": True, "contactos": contactos})
    except Exception as e:
        return jsonify({"exito": False, "mensaje": str(e)})
    finally:
        if cur: cur.close()
        if conn: conn.close()

@app.route('/api/historial_chat', methods=['POST'])
def historial_chat():
    datos = request.get_json()
    conn = None
    cur = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        id_remitente = obtener_id_usuario(cur, datos.get('remitente'))
        destinatario_nombre = datos.get('destinatario')
        
        if not id_remitente:
             return jsonify({"exito": True, "mensajes": []})

        cur.execute("SELECT id_club FROM Clubes WHERE nombre = %s LIMIT 1", (destinatario_nombre,))
        club = cur.fetchone()

        if club:
            cur.execute("""
                SELECT mc.contenido, u.username as remitente, mc.fecha_envio 
                FROM Mensajes_Club mc 
                JOIN Usuarios u ON mc.id_remitente = u.id_usuario
                WHERE mc.id_club = %s
                ORDER BY mc.fecha_envio ASC
            """, (club['id_club'],))
            return jsonify({"exito": True, "mensajes": cur.fetchall()})
        else:
            id_destinatario = obtener_id_usuario(cur, destinatario_nombre)
            if not id_destinatario:
                 return jsonify({"exito": True, "mensajes": []})
                 
            cur.execute("""
                SELECT m.contenido, u.username as remitente, m.fecha_envio 
                FROM Mensajes m 
                JOIN Usuarios u ON m.id_remitente = u.id_usuario
                WHERE (m.id_remitente = %s AND m.id_destinatario = %s) 
                   OR (m.id_remitente = %s AND m.id_destinatario = %s)
                ORDER BY m.fecha_envio ASC
            """, (id_remitente, id_destinatario, id_destinatario, id_remitente))
            
            return jsonify({"exito": True, "mensajes": cur.fetchall()})
    except Exception as e:
        return jsonify({"exito": False, "mensaje": str(e)})
    finally:
        if cur: cur.close()
        if conn: conn.close()

@app.route('/api/enviar_mensaje', methods=['POST'])
def enviar_mensaje():
    datos = request.get_json()
    conn = None
    cur = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        conn.autocommit = True
        cur = conn.cursor()
        
        id_remitente = obtener_id_usuario(cur, datos.get('remitente'))
        destinatario_nombre = datos.get('destinatario')
        
        if not id_remitente:
            return jsonify({"exito": False, "mensaje": "Remitente no encontrado."})

        cur.execute("SELECT id_club FROM Clubes WHERE nombre = %s LIMIT 1", (destinatario_nombre,))
        club = cur.fetchone()
        
        if club:
            id_club_real = club[0] if isinstance(club, tuple) else club['id_club']
            cur.execute("INSERT INTO Mensajes_Club (id_club, id_remitente, contenido) VALUES (%s, %s, %s)", 
                        (id_club_real, id_remitente, datos.get('contenido')))
            return jsonify({"exito": True})
        else:
            id_destinatario = obtener_id_usuario(cur, destinatario_nombre)
            if not id_destinatario:
                return jsonify({"exito": False, "mensaje": "Usuario o Club no encontrado."})
                
            cur.execute("INSERT INTO Mensajes (id_remitente, id_destinatario, contenido) VALUES (%s, %s, %s)", 
                        (id_remitente, id_destinatario, datos.get('contenido')))
                    
        return jsonify({"exito": True})
    except Exception as e:
        return jsonify({"exito": False, "mensaje": str(e)})
    finally:
        if cur: cur.close()
        if conn: conn.close()


@app.route('/api/marcar_leidos', methods=['POST'])
def marcar_leidos():
    datos = request.get_json()
    conn = None
    cur = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        conn.autocommit = True
        cur = conn.cursor()
        
        id_usuario_actual = obtener_id_usuario(cur, datos.get('usuario_actual'))
        id_contacto = obtener_id_usuario(cur, datos.get('contacto'))
        
        if id_usuario_actual and id_contacto:
            # Marcamos como leídos los mensajes donde el contacto es el remitente y yo soy el destinatario
            cur.execute("""
                UPDATE Mensajes 
                SET leido = TRUE 
                WHERE id_remitente = %s AND id_destinatario = %s AND leido = FALSE
            """, (id_contacto, id_usuario_actual))
            
        return jsonify({"exito": True})
    except Exception as e:
        return jsonify({"exito": False, "mensaje": str(e)})
    finally:
        if cur: cur.close()
        if conn: conn.close()


@app.route('/api/unirse_club', methods=['POST'])
def unirse_club():
    datos = request.get_json()
    conn = None
    cur = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        conn.autocommit = True
        cur = conn.cursor()
        
        id_user = obtener_id_usuario(cur, datos.get('username'))
        id_club = datos.get('id_club')
        
        cur.execute("SELECT estado_solicitud FROM Miembros_Club WHERE id_club=%s AND id_usuario=%s", (id_club, id_user))
        existente = cur.fetchone()
        if existente:
            estado_actual = existente[0] if isinstance(existente, tuple) else existente['estado_solicitud']
            return jsonify({"exito": False, "mensaje": f"Ya tienes una solicitud con estado: {estado_actual}"})
            
        cur.execute("INSERT INTO Miembros_Club (id_club, id_usuario, estado_solicitud) VALUES (%s, %s, 'Pendiente')", (id_club, id_user))
        return jsonify({"exito": True})
    except Exception as e:
        return jsonify({"exito": False, "mensaje": str(e)})
    finally:
        if cur: cur.close()
        if conn: conn.close()

@app.route('/api/resolver_solicitud', methods=['POST'])
def resolver_solicitud():
    datos = request.get_json()
    conn = None
    cur = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        conn.autocommit = True
        cur = conn.cursor()
        cur.execute("UPDATE Miembros_Club SET estado_solicitud=%s WHERE id_club=%s AND id_usuario=%s", 
                    (datos.get('estado'), datos.get('id_club'), datos.get('id_usuario')))
        return jsonify({"exito": True})
    except Exception as e:
        return jsonify({"exito": False, "mensaje": str(e)})
    finally:
        if cur: cur.close()
        if conn: conn.close()

@app.route('/api/miembros_club', methods=['POST'])
def miembros_club():
    datos = request.get_json()
    conn = None
    cur = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
            SELECT u.username, u.nombre_completo, u.foto_perfil_url 
            FROM Miembros_Club mc
            JOIN Usuarios u ON mc.id_usuario = u.id_usuario
            WHERE mc.id_club = %s AND mc.estado_solicitud = 'Aceptado'
        """, (datos.get('id_club'),))
        miembros = cur.fetchall()
        return jsonify({"exito": True, "miembros": [dict(r) for r in miembros]})
    except Exception as e:
        return jsonify({"exito": False, "mensaje": str(e)})
    finally:
        if cur: cur.close()
        if conn: conn.close()

@app.route('/api/responder_invitacion_autor', methods=['POST'])
def responder_invitacion_autor():
    datos = request.get_json()
    conn = None
    cur = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        conn.autocommit = True
        cur = conn.cursor()
        
        estado = "Confirmada" if datos.get('aceptado') else "Rechazada"
        cur.execute("UPDATE Clubes SET estado_asistencia_autor = %s WHERE id_club = %s", (estado, datos.get('id_club')))
        
        return jsonify({"exito": True})
    except Exception as e:
        return jsonify({"exito": False, "mensaje": str(e)})
    finally:
        if cur: cur.close()
        if conn: conn.close()

@app.route('/api/marcar_evento_autor_terminado', methods=['POST'])
def marcar_evento_autor_terminado():
    data = request.json
    conn = None
    cur = None
    try:
        # ¡Estas son las líneas que faltaban para abrir la base de datos!
        conn = psycopg2.connect(**DB_CONFIG)
        conn.autocommit = True
        cur = conn.cursor()
        
        # Actualizamos el estado del autor a 'Terminada'
        cur.execute("""
            UPDATE Clubes 
            SET estado_asistencia_autor = 'Terminada' 
            WHERE id_club = %s
        """, (data['id_club'],))
        
        return jsonify({'exito': True, 'mensaje': 'Evento enviado al historial.'})
    except Exception as e:
        return jsonify({'exito': False, 'mensaje': str(e)})
    finally:
        if cur: cur.close()
        if conn: conn.close()


@app.route('/api/pedir_reserva', methods=['POST'])
def pedir_reserva():
    datos = request.get_json()
    conn = None
    cur = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        conn.autocommit = True
        cur = conn.cursor()

        id_org = obtener_id_usuario(cur, datos.get('username'))
        id_sede = obtener_id_usuario(cur, datos.get('sede_username'))

        if not id_org or not id_sede:
            return jsonify({"exito": False, "mensaje": "Usuario o Sede no encontrados."})

        # Aquí ya atrapamos el total guardado en memoria (%s en vez del 0 fijo)
        query = """
            INSERT INTO Eventos (nombre_evento, id_organizador, id_sede, fecha_hora, asistentes_esperados, estado, total_acordado, notas)
            VALUES (%s, %s, %s, %s, %s, 'Pendiente', %s, %s)
        """
        cur.execute(query, (datos.get('nombre'), id_org, id_sede, datos.get('fecha'), int(datos.get('personas')), float(datos.get('total', 0)), datos.get('notas')))
        return jsonify({"exito": True, "mensaje": "Reserva solicitada."})
    except Exception as e:
        return jsonify({"exito": False, "mensaje": str(e)})
    finally:
        if cur: cur.close()
        if conn: conn.close()

@app.route('/api/responder_reserva', methods=['POST'])
def responder_reserva():
    datos = request.get_json()
    conn = None
    cur = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        conn.autocommit = True
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        id_evento = datos.get('id_evento')
        aceptado = datos.get('aceptado')
        abono = float(datos.get('abono', 0))
        
        if aceptado:
            cur.execute("SELECT total_acordado, id_organizador, id_sede FROM Eventos WHERE id_evento = %s", (id_evento,))
            ev = cur.fetchone()
            if not ev: return jsonify({"exito": False, "mensaje": "Evento no encontrado."})
            
            total = float(ev['total_acordado'] or 0)
            if abono >= total and total > 0: estado = 'Liquidado / Pagado'
            elif abono > 0: estado = 'En Proceso'
            else: estado = 'Pendiente de Anticipo'
                
            cur.execute("UPDATE Eventos SET estado = %s, abono_recibido = %s WHERE id_evento = %s", (estado, abono, id_evento))
            cur.execute("""
                UPDATE Cotizaciones 
                SET estado = 'Eliminada' 
                WHERE id_organizador = %s AND id_sede = %s AND estado = 'Aceptada'
            """, (ev['id_organizador'], ev['id_sede']))
            
        else:
            cur.execute("UPDATE Eventos SET estado = 'Cancelado' WHERE id_evento = %s", (id_evento,))
            
        return jsonify({"exito": True})
    except Exception as e:
        return jsonify({"exito": False, "mensaje": str(e)})
    finally:
        if cur: cur.close()
        if conn: conn.close()

@app.route('/api/pedir_cotizacion', methods=['POST'])
def pedir_cotizacion():
    datos = request.get_json()
    conn = None
    cur = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        conn.autocommit = True
        cur = conn.cursor()
        
        id_org = obtener_id_usuario(cur, datos.get('username'))
        id_sede = obtener_id_usuario(cur, datos.get('sede_username'))
        
        if not id_org or not id_sede:
            return jsonify({"exito": False, "mensaje": "Usuario o Sede no encontrados."})

        query = """
            INSERT INTO Cotizaciones (id_organizador, id_sede, concepto, personas, fecha_evento)
            VALUES (%s, %s, %s, %s, %s)
        """
        cur.execute(query, (id_org, id_sede, datos.get('concepto'), int(datos.get('personas')), datos.get('fecha')))
        return jsonify({"exito": True, "mensaje": "Cotización solicitada con éxito."})
    except Exception as e:
        return jsonify({"exito": False, "mensaje": str(e)})
    finally:
        if cur: cur.close()
        if conn: conn.close()

@app.route('/api/responder_cotizacion', methods=['POST'])
def responder_cotizacion():
    datos = request.get_json()
    conn = None
    cur = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        conn.autocommit = True
        cur = conn.cursor()
        
        # Combinamos la info general de la sede y las notas para mandarlo completito al organizador
        notas_completas = f"=== INFO GENERAL ===\n{datos.get('info_general')}\n\n=== NOTAS ADICIONALES ===\n{datos.get('notas')}"
        
        query = """
            UPDATE Cotizaciones
            SET precio_estimado = %s, precio_persona = %s, notas_sede = %s, estado = 'Respondida'
            WHERE id_cotizacion = %s
        """
        cur.execute(query, (float(datos.get('precio')), float(datos.get('precio_persona')), notas_completas, datos.get('id_cotizacion')))
        return jsonify({"exito": True, "mensaje": "Cotización respondida."})
    except Exception as e:
        return jsonify({"exito": False, "mensaje": str(e)})
    finally:
        if cur: cur.close()
        if conn: conn.close()

@app.route('/api/resolver_cotizacion', methods=['POST'])
def resolver_cotizacion():
    datos = request.get_json()
    conn = None
    cur = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        conn.autocommit = True
        cur = conn.cursor()
        
        id_cotizacion = datos.get('id_cotizacion')
        aceptado = datos.get('aceptado')
        estado = 'Aceptada' if aceptado else 'Rechazada'
        
        cur.execute("UPDATE Cotizaciones SET estado = %s WHERE id_cotizacion = %s", (estado, id_cotizacion))
        
        id_tarea_nueva = None
        texto_tarea = None
        
        if aceptado:
            # Traemos también c.fecha_evento
            cur.execute("""
                SELECT c.id_organizador, u.username, u.nombre_completo, c.precio_estimado, c.personas, c.fecha_evento
                FROM Cotizaciones c
                JOIN Usuarios u ON c.id_sede = u.id_usuario
                WHERE c.id_cotizacion = %s
            """, (id_cotizacion,))
            info = cur.fetchone()
            
            if info:
                id_org = info['id_organizador'] if isinstance(info, dict) else info[0]
                sede_user = info['username'] if isinstance(info, dict) else info[1]
                sede_nombre = info['nombre_completo'] if isinstance(info, dict) else info[2]
                precio = info['precio_estimado'] if isinstance(info, dict) else info[3]
                personas = info['personas'] if isinstance(info, dict) else info[4]
                fecha_evento = info['fecha_evento'] if isinstance(info, dict) else info[5]
                
                # Ocultamos la fecha al final del string para que el JS la agarre
                texto_tarea = f"Formalizar reserva con la sede {sede_nombre} por ${precio}|RESERVA|{sede_user}|{precio}|{personas}|{fecha_evento}"
                cur.execute("INSERT INTO Tareas_Organizador (id_organizador, texto) VALUES (%s, %s) RETURNING id_tarea", (id_org, texto_tarea))
                id_tarea_nueva = cur.fetchone()
                id_tarea_nueva = id_tarea_nueva['id_tarea'] if isinstance(id_tarea_nueva, dict) else id_tarea_nueva[0]
        
        return jsonify({
            "exito": True, 
            "mensaje": f"Cotización {estado.lower()}.",
            "id_tarea": id_tarea_nueva,
            "texto_tarea": texto_tarea
        })
    except Exception as e:
        return jsonify({"exito": False, "mensaje": str(e)})
    finally:
        if cur: cur.close()
        if conn: conn.close()

@app.route('/api/eliminar_cotizacion', methods=['POST'])
def eliminar_cotizacion():
    datos = request.get_json()
    conn = None
    cur = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        conn.autocommit = True
        cur = conn.cursor()
        cur.execute("UPDATE Cotizaciones SET estado = 'Eliminada' WHERE id_cotizacion = %s", (datos.get('id_cotizacion'),))
        return jsonify({"exito": True, "mensaje": "Cotización eliminada del historial."})
    except Exception as e:
        return jsonify({"exito": False, "mensaje": str(e)})
    finally:
        if cur: cur.close()
        if conn: conn.close()

@app.route('/api/guardar_nota', methods=['POST'])
def guardar_nota():
    datos = request.get_json()
    conn = None
    cur = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        conn.autocommit = True
        cur = conn.cursor()
        
        id_user = obtener_id_usuario(cur, datos.get('username'))
        query = "INSERT INTO Notas_Personales (id_usuario, contexto, nombre_referencia, contenido) VALUES (%s, %s, %s, %s)"
        cur.execute(query, (id_user, 'general', datos.get('club'), datos.get('contenido')))
        return jsonify({"exito": True, "mensaje": "Nota guardada."})
    except Exception as e:
        return jsonify({"exito": False, "mensaje": str(e)})
    finally:
        if cur: cur.close()
        if conn: conn.close()

@app.route('/api/agregar_lectura', methods=['POST'])
def agregar_lectura():
    datos = request.get_json()
    conn = None
    cur = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        conn.autocommit = True
        cur = conn.cursor()
        
        id_user = obtener_id_usuario(cur, datos.get('username'))
        id_libro = datos.get('id_libro')
        
        cur.execute("SELECT * FROM Lecturas_Usuario WHERE id_usuario = %s AND id_libro = %s", (id_user, id_libro))
        if cur.fetchone():
            return jsonify({"exito": False, "mensaje": "Este libro ya está en tu lista."})
            
        cur.execute("INSERT INTO Lecturas_Usuario (id_usuario, id_libro, estado) VALUES (%s, %s, 'por_leer')", (id_user, id_libro))
        return jsonify({"exito": True, "mensaje": "Añadido a próximas lecturas."})
    except Exception as e:
        return jsonify({"exito": False, "mensaje": str(e)})
    finally:
        if cur: cur.close()
        if conn: conn.close()

@app.route('/api/editar_lectura', methods=['POST'])
def editar_lectura():
    datos = request.get_json()
    conn = None
    cur = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        conn.autocommit = True
        cur = conn.cursor()
        
        id_user = obtener_id_usuario(cur, datos.get('username'))
        id_libro = datos.get('id_libro')
        titulo = datos.get('titulo')
        
        if not id_libro:
            cur.execute("SELECT id_libro FROM Libros WHERE titulo = %s", (titulo,))
            libro_existente = cur.fetchone()
            if libro_existente:
                id_libro = libro_existente[0]
            else:
                cur.execute("INSERT INTO Libros (titulo, nombre_autor_externo, paginas) VALUES (%s, %s, %s) RETURNING id_libro", 
                            (titulo, datos.get('autor'), datos.get('totales')))
                id_libro = cur.fetchone()[0]

        estado = 'terminado' if int(datos.get('leidas')) == int(datos.get('totales')) else 'leyendo'
        
        cur.execute("SELECT id_lectura FROM Lecturas_Usuario WHERE id_usuario = %s AND id_libro = %s", (id_user, id_libro))
        lectura_existente = cur.fetchone()
        
        if lectura_existente:
            cur.execute("UPDATE Lecturas_Usuario SET paginas_leidas = %s, estado = %s WHERE id_lectura = %s", 
                        (datos.get('leidas'), estado, lectura_existente[0]))
        else:
            cur.execute("INSERT INTO Lecturas_Usuario (id_usuario, id_libro, paginas_leidas, estado) VALUES (%s, %s, %s, %s)",
                        (id_user, id_libro, datos.get('leidas'), estado))
        return jsonify({"exito": True, "id_libro": id_libro})
    except Exception as e:
        return jsonify({"exito": False, "mensaje": str(e)})
    finally:
        if cur: cur.close()
        if conn: conn.close()

@app.route('/api/agregar_tarea', methods=['POST'])
def agregar_tarea():
    datos = request.get_json()
    conn = None
    cur = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        conn.autocommit = True
        cur = conn.cursor()
        
        id_user = obtener_id_usuario(cur, datos.get('username'))
        cur.execute("INSERT INTO Tareas_Organizador (id_organizador, texto) VALUES (%s, %s) RETURNING id_tarea", (id_user, datos.get('texto')))
        id_tarea = cur.fetchone()[0]
        return jsonify({"exito": True, "id_tarea": id_tarea})
    except Exception as e:
        return jsonify({"exito": False, "mensaje": f"Error BD: {str(e)}"})
    finally:
        if cur: cur.close()
        if conn: conn.close()

@app.route('/api/editar_tarea', methods=['POST'])
def editar_tarea():
    datos = request.get_json()
    conn = None
    cur = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        conn.autocommit = True
        cur = conn.cursor()
        cur.execute("UPDATE Tareas_Organizador SET texto = %s WHERE id_tarea = %s", (datos.get('texto'), datos.get('id_tarea')))
        return jsonify({"exito": True})
    except Exception as e:
        return jsonify({"exito": False, "mensaje": str(e)})
    finally:
        if cur: cur.close()
        if conn: conn.close()

@app.route('/api/marcar_tarea', methods=['POST'])
def marcar_tarea():
    datos = request.get_json()
    conn = None
    cur = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        conn.autocommit = True
        cur = conn.cursor()
        cur.execute("UPDATE Tareas_Organizador SET estado = 'Hecho' WHERE id_tarea = %s", (datos.get('id_tarea'),))
        return jsonify({"exito": True})
    except Exception as e:
        return jsonify({"exito": False, "mensaje": str(e)})
    finally:
        if cur: cur.close()
        if conn: conn.close()

@app.route('/api/editar_club', methods=['POST'])
def editar_club():
    datos = request.get_json()
    conn = None
    cur = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        conn.autocommit = True
        cur = conn.cursor()
        
        id_org = obtener_id_usuario(cur, datos.get('username'))
        id_autor_invitado = obtener_id_autor(cur, datos.get('autor'))
        
        query = """
            UPDATE Clubes 
            SET tematica=%s, estado_asistencia_autor=%s, modalidad=%s, estado_pago_sede=%s, abono_sede=%s, cupo_maximo=%s, horario_texto=%s, enlace_online=%s, nombre_autor_asignado=%s, libro_actual=%s, id_autor_invitado=%s
            WHERE nombre=%s AND id_organizador=%s
        """
        cur.execute(query, (
            datos.get('tematica'), datos.get('estadoAutor'), datos.get('modalidad'), datos.get('estadoSede'), 
            float(datos.get('abono')), int(datos.get('cupo')), datos.get('horario'), datos.get('sede'), datos.get('autor'), datos.get('libro_actual'), id_autor_invitado, datos.get('nombre'), id_org
        ))
        return jsonify({"exito": True, "mensaje": "Club actualizado correctamente."})
    except Exception as e:
        return jsonify({"exito": False, "mensaje": str(e)})
    finally:
        if cur: cur.close()
        if conn: conn.close()

@app.route('/api/editar_sede', methods=['POST'])
def editar_sede():
    datos = request.get_json()
    conn = None
    cur = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        conn.autocommit = True
        cur = conn.cursor()
        
        query = """
            UPDATE Sedes_Info
            SET capacidad_minima = %s, capacidad_maxima = %s, precio_persona = %s, amenidades = %s, promociones = %s, cuenta_bancaria = %s
            WHERE id_usuario = (SELECT id_usuario FROM Usuarios WHERE username = %s)
        """
        cur.execute(query, (
            int(datos.get('cupoMin')), int(datos.get('cupoMax')), float(datos.get('precio')),
            datos.get('amenidades'), datos.get('promociones'), datos.get('cuentaBancaria'), datos.get('username')
        ))
        return jsonify({"exito": True, "mensaje": "Información de sede actualizada."})
    except Exception as e:
        return jsonify({"exito": False, "mensaje": str(e)})
    finally:
        if cur: cur.close()
        if conn: conn.close()

@app.route('/api/editar_evento_sede', methods=['POST'])
def editar_evento_sede():
    datos = request.get_json()
    conn = None
    cur = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        conn.autocommit = True
        cur = conn.cursor()
        
        id_sede = obtener_id_usuario(cur, datos.get('username'))
        
        query = """
            UPDATE Eventos
            SET asistentes_esperados=%s, estado=%s, total_acordado=%s, abono_recibido=%s
            WHERE nombre_evento=%s AND id_sede=%s
        """
        cur.execute(query, (
            int(datos.get('personas')), datos.get('estado'), float(datos.get('total')), 
            float(datos.get('abono')), datos.get('nombre'), id_sede
        ))
        return jsonify({"exito": True, "mensaje": "Evento actualizado correctamente."})
    except Exception as e:
        return jsonify({"exito": False, "mensaje": str(e)})
    finally:
        if cur: cur.close()
        if conn: conn.close()


@app.route('/api/pedir_comprobante', methods=['POST'])
def pedir_comprobante():
    datos = request.get_json()
    conn = None
    cur = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        conn.autocommit = True
        cur = conn.cursor()
        
        sede_usr = datos.get('sede_username')
        org_usr = datos.get('org_username')
        evento = datos.get('evento')
        
        # Obtenemos los datos de la sede
        cur.execute("SELECT id_usuario, nombre_completo FROM Usuarios WHERE username = %s", (sede_usr,))
        sede_data = cur.fetchone()
        if not sede_data: return jsonify({"exito": False, "mensaje": "Sede no encontrada"})
        id_sede, sede_nombre = sede_data[0], sede_data[1]
        
        # Obtenemos los datos del organizador
        cur.execute("SELECT id_usuario FROM Usuarios WHERE username = %s", (org_usr,))
        org_data = cur.fetchone()
        if not org_data: return jsonify({"exito": False, "mensaje": "Organizador no encontrado"})
        id_org = org_data[0]
        
        # 1. Crear el mensaje automático en el Chat
        mensaje = f"Hola, para poder confirmar y programar tu evento '{evento}', necesito que me envíes por aquí el comprobante de pago del anticipo (50%). ¡Quedo al pendiente!"
        cur.execute("INSERT INTO Mensajes (id_remitente, id_destinatario, contenido) VALUES (%s, %s, %s)", 
                    (id_sede, id_org, mensaje))
                    
        # 2. Crear la Tarea en el panel del Organizador
        texto_tarea = f"Enviar comprobante de pago a la sede {sede_nombre} para el evento: {evento}"
        cur.execute("INSERT INTO Tareas_Organizador (id_organizador, texto) VALUES (%s, %s)", (id_org, texto_tarea))
        
        return jsonify({"exito": True})
    except Exception as e:
        return jsonify({"exito": False, "mensaje": str(e)})
    finally:
        if cur: cur.close()
        if conn: conn.close()


@app.route('/api/marcar_leidos_club', methods=['POST'])
def marcar_leidos_club():
    datos = request.get_json()
    conn = None
    cur = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        conn.autocommit = True
        cur = conn.cursor()
        
        id_usuario = obtener_id_usuario(cur, datos.get('usuario_actual'))
        nombre_club = datos.get('nombre_club')
        
        if id_usuario and nombre_club:
            # Primero obtenemos el id_club usando el nombre
            cur.execute("SELECT id_club FROM Clubes WHERE nombre = %s LIMIT 1", (nombre_club,))
            club = cur.fetchone()
            
            if club:
                id_club = club[0] if isinstance(club, tuple) else club['id_club']
                
                # Insertamos el acceso, si ya existe lo actualizamos a la hora actual
                cur.execute("""
                    INSERT INTO Accesos_Chat_Club (id_club, id_usuario, ultimo_acceso)
                    VALUES (%s, %s, CURRENT_TIMESTAMP)
                    ON CONFLICT (id_club, id_usuario) 
                    DO UPDATE SET ultimo_acceso = CURRENT_TIMESTAMP
                """, (id_club, id_usuario))
                
        return jsonify({"exito": True})
    except Exception as e:
        return jsonify({"exito": False, "mensaje": str(e)})
    finally:
        if cur: cur.close()
        if conn: conn.close()

@app.route('/api/resenas_libro', methods=['POST'])
def resenas_libro():
    datos = request.get_json()
    conn = None
    cur = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
            SELECT r.calificacion, r.comentario, u.username 
            FROM Resenas r 
            JOIN Usuarios u ON r.id_usuario = u.id_usuario 
            WHERE r.id_libro = %s 
            ORDER BY r.fecha_publicacion DESC
        """, (datos.get('id_libro'),))
        return jsonify({"exito": True, "resenas": [dict(row) for row in cur.fetchall()]})
    except Exception as e:
        return jsonify({"exito": False, "mensaje": str(e)})
    finally:
        if cur: cur.close()
        if conn: conn.close()

@app.route('/api/crear_resena', methods=['POST'])
def crear_resena():
    datos = request.get_json()
    conn = None
    cur = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        # Quitamos el autocommit para tomar el control total de la transacción
        cur = conn.cursor()
        
        id_user = obtener_id_usuario(cur, datos.get('username'))
        # Validación extra de seguridad:
        if not id_user:
            return jsonify({"exito": False, "mensaje": "Error: Usuario no encontrado en la BD."})

        id_libro = datos.get('id_libro')
        if not id_libro:
             return jsonify({"exito": False, "mensaje": "Error: No se detectó el ID del libro."})

        calificacion = int(datos.get('calificacion'))
        comentario = datos.get('comentario')
        
        # Insertamos la reseña o la actualizamos si ya existía
        cur.execute("""
            INSERT INTO Resenas (id_usuario, id_libro, calificacion, comentario)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (id_usuario, id_libro) 
            DO UPDATE SET calificacion = EXCLUDED.calificacion, comentario = EXCLUDED.comentario
        """, (id_user, id_libro, calificacion, comentario))
        
        # ¡LÍNEA MÁGICA! Aquí forzamos a que se guarde de verdad en el disco duro de PostgreSQL
        conn.commit()
        
        return jsonify({"exito": True, "mensaje": "¡Reseña publicada con éxito!"})
    except Exception as e:
        # Si algo falla, cancelamos la operación para que no haya datos corruptos
        if conn: 
            conn.rollback()
        return jsonify({"exito": False, "mensaje": str(e)})
    finally:
        if cur: cur.close()
        if conn: conn.close()

@app.route('/api/enviar_propuesta_autor', methods=['POST'])
def enviar_propuesta_autor():
    datos = request.get_json()
    conn = None
    cur = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        conn.autocommit = True
        cur = conn.cursor()
        
        # 1. Guardar los detalles de la propuesta logística
        cur.execute("""
            INSERT INTO Propuestas_Autor (id_club, id_autor, formato, fecha, hora, sede_nombre, pais, municipio, ciudad)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (datos['id_club'], datos['id_autor'], datos['formato'], datos['fecha'], datos['hora'], datos['sede'], datos['pais'], datos['municipio'], datos['ciudad']))
        
        # 2. Actualizar el club del organizador para que se refleje de inmediato
        cur.execute("""
            UPDATE Clubes 
            SET id_autor_invitado = %s, estado_asistencia_autor = 'Pendiente', nombre_autor_asignado = %s
            WHERE id_club = %s
        """, (datos['id_autor'], datos['autor_nombre'], datos['id_club']))
        
        return jsonify({"exito": True, "mensaje": "¡Propuesta de evento enviada al autor!"})
    except Exception as e:
        return jsonify({"exito": False, "mensaje": str(e)})
    finally:
        if cur: cur.close()
        if conn: conn.close()

@app.route('/api/terminar_club', methods=['POST'])
def terminar_club():
    datos = request.get_json()
    id_club = datos.get('id_club')
    
    conn = None
    cur = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        
        # Le decimos a la base de datos que este club ya llegó a su fin
        # (Si te da error esta línea en la terminal negra, avísame y te digo cómo crear la columna 'estado_club')
        cur.execute("UPDATE Clubes SET estado_club = 'Terminado' WHERE id_club = %s", (id_club,))
        conn.commit()
        
        return jsonify({"exito": True, "mensaje": "¡Club finalizado con éxito!"})
    except Exception as e:
        if conn: conn.rollback()
        return jsonify({"exito": False, "mensaje": str(e)})
    finally:
        if cur: cur.close()
        if conn: conn.close()

if __name__ == '__main__':
    print("\n🚀 Iniciando servidor para BiblioRed...")
    app.run(port=5000)