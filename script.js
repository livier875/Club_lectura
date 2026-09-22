const monitoGris = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23999'><path d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/></svg>";

let baseDeDatos = {};
let usuarioActual = null;
let chatActualDestino = null;
let chatActualEsClub = false; 
let listaContactosGlobal = [];

let listaClubesGlobal = [];
let listaLibrosGlobal = []; 
let listaSedesGlobal = [];
let cotizacionesSede = []; 
let reservasSede = []; 

let proximasLecturasLista = [];
let lecturasActuales = [];
let lecturasTerminadas = [];
let librosPublicadosAutor = [];
let invitacionesAutor = []; 
let eventosSedeLista = [];
let datosSede = {};
let notasGlobales = {};
let accionesOrgPendientes = []; 
let contadores = { notificaciones: 0, mensajes: 0 };
let expandirSolicitudes = false;
let fechaActualCalendarioSede = new Date();
let lecturaEditandoIndex = -1;
let indexLibroAutorEditando = -1;
let indexEventoSedeEditando = -1;
let tarjetaClubEditando = null;
let clubActualParaNota = "";

// ==========================================
// DICCIONARIO DE UBICACIONES
// ==========================================
window.ubicacionesCascada = {
    "México": {
        "Guadalajara": ["Centro", "Providencia", "Chapultepec", "Oblatos", "Tlaquepaque", "Zapopan"],
        "Ciudad de México": ["Coyoacán", "Polanco", "Condesa", "Roma", "Centro Histórico"],
        "Monterrey": ["San Pedro", "Cumbres", "Centro", "San Nicolás"]
    },
    "Colombia": {
        "Bogotá": ["Chapinero", "Usaquén", "Teusaquillo", "Suba"],
        "Medellín": ["El Poblado", "Laureles", "Envigado", "Bello"]
    },
    "España": {
        "Madrid": ["Salamanca", "Chamberí", "Malasaña", "Centro"],
        "Barcelona": ["Eixample", "Gràcia", "El Raval", "Sants"]
    },
    "Argentina": {
        "Buenos Aires": ["Palermo", "Recoleta", "San Telmo", "Belgrano"],
        "Córdoba": ["Centro", "Nueva Córdoba", "General Paz"]
    }
};

// ==========================================
// FUNCIONES DE ACTUALIZACIÓN DE CIUDADES
// ==========================================
window.actualizarCiudades = function() {
    let pais = document.getElementById("invitar-pais").value;
    let selectCiudad = document.getElementById("invitar-ciudad");
    let selectMunicipio = document.getElementById("invitar-municipio");
    if(!selectCiudad) return;
    selectCiudad.innerHTML = '<option value="">Selecciona Ciudad...</option>';
    if(selectMunicipio) selectMunicipio.innerHTML = '<option value="">Selecciona Municipio...</option>';
    if (pais && window.ubicacionesCascada[pais]) {
        for (let ciudad in window.ubicacionesCascada[pais]) {
            selectCiudad.innerHTML += `<option value="${ciudad}">${ciudad}</option>`;
        }
    }
};

window.actualizarMunicipios = function() {
    let pais = document.getElementById("invitar-pais").value;
    let ciudad = document.getElementById("invitar-ciudad").value;
    let selectMunicipio = document.getElementById("invitar-municipio");
    if(!selectMunicipio) return;
    selectMunicipio.innerHTML = '<option value="">Selecciona Municipio...</option>';
    if (pais && ciudad && window.ubicacionesCascada[pais][ciudad]) {
        window.ubicacionesCascada[pais][ciudad].forEach(mun => {
            selectMunicipio.innerHTML += `<option value="${mun}">${mun}</option>`;
        });
    }
};

window.actualizarCiudadesEdicion = function() {
    let pais = document.getElementById("editar-propuesta-pais").value;
    let selectCiudad = document.getElementById("editar-propuesta-ciudad");
    let selectMunicipio = document.getElementById("editar-propuesta-municipio");
    if(!selectCiudad) return;
    selectCiudad.innerHTML = '<option value="">Selecciona Ciudad...</option>';
    if(selectMunicipio) selectMunicipio.innerHTML = '<option value="">Selecciona Municipio...</option>';
    if (pais && window.ubicacionesCascada[pais]) {
        for (let ciudad in window.ubicacionesCascada[pais]) { 
            selectCiudad.innerHTML += `<option value="${ciudad}">${ciudad}</option>`; 
        }
    }
};

window.actualizarMunicipiosEdicion = function() {
    let pais = document.getElementById("editar-propuesta-pais").value;
    let ciudad = document.getElementById("editar-propuesta-ciudad").value;
    let selectMunicipio = document.getElementById("editar-propuesta-municipio");
    if(!selectMunicipio) return;
    selectMunicipio.innerHTML = '<option value="">Selecciona Municipio...</option>';
    if (pais && ciudad && window.ubicacionesCascada[pais][ciudad]) {
        window.ubicacionesCascada[pais][ciudad].forEach(mun => { 
            selectMunicipio.innerHTML += `<option value="${mun}">${mun}</option>`; 
        });
    }
};

// Variable en memoria para no perder el total acordado
window.precioReservaMemoria = 0;

function mostrarAlerta(mensaje) { alert(mensaje); }
// ==========================================
// LÓGICA DEL BUSCADOR GLOBAL INTELIGENTE
// ==========================================
window.ejecutarBusqueda = function() {
    let input = document.getElementById('input-busqueda').value.toLowerCase().trim();
    if(input === "") { alert("Por favor ingresa un término de búsqueda."); return; }
    
    let contClubes = document.getElementById('resultados-clubes');
    let contLibros = document.getElementById('resultados-libros');
    if(!contClubes || !contLibros) return;
    
    contClubes.innerHTML = '';
    contLibros.innerHTML = '';
    
    // Filtramos los clubes
    let clubesEncontrados = listaClubesGlobal.filter(c => 
        c.nombre.toLowerCase().includes(input) || 
        (c.tematica && c.tematica.toLowerCase().includes(input)) ||
        (c.organizador && c.organizador.toLowerCase().includes(input))
    );
    
    // Filtramos los libros
    let librosEncontrados = listaLibrosGlobal.filter(l => 
        l.titulo.toLowerCase().includes(input) || 
        (l.autor && l.autor.toLowerCase().includes(input)) ||
        (l.genero && l.genero.toLowerCase().includes(input))
    );
    
    // Pintamos los clubes
    if(clubesEncontrados.length === 0) contClubes.innerHTML = '<p style="font-size:0.85rem; color:#888;">No se encontraron clubes relacionados.</p>';
    else {
        clubesEncontrados.forEach(c => {
            contClubes.innerHTML += `
            <div style="background: #fdfdfd; padding: 10px 15px; border-left: 3px solid var(--accent-orange); border-radius: 4px; display:flex; justify-content:space-between; align-items:center; box-shadow: 0 1px 3px rgba(0,0,0,0.05); margin-bottom: 5px;">
                <div>
                    <strong style="color:var(--header-bg);">${c.nombre}</strong><br>
                    <small style="color:#666;">Organiza: ${c.organizador} | Temática: ${c.tematica}</small>
                </div>
                <button class="btn-outline req-auth" style="padding: 4px 10px; font-size: 0.75rem; margin:0;" onclick="unirmeAlClub(${c.id_club}, '${c.nombre.replace(/'/g, "\\'")}')"><i class="fas fa-plus"></i> Unirme</button>
            </div>`;
        });
    }
    
    // Pintamos los libros
    if(librosEncontrados.length === 0) contLibros.innerHTML = '<p style="font-size:0.85rem; color:#888;">No se encontraron libros relacionados.</p>';
    else {
        librosEncontrados.forEach(l => {
            contLibros.innerHTML += `
            <div style="background: #fdfdfd; padding: 10px 15px; border-left: 3px solid #3498db; border-radius: 4px; display:flex; justify-content:space-between; align-items:center; box-shadow: 0 1px 3px rgba(0,0,0,0.05); margin-bottom: 5px;">
                <div>
                    <strong style="color:var(--header-bg);">${l.titulo}</strong><br>
                    <small style="color:#666;">Autor: ${l.autor} | ${l.genero}</small>
                </div>
                <button class="btn-outline req-lector" style="padding: 4px 10px; font-size: 0.75rem; margin:0; border-color:#3498db; color:#3498db;" onclick="agregarAProximasLecturas(${l.id_libro}, '${l.titulo.replace(/'/g, "\\'")}', '${l.autor.replace(/'/g, "\\'")}', '${l.portada_url || ''}')"><i class="fas fa-bookmark"></i> Pendiente</button>
            </div>`;
        });
    }
    
    document.getElementById('titulo-busqueda').innerText = `Resultados para "${input}"`;
    abrirModal('modal-resultados-busqueda');
    aplicarRestriccionGlobal(); 
};
function eliminarTarjeta(btn, mensaje) {
    if(mensaje) alert(mensaje);
    let tarjeta = btn.closest('.panel-box') || btn.closest('.reserva-card');
    if (tarjeta) tarjeta.style.display = 'none';
}
function navegarA(seccion) {
    document.querySelectorAll('.dashboard-view').forEach(vista => vista.classList.remove('active'));
    document.getElementById('global-' + seccion).classList.add('active');
}
function abrirModal(id) { document.getElementById(id).style.display = 'flex'; }
function cerrarModal(id) {
    document.getElementById(id).style.display = 'none';
    if(document.getElementById('login-error')) document.getElementById('login-error').style.display = 'none';
}
function mostrarPerfil(nombre, rol, ciudad, bio, telefono) {
    document.getElementById('perfil-usuario-nombre').innerText = nombre;
    document.getElementById('perfil-usuario-rol').innerText = rol;
    document.getElementById('perfil-usuario-ciudad').innerText = ciudad;
    document.getElementById('perfil-usuario-telefono').innerText = telefono || "No disponible";
    document.getElementById('perfil-usuario-bio').innerText = '"' + bio + '"';
    document.getElementById('perfil-usuario-foto').src = monitoGris;
    abrirModal('modal-perfil-usuario');
}
function toggleMenu() { document.getElementById("mi-menu").classList.toggle("mostrar-dropdown"); }
window.onclick = function(event) {
    if (!event.target.matches('.avatar-btn')) {
        let dropdowns = document.getElementsByClassName("dropdown-content");
        for (let i = 0; i < dropdowns.length; i++) {
            if (dropdowns[i].classList.contains('mostrar-dropdown')) dropdowns[i].classList.remove('mostrar-dropdown');
        }
    }
}
function cerrarSesion() { location.reload(); }

function formatearFechaISO(anio, mes, dia) { return `${anio}-${(mes + 1).toString().padStart(2, '0')}-${dia.toString().padStart(2, '0')}`; }
function obtenerEstilosEstadoAutor(estado) {
    if(estado === "Confirmada") return { bg: "#e8f5e9", color: "#27ae60" };
    if(estado === "Rechazada") return { bg: "#fceceb", color: "#e74c3c" };
    return { bg: "#fef5e7", color: "#f39c12" }; 
}
function obtenerEstilosEstadoSede(estado) {
    if(estado === "Liquidado" || estado === "Confirmada" || estado === "Liquidado / Confirmada" || estado === "Liquidado / Pagado") return { bg: "#e8f5e9", color: "#27ae60" };
    if(estado === "Abonado") return { bg: "#e0f2fe", color: "#0284c7" }; 
    if(estado === "Cancelada" || estado === "Cancelado") return { bg: "#fceceb", color: "#e74c3c" };
    return { bg: "#fef5e7", color: "#f39c12" }; 
}

// --- LOGICA DE LOGIN Y REGISTRO ---
document.getElementById('form-login').addEventListener('submit', function(e) {
    e.preventDefault(); 
    const userIngresado = document.getElementById('login-user').value.toLowerCase();
    const passIngresada = document.getElementById('login-pass').value;

    fetch('http://127.0.0.1:5000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: userIngresado, password: passIngresada })
    })
    .then(response => response.json())
    .then(data => {
        if (data.exito) {
            usuarioActual = data.usuario.username;
            baseDeDatos[usuarioActual] = data.usuario;
            
            cargarClubesGlobales();
            notasGlobales = data.datos_extra.notas || {}; 

            if(data.usuario.rol === "lector") {
                proximasLecturasLista = data.datos_extra.proximas || [];
                lecturasActuales = data.datos_extra.actuales || [];
                lecturasTerminadas = data.datos_extra.terminadas || [];
                baseDeDatos[usuarioActual].mis_clubes = data.datos_extra.mis_clubes || [];
                

                baseDeDatos[usuarioActual].mis_resenas = data.datos_extra.mis_resenas || {};
                lecturasTerminadas.forEach(libro => {
                    if (libro.calificacion !== undefined && libro.calificacion !== null) {
                        baseDeDatos[usuarioActual].mis_resenas[libro.id_libro] = {
                            calificacion: libro.calificacion,
                            comentario: libro.comentario || ""
                        };
                    }
                });
            }
            else if(data.usuario.rol === "organizador") {
                accionesOrgPendientes = (data.datos_extra.tareas || []).map(t => ({ id: t.id, tipo: 'tarea', texto: t.texto }));
                let solicitudesRecibidas = (data.datos_extra.solicitudes || []).map(s => ({ id_club: s.id_club, id_usuario: s.id_usuario, tipo: 'solicitud', nombreUser: s.nombreUser, club: s.club }));
                
                let cotizacionesRes = (data.datos_extra.cotizaciones_respondidas || []).map(c => {
                    let precioP = c.precio_persona ? ` ($${c.precio_persona} p/p)` : '';
                    return { 
                        id_cotizacion: c.id_cotizacion, 
                        tipo: 'cot_respondida', 
                        texto: `La sede <b>${c.sede_nombre}</b> respondió a tu solicitud de cotización.`,
                        sedeUsername: c.sede_username,
                        sede_nombre: c.sede_nombre,
                        precio_estimado: c.precio_estimado,
                        precio_persona: c.precio_persona,
                        notas_sede: c.notas_sede
                    };
                });
                
                accionesOrgPendientes = accionesOrgPendientes.concat(solicitudesRecibidas).concat(cotizacionesRes);
                baseDeDatos[usuarioActual].mis_clubes = data.datos_extra.mis_clubes || [];
            }
           else if(data.usuario.rol === "autor") {
                librosPublicadosAutor = data.datos_extra.libros || [];
                invitacionesAutor = data.datos_extra.invitaciones || [];
                window.eventosConfirmadosAutor = data.datos_extra.eventos_confirmados || [];
                
                window.historialEventosAutor = data.datos_extra.historial_eventos || [];
            }
            else if(data.usuario.rol === "sede") {
                if(data.datos_extra.info_sede) {
                    let info = data.datos_extra.info_sede;
                    datosSede = {
                        cupoMin: info.capacidad_minima || 0, cupoMax: info.capacidad_maxima || 0,
                        precio: info.precio_persona || 0, amenidades: info.amenidades || "No especificadas",
                        promociones: info.promociones || "No hay promociones activas",
                        cuenta: info.cuenta_bancaria || "No registrada"
                    };
                } else {
                    datosSede = { cupoMin: 0, cupoMax: 0, precio: 0, amenidades: "No especificadas", promociones: "No hay promociones activas", cuenta: "No registrada" };
                }
                eventosSedeLista = data.datos_extra.eventos || [];
                cotizacionesSede = data.datos_extra.cotizaciones_pendientes || []; 
                reservasSede = data.datos_extra.reservas_pendientes || []; 
            }

            cerrarModal('auth-modal');
            actualizarHeader(); 
            mostrarVista(baseDeDatos[usuarioActual].rol); 
            aplicarRestriccionGlobal(); 
            
            if(data.usuario.rol === "lector") {
                renderClubesLector(); 
            }
            if(data.usuario.rol === "autor") {
                renderLibrosAutor(); renderInvitacionesAutor(); 
            }
            if(data.usuario.rol === "sede") {
                renderizarPerfilSede(); renderizarCalendarioSede(); renderizarPanelesSede();
            }
            actualizarUIClubes(); 
            renderizarSedesGlobales(); 
            
        } else {
            document.getElementById('login-error').innerText = data.mensaje;
            document.getElementById('login-error').style.display = 'block';
        }
    })
    .catch(error => {
        console.error('Error:', error);
        document.getElementById('login-error').innerText = "Error: Verifica que Python siga corriendo.";
        document.getElementById('login-error').style.display = 'block';
    });
});

function cambiarFormularioRegistro() {
    const rol = document.getElementById('reg-rol').value;
    const comunes = document.getElementById('reg-campos-comunes');
    const dinamicos = document.getElementById('reg-campos-dinamicos');
    const btnSubmit = document.getElementById('btn-submit-reg');

    if (!rol) {
        comunes.style.display = 'none'; btnSubmit.style.display = 'none';
        dinamicos.innerHTML = '<p style="font-size: 0.85rem; color: #666; text-align:center;">Por favor, selecciona un rol para continuar.</p>';
        return;
    }
    comunes.style.display = 'block'; btnSubmit.style.display = 'block';
    
    let htmlDinamico = '';
    if (rol === 'usuario' || rol === 'organizador' || rol === 'escritor') {
        htmlDinamico = `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
            <div class="form-group" style="grid-column: 1 / -1; margin-bottom: 0;"><label>Nombre Completo</label><input type="text" id="reg-nombre" required></div>
            <div class="form-group" style="margin-bottom: 0;"><label>Número de Teléfono</label><input type="tel" id="reg-telefono" required></div>
            <div class="form-group" style="margin-bottom: 0;"><label>Correo Electrónico</label><input type="email" id="reg-correo" required></div>
            <div class="form-group" style="margin-bottom: 0;"><label>País</label><input type="text" id="reg-pais" required></div>
            <div class="form-group" style="margin-bottom: 10px;"><label>Ciudad</label><input type="text" id="reg-ciudad" required></div>
        </div>`;
    } else if (rol === 'sede') {
        htmlDinamico = `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
            <div class="form-group" style="grid-column: 1 / -1; margin-bottom: 0;"><label>Nombre del Lugar</label><input type="text" id="reg-nombre" required></div>
            <div class="form-group" style="margin-bottom: 0;"><label>Correo Electrónico</label><input type="email" id="reg-correo" required></div>
            <div class="form-group" style="margin-bottom: 0;"><label>Número de Teléfono</label><input type="tel" id="reg-telefono" required></div>
            <div class="form-group" style="grid-column: 1 / -1; margin-bottom: 10px;"><label>Domicilio / Dirección Completa</label><input type="text" id="reg-direccion" required></div>
        </div>`;
    }
    dinamicos.innerHTML = htmlDinamico;
}

document.getElementById('form-registro').addEventListener('submit', function(e) {
    e.preventDefault();
    let rolForm = document.getElementById('reg-rol').value;
    let rolDB = rolForm;
    if (rolForm === 'usuario') rolDB = 'lector';
    if (rolForm === 'escritor') rolDB = 'autor';

    let dataParaGuardar = {
        username: document.getElementById('reg-user').value.toLowerCase(),
        password: document.getElementById('reg-pass').value,
        rol: rolDB,
        nombre_completo: document.getElementById('reg-nombre').value,
        correo: document.getElementById('reg-correo').value,
        telefono: document.getElementById('reg-telefono').value
    };

    if (rolForm !== 'sede') {
        dataParaGuardar.pais = document.getElementById('reg-pais').value;
        dataParaGuardar.ciudad = document.getElementById('reg-ciudad').value;
    } else {
        dataParaGuardar.direccion = document.getElementById('reg-direccion').value;
    }

    fetch('http://127.0.0.1:5000/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataParaGuardar)
    }).then(r => r.json()).then(data => {
        if (data.exito) {
            alert('¡Registro exitoso! Ya puedes iniciar sesión con tu cuenta.');
            cerrarModal('register-modal'); document.getElementById('form-registro').reset(); abrirModal('auth-modal'); 
        } else {
            alert('No se pudo registrar: ' + data.mensaje);
        }
    }).catch(error => { alert("Hubo un error de conexión con el servidor."); });
});

function actualizarHeader() {
    const data = baseDeDatos[usuarioActual];
    let badgeNotif = contadores.notificaciones > 0 ? `<span class="badge">${contadores.notificaciones}</span>` : '';
    let badgeMensajes = contadores.mensajes > 0 ? `<span class="badge">${contadores.mensajes}</span>` : '';

    document.getElementById('user-status').innerHTML = `
        <div class="dropdown-container">
            <img src="${data.foto}" class="avatar-btn" onclick="toggleMenu()" id="header-avatar" alt="Perfil">
            <div id="mi-menu" class="dropdown-content">
                <div class="dropdown-header">
                    <strong id="header-nombre">${data.nombre}</strong><br>
                    <small style="color: #666; text-transform: capitalize;">${data.rol}</small>
                </div>
                <a href="#" onclick="mostrarVista('${data.rol}'); toggleMenu();"><i class="fas fa-columns"></i> Mi Panel</a>
                <a href="#" onclick="window.abrirModalEditarPerfil(); toggleMenu();"><i class="fas fa-user-edit"></i> Editar Perfil</a>
                <a href="#" onclick="abrirModal('notifications-modal'); toggleMenu();"><i class="fas fa-bell"></i> Notificaciones ${badgeNotif}</a>
                <a href="#" onclick="window.abrirBandejaMensajes(); toggleMenu();"><i class="fas fa-envelope"></i> Mensajes ${badgeMensajes}</a>
                <div class="dropdown-divider"></div>
                <a href="#" onclick="cerrarSesion()" class="logout-link"><i class="fas fa-sign-out-alt"></i> Cerrar Sesión</a>
            </div>
        </div>
    `;
}

function mostrarVista(rol) {
    document.querySelectorAll('.dashboard-view').forEach(vista => vista.classList.remove('active'));
    const vistaDestino = document.getElementById('vista-' + rol);
    if(vistaDestino) vistaDestino.classList.add('active');

    if(rol === "organizador") { 
        renderAccionesOrg(); 
        renderClubesOrganizador(); 
        if (typeof renderSeguimientoAutores === 'function') renderSeguimientoAutores(); 
    }
    else if(rol === "lector") { renderClubesLector(); renderLecturasLector(); }
    else if(rol === "autor") { 
        renderLibrosAutor(); 
        renderInvitacionesAutor(); 
        if (typeof renderEventosConfirmadosAutor === 'function') renderEventosConfirmadosAutor(); 
        if (typeof renderHistorialEventosAutor === 'function') renderHistorialEventosAutor(); 
    }
    else if(rol === "sede") { renderizarPanelesSede(); renderizarCalendarioSede(); renderizarPerfilSede(); }

    if (typeof cargarAutoresGlobales === 'function') { 
        cargarAutoresGlobales(); 
    }
}

window.abrirModalNotasLector = function(id_club) {
    let club = baseDeDatos[usuarioActual].mis_clubes.find(c => c.id_club == id_club);
    if(club) {
        window.abrirModalNotas(club.nombre, 'lector', null);
    }
};

// ==========================================
// RENDERIZAR CLUBES LECTOR (ACTIVOS E HISTORIAL)
// ==========================================
function renderClubesLector() {
    let containerActivos = document.getElementById('contenedor-clubes-lector-actuales');
    let containerHistorial = document.getElementById('contenedor-clubes-lector-historial');
    if(!containerActivos) return;
    
    containerActivos.innerHTML = '';
    if(containerHistorial) containerHistorial.innerHTML = '';

    let misClubes = baseDeDatos[usuarioActual].mis_clubes || [];
    let activos = misClubes.filter(c => c.estado_club !== 'Terminado');
    let terminados = misClubes.filter(c => c.estado_club === 'Terminado');


    if(activos.length === 0) {
        containerActivos.innerHTML = '<p style="color: #666; font-size: 0.9rem;">Aún no participas en ningún club activo.</p>'; 
    } else {
        activos.forEach((club) => {
            let imgFondo = club.portada || 'https://via.placeholder.com/400x200?text=Club';
            containerActivos.innerHTML += `<div class="club-org-card" style="flex: 1; min-width: 300px; border: 1px solid #eee; border-radius: 8px; overflow: hidden; background: white; box-shadow: 0 4px 8px rgba(0,0,0,0.05); position: relative;">
                <div style="height: 120px; background: url('${imgFondo}') center/cover; position: relative;">
                    <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5);"></div>
                    <h4 class="club-org-nombre" style="margin: 0; color: white; font-size: 1.2rem; position: absolute; bottom: 15px; left: 15px; text-shadow: 1px 1px 3px rgba(0,0,0,0.8);">${club.nombre}</h4>
                </div>
                <div style="padding: 20px;">
                    <p style="margin: 5px 0; font-size: 0.9rem;"><i class="fas fa-book" style="color: var(--accent-orange); width: 20px;"></i> Leyendo: <strong>${club.libro_actual || 'Por definir'}</strong></p>
                    <p style="margin: 5px 0; font-size: 0.9rem;"><i class="fas fa-tags" style="color: var(--accent-orange); width: 20px;"></i> Temática: ${club.tematica}</p>
                    <p style="margin: 5px 0; font-size: 0.9rem;"><i class="fas fa-user-tie" style="color: var(--accent-orange); width: 20px;"></i> Org: ${club.organizador}</p>
                    <p style="margin: 5px 0; font-size: 0.9rem;"><i class="fas fa-map-marker-alt" style="color: var(--accent-orange); width: 20px;"></i> Lugar: ${club.sede || 'No especificado'}</p>
                    <p style="margin: 5px 0; font-size: 0.9rem;"><i class="fas fa-clock" style="color: var(--accent-orange); width: 20px;"></i> Horario: ${club.horario}</p>
                    <div class="notas-dom-org" style="margin-top: 10px;"></div>
                    
                    <div style="display: flex; gap: 10px; margin-top: 15px;">
                        <button class="btn-submit" style="margin: 0; flex: 1; padding: 6px 12px; font-size: 0.85rem;" onclick="window.abrirChat(null, '${club.nombre.replace(/'/g, "\\'").replace(/"/g, '&quot;')}')"><i class="fas fa-comments"></i> Chat del Club</button>
                        <button class="btn-outline" style="margin: 0; flex: 1; padding: 6px 12px; font-size: 0.85rem;" onclick="window.abrirModalNotasLector(${club.id_club})"><i class="fas fa-sticky-note"></i> Mis Notas</button>
                    </div>
                </div>
            </div>`;
        });
    }

    if(containerHistorial) {
        if(terminados.length === 0) {
            containerHistorial.innerHTML = '<p style="color: #666; font-size: 0.9rem;">No tienes clubes en tu historial.</p>';
        } else {
            terminados.forEach((club) => {
                let imgFondo = club.portada || 'https://via.placeholder.com/400x200?text=Club';
                containerHistorial.innerHTML += `
                <div style="flex: 1; min-width: 250px; max-width: 300px; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; background: #f9f9f9; opacity: 0.8; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                    <div style="height: 90px; background: url('${imgFondo}') center/cover; position: relative; filter: grayscale(100%);">
                        <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6);"></div>
                        <h4 style="margin: 0; color: white; font-size: 1rem; position: absolute; bottom: 10px; left: 10px;">${club.nombre}</h4>
                        <span style="position: absolute; top: 10px; right: 10px; background: #e74c3c; color: white; padding: 3px 8px; border-radius: 4px; font-size: 0.7rem; font-weight: bold;">Terminado</span>
                    </div>
                    <div style="padding: 15px;">
                        <p style="margin: 5px 0; font-size: 0.85rem;"><i class="fas fa-book" style="color: #888; width: 20px;"></i> Leyeron: <strong>${club.libro_actual || 'Varios'}</strong></p>
                        <p style="margin: 5px 0; font-size: 0.85rem;"><i class="fas fa-user-tie" style="color: #888; width: 20px;"></i> Org: ${club.organizador}</p>
                        <button class="btn-outline" style="margin-top: 10px; width: 100%; padding: 6px; font-size: 0.8rem; border-color: #3498db; color: #3498db;" onclick="window.abrirModalNotasLector(${club.id_club})"><i class="fas fa-sticky-note"></i> Mis Notas Guardadas</button>
                    </div>
                </div>`;
            });
        }
    }
}

// ==========================================
// RENDERIZAR CLUBES ORGANIZADOR 
// ==========================================
function renderClubesOrganizador() {
    let container = document.getElementById('contenedor-clubes-organizador');
    if(!container) return;
    
    let misClubes = baseDeDatos[usuarioActual].mis_clubes || [];
    
    let totalLectores = 0;
    misClubes.forEach(c => totalLectores += (c.inscritos || 0));
    
    let txtClubes = document.getElementById('resumen-org-clubes');
    let txtLectores = document.getElementById('resumen-org-lectores');
    if (txtClubes) txtClubes.innerText = misClubes.length;
    if (txtLectores) txtLectores.innerText = totalLectores;
    
    container.innerHTML = '';
    if(misClubes.length === 0) {
        container.innerHTML = '<p style="color: #666; font-size: 0.9rem;">Aún no tienes clubes bajo tu gestión.</p>'; return;
    }
    
    misClubes.forEach((club, index) => {
        let numeroVisual = index + 1;
        let isTerminado = club.estado_club === 'Terminado';
        
        let colorModalidad = (club.modalidad === "Online") ? "#3498db" : "var(--accent-orange)";
        let paletaSede = obtenerEstilosEstadoSede(club.estadoSede);
        let inscritos = club.inscritos || 0;

        let paletaAutor = obtenerEstilosEstadoAutor(club.estadoAutor); 
        let textoEstadoAutor = club.estadoAutor;
        if(club.estadoAutor === 'Pendiente') textoEstadoAutor = `⏳ Esperando a ${club.autor}`;
        else if(club.estadoAutor === 'Confirmada') textoEstadoAutor = `✅ ¡Autor Confirmado!`;
        else if(club.estadoAutor === 'Rechazada') textoEstadoAutor = `❌ Invitación Declinada`;
        else textoEstadoAutor = 'Sin asignar';

        // Estilos para cuando el club se termina
        let opacity = isTerminado ? '0.85' : '1';
        let filter = isTerminado ? 'grayscale(50%)' : 'none';
        let pointer = isTerminado ? 'pointer-events: none; opacity: 0.5;' : '';
        let ribbon = isTerminado ? `<div style="background: #e74c3c; color: white; text-align: center; padding: 5px; font-weight: bold; font-size: 0.85rem; margin: -20px -20px 15px -20px; border-radius: 8px 8px 0 0;"><i class="fas fa-flag-checkered"></i> CLUB FINALIZADO (SOLO LECTURA)</div>` : '';

        let botonesHTML = isTerminado 
            ? `<button class="btn-outline" style="margin: 0; padding: 8px; font-size: 0.85rem; color: #555; border-color: #ccc; grid-column: 1 / -1;" onclick="abrirModalNotas('${club.nombre}', 'organizador', this)"><i class="fas fa-sticky-note"></i> Ver Notas Históricas</button>`
            : `<button class="btn-outline" style="margin: 0; padding: 8px; font-size: 0.85rem; color: #555; border-color: #ccc;" onclick="window.abrirModalEditarClub(${index})"><i class="fas fa-edit"></i> Editar</button>
               <button class="btn-outline" style="margin: 0; padding: 8px; font-size: 0.85rem; color: #555; border-color: #ccc;" onclick="abrirChat(null, '${club.nombre}')"><i class="fas fa-comments"></i> Chat</button>
               <button class="btn-outline" style="margin: 0; padding: 8px; font-size: 0.85rem; color: #555; border-color: #ccc;" onclick="abrirModalNotas('${club.nombre}', 'organizador', this)"><i class="fas fa-sticky-note"></i> Notas</button>
               <button class="btn-submit" style="margin: 0; padding: 8px; font-size: 0.85rem; background: #e74c3c; grid-column: 1 / -1;" onclick="window.finalizarClubOrg(${index})"><i class="fas fa-power-off"></i> Concluir Club</button>`;

        let htmlOrg = `<div class="club-org-card" style="flex: 1; min-width: 300px; border: 1px solid #eee; padding: 20px; border-radius: 8px; background: white; box-shadow: 0 4px 8px rgba(0,0,0,0.05); opacity: ${opacity}; filter: ${filter};">
            ${ribbon}
            <h4 style="margin: 0 0 15px 0; color: var(--header-bg); font-size: 1.2rem; display: flex; justify-content: space-between; align-items: center;">
                <span class="club-org-nombre">Club #${numeroVisual}: ${club.nombre}</span>
                <span class="club-org-modalidad" style="font-size: 0.8rem; background: ${colorModalidad}; color: white; padding: 4px 10px; border-radius: 12px; font-weight: normal;">${club.modalidad}</span>
            </h4>
            <div style="font-size: 0.95rem; margin-bottom: 15px; color: #333;">
                <p style="margin: 5px 0;">
                    <i class="fas fa-calendar-day" style="width: 20px; color: #555;"></i> <span class="club-org-horario">${club.horario}</span> | 
                    <i class="fas fa-users" style="margin-left: 10px; color: #555;"></i> 
                    <strong style="cursor:pointer; color:var(--accent-orange); text-decoration:underline;" onclick="verMiembrosClub(${club.id_club}, '${club.nombre}')">${inscritos}/<span class="club-org-cupo">${club.cupo}</span> Inscritos</strong>
                </p>
                <p style="margin: 5px 0;"><i class="fas fa-book" style="color: #666; width: 15px;"></i> Libro Actual: <span class="club-org-libro" style="font-weight: bold;">${club.libro_actual || 'Por definir'}</span></p>
            </div>
            <div style="background: #f9f9f9; padding: 15px; border-radius: 6px; font-size: 0.85rem;">
                <span class="club-org-tematica" style="display:none;">${club.tematica}</span>
                <p style="margin: 5px 0; color: #333;"><strong>Autor Asignado:</strong> <span class="club-org-autor">${club.autor || 'Sin asignar'}</span></p>
                <p style="margin: 5px 0;"><i class="fas fa-user-check" style="color: #666; width: 15px;"></i> Estado Autor: <span class="club-org-estado-autor" style="color: ${paletaAutor.color}; background: ${paletaAutor.bg}; font-weight: bold; padding: 2px 6px; border-radius: 4px;">${textoEstadoAutor}</span></p>
                <hr style="border: 0; border-top: 1px solid #ddd; margin: 10px 0;">
                <p style="margin: 5px 0; color: #333;"><strong>Sede:</strong> <span class="club-org-sede">${club.sede || 'No especificada'}</span></p>
                <p style="margin: 5px 0;"><i class="fas fa-building" style="color: #666; width: 15px;"></i> Reserva Sede: <span class="club-org-estado-sede" style="color: ${paletaSede.color}; background: ${paletaSede.bg}; font-weight: bold; padding: 2px 6px; border-radius: 4px;">${club.estadoSede}</span></p>
                <p style="margin: 5px 0; color: #555;"><i class="fas fa-money-bill-wave" style="color: #666; width: 15px;"></i> Abono Sede: $<span class="club-org-abono">${club.abono}</span> MXN</p>
            </div>
            <div class="notas-dom-org" style="margin-top: 10px;"></div>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-top: 15px;">
                ${botonesHTML}
            </div>
        </div>`;
        container.insertAdjacentHTML('beforeend', htmlOrg);
    });
    actualizarUIClubes(); 
}

// ==========================================
// FUNCIÓN PARA FINALIZAR EL CLUB
// ==========================================
window.finalizarClubOrg = function(index) {
    let club = baseDeDatos[usuarioActual].mis_clubes[index];
    
    if(!confirm(`¿Estás seguro de que deseas FINALIZAR el club "${club.nombre}"?\n\nEl club pasará al Historial, ya no admitirá nuevos miembros y el chat se bloqueará.`)) return;

    fetch('http://127.0.0.1:5000/api/terminar_club', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            username: usuarioActual,
            id_club: club.id_club
        })
    }).then(r => r.json()).then(res => {
        if(res.exito) {
            alert("¡El club ha sido finalizado con éxito!");
            baseDeDatos[usuarioActual].mis_clubes[index].estado_club = 'Terminado';

            renderClubesOrganizador();
            
        } else {
            alert("Error al finalizar el club: " + res.mensaje);
        }
    }).catch(err => alert("Error de conexión al finalizar el club."));
};

function verMiembrosClub(id_club, nombre_club) {
    document.getElementById('titulo-miembros-club').innerText = "Miembros - " + nombre_club;
    let lista = document.getElementById('lista-miembros-club');
    lista.innerHTML = '<p style="text-align:center; color:#666;">Cargando miembros...</p>';
    abrirModal('modal-miembros-club');
    
    fetch('http://127.0.0.1:5000/api/miembros_club', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_club: id_club })
    })
    .then(r => r.json())
    .then(data => {
        lista.innerHTML = '';
        if(data.exito && data.miembros.length > 0) {
            data.miembros.forEach(m => {
                let img = m.foto_perfil_url || monitoGris;
                lista.innerHTML += `
                    <div style="display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid #eee;">
                        <img src="${img}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">
                        <div>
                            <p style="margin: 0; font-weight: bold; color: #333;">${m.nombre_completo}</p>
                            <p style="margin: 0; font-size: 0.8rem; color: #666;">@${m.username}</p>
                        </div>
                        <button class="btn-outline" style="margin: 0 0 0 auto; width: auto; padding: 4px 8px; font-size: 0.75rem;" onclick="cerrarModal('modal-miembros-club'); window.abrirChat('${m.username}', null)"><i class="fas fa-envelope"></i> Mensaje</button>
                    </div>
                `;
            });
        } else {
            lista.innerHTML = '<p style="text-align:center; color:#666;">Aún no hay miembros aceptados en este club.</p>';
        }
    })
    .catch(err => {
        lista.innerHTML = '<p style="text-align:center; color:red;">Error al cargar miembros.</p>';
    });
}

function toggleSolicitudes() { expandirSolicitudes = !expandirSolicitudes; renderAccionesOrg(); }

function renderAccionesOrg() {
    const container = document.getElementById('lista-acciones-pendientes-container');
    if(!container) return;
    
    let solicitudes = accionesOrgPendientes.filter(a => a.tipo === 'solicitud');
    let tareas = accionesOrgPendientes.filter(a => a.tipo === 'tarea');
    let cotizacionesRes = accionesOrgPendientes.filter(a => a.tipo === 'cot_respondida'); 
    
    let html = '';

    html += `<div style="background: #f9f9f9; padding: 10px 15px; border-radius: 5px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border: 1px solid #ddd;" onclick="toggleSolicitudes()"><strong style="color: var(--header-bg);"><i class="fas fa-user-plus"></i> Solicitudes para unirse (${solicitudes.length})</strong><i class="fas fa-chevron-${expandirSolicitudes ? 'up' : 'down'}"></i></div>`;
    
    if (expandirSolicitudes && solicitudes.length > 0) {
        html += '<ul style="list-style: none; padding: 0 0 0 15px; margin: 0 0 15px 0;">';
        solicitudes.forEach((accion) => {
            let originalIndex = accionesOrgPendientes.indexOf(accion);
            html += `<li style="padding: 10px 0; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; gap: 15px;"><span style="font-size: 0.9rem;"><strong>${accion.nombreUser}</strong> desea unirse a <strong>${accion.club}</strong>.</span><div style="display: flex; gap: 10px;"><button class="btn-submit" style="margin: 0; padding: 6px 12px; font-size: 0.8rem; width: auto;" onclick="window.resolverSolicitudOrg(${originalIndex}, true)">Aceptar</button><button class="btn-outline" style="margin: 0; padding: 6px 12px; font-size: 0.8rem; width: auto;" onclick="window.resolverSolicitudOrg(${originalIndex}, false)">Rechazar</button></div></li>`;
        });
        html += '</ul>';
    } else if (expandirSolicitudes) { html += '<p style="font-size: 0.85rem; color: #666; padding-left: 15px;">No hay solicitudes pendientes.</p>'; }

    if(cotizacionesRes.length > 0) {
        html += `<div style="margin-top: 15px;"><strong style="color: var(--header-bg); font-size: 0.95rem;"><i class="fas fa-file-invoice-dollar"></i> Cotizaciones de Sedes (${cotizacionesRes.length})</strong></div>`;
        html += '<ul style="list-style: none; padding: 0; margin: 10px 0 0 0;">';
        cotizacionesRes.forEach((accion) => {
            let originalIndex = accionesOrgPendientes.indexOf(accion);
            html += `<li style="padding: 10px 0; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; gap: 10px;">
                <span style="font-size: 0.9rem;">${accion.texto}</span>
                <button class="btn-outline" style="margin: 0; padding: 6px 12px; font-size: 0.8rem; width: auto;" onclick="window.abrirDetalleCotizacionOrg(${originalIndex})"><i class="fas fa-eye"></i> Ver Detalles</button>
            </li>`;
        });
        html += '</ul>';
    }

    html += `<div style="margin-top: 15px;"><strong style="color: var(--header-bg); font-size: 0.95rem;"><i class="fas fa-clipboard-list"></i> Otras Tareas (${tareas.length})</strong></div>`;
    if(tareas.length > 0) {
        html += '<ul style="list-style: none; padding: 0; margin: 10px 0 0 0;">';
        tareas.forEach((accion) => {
            let originalIndex = accionesOrgPendientes.indexOf(accion);
            
            let textoVisible = accion.texto;
            let esReserva = false;
            let sedeUsr = "", precioRes = "", personasRes = "", fechaRes = "";
            
            if(accion.texto.includes('|RESERVA|')) {
                let partes = accion.texto.split('|RESERVA|');
                textoVisible = partes[0];
                let datosRes = partes[1].split('|');
                sedeUsr = datosRes[0];
                precioRes = datosRes[1];
                personasRes = datosRes[2] || ''; 
                fechaRes = datosRes[3] || ''; 
                esReserva = true;
            }

            if(esReserva) {
                html += `<li style="padding: 10px 0; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; gap: 15px;">
                    <span style="font-size: 0.9rem; flex: 1; color: var(--header-bg);">
                        <i class="fas fa-exclamation-circle" style="color: #e74c3c;"></i> <strong>¡Falta la reserva oficial!</strong><br>
                        <span style="color: #555;">${textoVisible}</span>
                    </span>
                    <div style="display: flex; gap: 10px;">
                        <button class="btn-submit" style="margin: 0; padding: 6px 12px; font-size: 0.8rem; width: auto; background: var(--accent-orange);" onclick="window.prepararReservaDesdeTarea('${sedeUsr}', '${precioRes}', '${personasRes}', '${fechaRes}')"><i class="fas fa-calendar-plus"></i> Completar Reserva</button>
                        <button class="btn-outline" style="margin: 0; padding: 6px 12px; font-size: 0.8rem; width: auto; border-color: #e74c3c; color: #e74c3c;" onclick="window.marcarTareaHechaOrg(${originalIndex})" title="Descartar tarea"><i class="fas fa-trash"></i></button>
                    </div>
                </li>`;
            } else {
                html += `<li style="padding: 10px 0; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 0.9rem; cursor: pointer; flex: 1;" onclick="window.editarTareaOrg(${originalIndex})" title="Clic para editar">- ${textoVisible}</span>
                    <button class="btn-submit" style="margin: 0; padding: 6px 12px; font-size: 0.8rem; width: auto;" onclick="window.marcarTareaHechaOrg(${originalIndex})"><i class="fas fa-check"></i> Hecho</button>
                </li>`;
            }
        });
        html += '</ul>';
    } else { html += '<p style="font-size: 0.85rem; color: #666;">No hay tareas manuales.</p>'; }
    
    container.innerHTML = html;
}

window.abrirDetalleCotizacionOrg = function(index) {
    let accion = accionesOrgPendientes[index];
    
    document.getElementById('det-cot-sede').innerText = accion.sede_nombre;
    document.getElementById('det-cot-total').innerText = accion.precio_estimado;
    document.getElementById('det-cot-pp').innerText = accion.precio_persona || 'No especificado';
    document.getElementById('det-cot-notas').innerText = accion.notas_sede;
    
    document.getElementById('det-cot-botones').innerHTML = `
        <button class="btn-submit" style="margin: 0; flex: 1; font-size: 0.9rem;" onclick="window.resolverCotizacionOrg(${index}, true, '${accion.sedeUsername}'); cerrarModal('modal-detalle-cotizacion');"><i class="fas fa-check"></i> Aceptar y Reservar</button>
        <button class="btn-outline" style="margin: 0; flex: 1; border-color: #e74c3c; color: #e74c3c; font-size: 0.9rem;" onclick="window.resolverCotizacionOrg(${index}, false, '${accion.sedeUsername}'); cerrarModal('modal-detalle-cotizacion');"><i class="fas fa-times"></i> Rechazar</button>
    `;
    
    abrirModal('modal-detalle-cotizacion');
};

window.resolverSolicitudOrg = function(index, aceptado) {
    let accion = accionesOrgPendientes[index];
    let estado = aceptado ? 'Aceptado' : 'Rechazado';
    if (!aceptado) { let msg = prompt("Mensaje de rechazo (opcional):"); if(msg === null) return; }

    fetch('http://127.0.0.1:5000/api/resolver_solicitud', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_club: accion.id_club, id_usuario: accion.id_usuario, estado: estado })
    }).then(r=>r.json()).then(data => {
        if(data.exito) {
            alert(`Solicitud ${estado.toLowerCase()} exitosamente.`);
            if (aceptado) {
                let clubAfectado = baseDeDatos[usuarioActual].mis_clubes.find(c => c.id_club === accion.id_club);
                if(clubAfectado) {
                    clubAfectado.inscritos = (clubAfectado.inscritos || 0) + 1;
                    renderClubesOrganizador(); 
                        // Redibujar las tarjetas de clubes del organizador
                if (typeof renderClubesOrganizador === 'function') {
                    renderClubesOrganizador();
                }
                // ¡Magia! Se dibuja el nuevo panel en vivo
                if (typeof renderSeguimientoAutores === 'function') {
                    renderSeguimientoAutores();
                }
                }
            }
            accionesOrgPendientes.splice(index, 1); renderAccionesOrg();
        } else { alert("Error: " + data.mensaje); }
    }).catch(err => alert("Error de conexión."));
};

window.editarTareaOrg = function(index) {
    let tarea = accionesOrgPendientes[index];
    let nuevoTexto = prompt("Edita la tarea:", tarea.texto);
    if(nuevoTexto !== null && nuevoTexto.trim() !== "") {
        fetch('http://127.0.0.1:5000/api/editar_tarea', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_tarea: tarea.id, texto: nuevoTexto })
        }).then(r => r.json()).then(data => {
            if(data.exito) {
                accionesOrgPendientes[index].texto = nuevoTexto; renderAccionesOrg();
            } else { alert("Error al editar: " + data.mensaje); }
        });
    }
};

window.marcarTareaHechaOrg = function(index) {
    let tarea = accionesOrgPendientes[index];
    fetch('http://127.0.0.1:5000/api/marcar_tarea', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_tarea: tarea.id })
    }).then(r => r.json()).then(data => {
        if(data.exito) {
            accionesOrgPendientes.splice(index, 1); renderAccionesOrg();
        } else { alert("Error al completar tarea: " + data.mensaje); }
    });
};

window.resolverCotizacionOrg = function(index, aceptado, sedeUsername) {
    let accion = accionesOrgPendientes[index];
    fetch('http://127.0.0.1:5000/api/resolver_cotizacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_cotizacion: accion.id_cotizacion, aceptado: aceptado })
    }).then(r=>r.json()).then(data => {
        if(data.exito) {
            if(!aceptado) {
                if(confirm("Cotización rechazada. ¿Deseas enviar un mensaje a la sede para saber el motivo o intentar negociar?")) {
                    window.abrirChat(sedeUsername, null);
                }
            } else {
                alert("Cotización aceptada. Ahora puedes pedir una reserva formal con esta sede dando clic en la nueva tarea que te aparecerá.");
            }
            
            accionesOrgPendientes.splice(index, 1); 
            if(aceptado && data.id_tarea) {
                accionesOrgPendientes.push({
                    id: data.id_tarea,
                    tipo: 'tarea',
                    texto: data.texto_tarea
                });
            }
            renderAccionesOrg(); 
        } else { alert("Error: " + data.mensaje); }
    });
};

window.abrirDetalleLibroDesdeAutor = function(index) {
    let libro = librosPublicadosAutor[index];
    window.mostrarDetalleLibro(libro.id_libro, libro.titulo, libro.genero, libro.paginas, libro.sinopsis);
};

function renderLibrosAutor() {
    const contenedor = document.getElementById('lista-libros-autor');
    const contador = document.getElementById('contador-libros-trayectoria');
    if(!contenedor) return;
    if(contador) contador.innerText = librosPublicadosAutor.length;

    if(librosPublicadosAutor.length === 0) { contenedor.innerHTML = '<p style="color: #666; font-size: 0.9rem;">Aún no tienes libros publicados.</p>'; return; }
    let htmlLista = '<ul style="list-style:none; padding:0; margin:0;">';
    librosPublicadosAutor.forEach((libro, index) => {
        let numeroVisual = index + 1; 
        let imgSrc = libro.portada_url || libro.portada || 'https://via.placeholder.com/100x150?text=Portada';
        htmlLista += `<li style="padding: 10px; border-bottom: 1px solid #eee; transition: background 0.3s; display: flex; align-items: center; justify-content: space-between;" onmouseover="this.style.background='#f9f9f9'" onmouseout="this.style.background='transparent'">
            <div style="display: flex; align-items: center; cursor: pointer; flex: 1;" onclick="window.abrirDetalleLibroDesdeAutor(${index})">
                <img src="${imgSrc}" style="width: 35px; height: 50px; object-fit: cover; border-radius: 3px; border: 1px solid #ddd; margin-right: 15px;">
                <span style="color: var(--accent-orange); font-weight: bold;">#${numeroVisual} - ${libro.titulo}</span>
            </div>
            <button class="btn-outline" style="width: auto; padding: 5px 10px; margin: 0; font-size: 0.8rem;" onclick="window.abrirModalEditarLibroAutor(${index})"><i class="fas fa-edit"></i> Editar</button>
        </li>`;
    });
    htmlLista += '</ul>'; contenedor.innerHTML = htmlLista;
}


// =========================================================================
// LÓGICA DE LIBROS DEL ESCRITOR (NUEVO Y EDITAR) - CABLES CONECTADOS
// =========================================================================

let formNuevoLibro = document.getElementById('form-nuevo-libro'); 
if (formNuevoLibro) {
    formNuevoLibro.addEventListener('submit', function(e) {
        e.preventDefault(); // <-- Esto evita que te saque de la sesión
        
        let inputPortada = document.getElementById('preview-portada-nuevo');
        
        const data = {
            username: usuarioActual,
            autor: baseDeDatos[usuarioActual].nombre, 
            titulo: document.getElementById('nuevo-libro-titulo').value,
            genero: document.getElementById('nuevo-libro-genero').value,
            paginas: document.getElementById('nuevo-libro-paginas').value,
            sinopsis: document.getElementById('nuevo-libro-sinopsis').value,
            portada: inputPortada ? inputPortada.src : '' 
        };

        fetch('http://127.0.0.1:5000/api/nuevo_libro', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        })
        .then(r => r.json())
        .then(res => {
            if (res.exito) {
                alert("¡Libro publicado con éxito en BiblioRed!");
                cerrarModal('modal-nuevo-libro');
                formNuevoLibro.reset();
                librosPublicadosAutor.unshift({ 
                    id_libro: res.id_libro, 
                    titulo: data.titulo,
                    genero: data.genero,
                    paginas: data.paginas,
                    sinopsis: data.sinopsis,
                    portada_url: data.portada
                });

                if (typeof renderLibrosAutor === 'function') renderLibrosAutor();
                // Opcional: recargar la biblioteca global por detrás
                if (typeof cargarLibrosGlobales === 'function') cargarLibrosGlobales();
            } else {
                alert("Error de la base de datos: " + res.mensaje);
            }
        })
        .catch(err => alert("Error de conexión con el servidor."));
    });
}

let formEditarLibroAutor = document.getElementById('form-editar-libro-autor');
if (formEditarLibroAutor) {
    formEditarLibroAutor.addEventListener('submit', function(e) {
        e.preventDefault(); // <-- Evita que te saque de la sesión
        if (indexLibroAutorEditando === -1) return;

        let libroAEditar = librosPublicadosAutor[indexLibroAutorEditando];
        let inputPortada = document.getElementById('preview-portada-editar');

        let data = {
            username: usuarioActual,
            id_libro: libroAEditar.id_libro,
            titulo: document.getElementById('edit-libro-titulo').value,
            genero: document.getElementById('edit-libro-genero').value,
            paginas: document.getElementById('edit-libro-paginas').value,
            sinopsis: document.getElementById('edit-libro-sinopsis').value,
            portada: inputPortada ? inputPortada.src : ''
        };


        fetch('http://127.0.0.1:5000/api/editar_libro', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data)
        }).then(r => r.json()).then(res => {
            if(res.exito) {
                alert("Libro actualizado correctamente.");
                cerrarModal('modal-editar-libro-autor');
                

                librosPublicadosAutor[indexLibroAutorEditando] = {
                    ...libroAEditar,
                    titulo: data.titulo,
                    genero: data.genero,
                    paginas: data.paginas,
                    sinopsis: data.sinopsis,
                    portada_url: data.portada
                };


                if (typeof renderLibrosAutor === 'function') renderLibrosAutor();
                if (typeof cargarLibrosGlobales === 'function') cargarLibrosGlobales();
            } else {
                alert("Error de la base de datos: " + res.mensaje);
            }
        }).catch(err => alert("Error de conexión al editar el libro."));
    });
}


function renderInvitacionesAutor() {
    let container = document.getElementById('contenedor-solicitudes-autor');
    if(!container) return;
    container.innerHTML = '';
    
    if(invitacionesAutor.length === 0) {
        container.innerHTML = '<p style="font-size: 0.85rem; color: #666;">No tienes invitaciones a eventos pendientes.</p>'; return;
    }
    
    let html = '<div style="display: flex; flex-direction: column; gap: 15px;">';
    invitacionesAutor.forEach((inv, index) => {
        let usernameOrg = inv.org_username || inv.organizador;

        html += `<div style="background: white; border: 1px solid #ddd; padding: 15px; border-radius: 8px; border-left: 4px solid var(--accent-orange); box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
            <p style="margin: 0 0 10px 0; font-size: 0.95rem; color: #333;">El organizador <strong>${inv.organizador}</strong> te propone un evento para el club <strong>${inv.club_nombre}</strong>.</p>
            
            <div style="background: #fdfdfd; padding: 12px; border-radius: 5px; font-size: 0.85rem; color: #555; margin-bottom: 12px; border: 1px solid #eee;">
                <p style="margin: 3px 0;"><strong><i class="fas fa-clipboard-list" style="color: var(--accent-orange); width: 15px;"></i> Formato:</strong> ${inv.formato || 'Por definir'}</p>
                <p style="margin: 3px 0;"><strong><i class="fas fa-calendar-alt" style="color: var(--accent-orange); width: 15px;"></i> Cuándo:</strong> ${inv.fecha || 'N/A'} a las ${inv.hora || 'N/A'}</p>
                <p style="margin: 3px 0;"><strong><i class="fas fa-map-marker-alt" style="color: var(--accent-orange); width: 15px;"></i> Dónde:</strong> ${inv.sede_nombre || 'N/A'} (${inv.ciudad || ''}, ${inv.municipio || ''}, ${inv.pais || ''})</p>
            </div>
            
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                <button class="btn-submit" style="margin: 0; padding: 6px 12px; font-size: 0.8rem; width: auto;" onclick="responderInvitacionAutor(${index}, true)"><i class="fas fa-check"></i> Aceptar</button>
                <button class="btn-outline" style="margin: 0; padding: 6px 12px; font-size: 0.8rem; width: auto; border-color: #e74c3c; color: #e74c3c;" onclick="responderInvitacionAutor(${index}, false)"><i class="fas fa-times"></i> Rechazar</button>
                
                <!-- NUEVO BOTÓN DE MENSAJE -->
                <button class="btn-outline" style="margin: 0; padding: 6px 12px; font-size: 0.8rem; width: auto; border-color: #3498db; color: #3498db;" onclick="window.abrirChat('${usernameOrg}', null)"><i class="fas fa-envelope"></i> Mensaje a Organizador</button>
            </div>
        </div>`;
    });
    html += '</div>';
    container.innerHTML = html;
}

window.responderInvitacionAutor = function(index, aceptado) {
    let invitacion = invitacionesAutor[index];
    fetch('http://127.0.0.1:5000/api/responder_invitacion_autor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_club: invitacion.id_club, aceptado: aceptado })
    }).then(r => r.json()).then(data => {
        if(data.exito) {
            alert(aceptado ? "¡Has aceptado la invitación exitosamente!" : "Invitación rechazada.");
            
            let invConfirmada = invitacionesAutor.splice(index, 1)[0];
            
            // 2. Si aceptó, la guardamos temporalmente en sus eventos confirmados y la dibujamos
            if (aceptado) {
                if (!window.eventosConfirmadosAutor) window.eventosConfirmadosAutor = [];
                window.eventosConfirmadosAutor.push(invConfirmada);
                if (typeof renderEventosConfirmadosAutor === 'function') renderEventosConfirmadosAutor();
            }
            
            renderInvitacionesAutor();
            
        } else { alert("Error al responder invitación: " + data.mensaje); }
    });
};

window.renderEventosConfirmadosAutor = function() {
    let container = document.getElementById('contenedor-eventos-autor-confirmados');
    if(!container) return;
    container.innerHTML = '';

    if (!window.eventosConfirmadosAutor || window.eventosConfirmadosAutor.length === 0) {
        container.innerHTML = '<p style="font-size: 0.85rem; color: #666;">Aún no tienes eventos confirmados próximos.</p>';
        return;
    }

    window.eventosConfirmadosAutor.forEach((ev, index) => {
        let usernameOrg = ev.org_username || ev.organizador;

        let html = `
        <div style="flex: 1; min-width: 300px; border: 1px solid #eee; padding: 15px; border-radius: 8px; background: white; border-left: 4px solid #27ae60; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
            <h4 style="margin: 0 0 5px 0; color: var(--header-bg); font-size: 1.05rem;">Club: ${ev.club_nombre}</h4>
            <p style="margin: 0 0 10px 0; font-size: 0.85rem; color: #555;">Organiza: <strong>${ev.organizador}</strong></p>
            
            <div style="background: #f9f9f9; padding: 12px; border-radius: 5px; font-size: 0.85rem; color: #555; border: 1px solid #eee;">
                <p style="margin: 3px 0; color: #333;"><strong><i class="fas fa-calendar-check" style="color: #27ae60;"></i> Asistencia Confirmada</strong></p>
                <p style="margin: 3px 0;"><strong><i class="fas fa-clipboard-list" style="color: #888; width: 15px;"></i> Formato:</strong> ${ev.formato || 'Por definir'}</p>
                <p style="margin: 3px 0;"><strong><i class="fas fa-clock" style="color: #888; width: 15px;"></i> Cuándo:</strong> ${ev.fecha || 'N/A'} a las ${ev.hora || 'N/A'}</p>
                <p style="margin: 3px 0;"><strong><i class="fas fa-map-marker-alt" style="color: #888; width: 15px;"></i> Dónde:</strong> ${ev.sede_nombre || 'N/A'} (${ev.ciudad || ''}, ${ev.municipio || ''}, ${ev.pais || ''})</p>
            </div>
            
            <div style="display: flex; gap: 10px; margin-top: 15px;">
                <button class="btn-outline" style="margin: 0; padding: 6px 12px; font-size: 0.8rem; flex: 1; border-color: #3498db; color: #3498db;" onclick="window.abrirChat('${usernameOrg.replace(/'/g, "\\'")}', null)"><i class="fas fa-comments"></i> Mensaje al Org</button>
                <button class="btn-outline" style="margin: 0; padding: 6px 12px; font-size: 0.8rem; flex: 1; border-color: #27ae60; color: #27ae60;" onclick="window.marcarEventoAutorTerminado(${index})"><i class="fas fa-flag-checkered"></i> Terminado</button>
            </div>
        </div>`;
        container.innerHTML += html;
    });
};

window.marcarEventoAutorTerminado = function(index) {
    if(!confirm("¿Confirmas que tu participación en este evento ha concluido? El evento pasará a tu historial de asistencias de forma permanente.")) return;
    
    let eventoTerminado = window.eventosConfirmadosAutor[index];

    fetch('http://127.0.0.1:5000/api/marcar_evento_autor_terminado', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_club: eventoTerminado.id_club })
    }).then(r => r.json()).then(data => {
        if(data.exito) {
            window.eventosConfirmadosAutor.splice(index, 1);
            if (!window.historialEventosAutor) window.historialEventosAutor = [];
            window.historialEventosAutor.unshift(eventoTerminado);
            
            renderEventosConfirmadosAutor();
            if (typeof renderHistorialEventosAutor === 'function') renderHistorialEventosAutor();
        } else {
            alert("Error al guardar en el historial: " + data.mensaje);
        }
    }).catch(err => alert("Error de conexión con el servidor."));
};

window.renderHistorialEventosAutor = function() {
    let container = document.getElementById('contenedor-historial-eventos-autor');
    let statEventos = document.getElementById('contador-eventos-trayectoria');
    
    // MAGIA: Actualizamos el contador de "Mi Trayectoria"
    if (statEventos) {
        statEventos.innerText = window.historialEventosAutor ? window.historialEventosAutor.length : 0;
    }

    if(!container) return;
    container.innerHTML = '';

    if (!window.historialEventosAutor || window.historialEventosAutor.length === 0) {
        container.innerHTML = '<p style="font-size: 0.85rem; color: #666;">Tu historial de asistencias está vacío.</p>';
        return;
    }

    window.historialEventosAutor.forEach(ev => {
        let html = `
        <div style="flex: 1; min-width: 250px; max-width: 300px; border: 1px solid #ddd; padding: 15px; border-radius: 8px; background: #fbfbfb; border-left: 4px solid #95a5a6; opacity: 0.9;">
            <h4 style="margin: 0 0 5px 0; color: #555; font-size: 1rem;"><i class="fas fa-check-double"></i> ${ev.club_nombre}</h4>
            <p style="margin: 0 0 5px 0; font-size: 0.8rem; color: #666;">Organizó: ${ev.organizador}</p>
            <p style="margin: 0; font-size: 0.8rem; color: #888;"><i class="fas fa-calendar-alt"></i> Realizado el: ${ev.fecha || 'N/A'}</p>
        </div>`;
        container.innerHTML += html;
    });
};

window.mostrarDetalleLibro = function(id_libro, titulo, genero, paginas, sinopsis) {
    document.getElementById('det-libro-titulo').innerText = titulo;
    document.getElementById('det-libro-genero').innerText = genero || 'General';
    document.getElementById('det-libro-paginas').innerText = paginas || '?';
    document.getElementById('det-libro-sinopsis').innerText = '"' + (sinopsis || 'Sin descripción') + '"';
    
    let contenedorResenas = document.getElementById('lista-resenas-dinamicas');
    if (contenedorResenas) contenedorResenas.innerHTML = '<p style="font-size: 0.8rem; color: #666;">Cargando reseñas...</p>';
    
    abrirModal('modal-detalle-libro');
    
    fetch('http://127.0.0.1:5000/api/resenas_libro', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ id_libro: id_libro })
    }).then(r => r.json()).then(res => {
        if (res.exito && contenedorResenas) {
            if (res.resenas.length === 0) {
                contenedorResenas.innerHTML = '<p style="font-size: 0.85rem; color: #888; font-style: italic;">Aún no hay reseñas para este libro.</p>';
                return;
            }
            
            let htmlResenas = '';
            res.resenas.forEach(r => {
                let estrellas = '⭐'.repeat(r.calificacion);
                htmlResenas += `
                    <div style="background: #fff; padding: 10px; border: 1px solid #e0e0e0; border-radius: 5px; margin-bottom: 8px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                            <strong style="font-size: 0.85rem; color: var(--header-bg);">${r.username}</strong>
                            <span style="font-size: 0.8rem;">${estrellas}</span>
                        </div>
                        <p style="margin: 0; font-size: 0.85rem; color: #555;">"${r.comentario}"</p>
                    </div>
                `;
            });
            contenedorResenas.innerHTML = htmlResenas;
        }
    });
};

window.abrirModalEditarLibroAutor = function(index) {
    indexLibroAutorEditando = index;
    let libro = librosPublicadosAutor[index];
    document.getElementById('edit-libro-titulo').value = libro.titulo;
    document.getElementById('edit-libro-genero').value = libro.genero;
    document.getElementById('edit-libro-paginas').value = libro.paginas;
    document.getElementById('edit-libro-sinopsis').value = libro.sinopsis;
    document.getElementById('preview-portada-editar').src = libro.portada_url || libro.portada || 'https://via.placeholder.com/100x150?text=Portada';
    abrirModal('modal-editar-libro-autor');
};

// Sede
function renderizarPerfilSede() {
    let container = document.getElementById('info-perfil-sede');
    if(!container) return;
    
    let capMin = datosSede.cupoMin || 0;
    let capMax = datosSede.cupoMax || 0;
    let pre = datosSede.precio || 0;
    let ameni = datosSede.amenidades || "No especificadas";
    let promo = datosSede.promociones || "No hay promociones activas";
    let cuenta = datosSede.cuenta || "No registrada";

    container.innerHTML = `
        <p style="margin: 8px 0;"><i class="fas fa-users" style="color: var(--accent-orange); width: 20px;"></i> <strong>Capacidad:</strong> De ${capMin} a ${capMax} personas</p>
        <p style="margin: 8px 0;"><i class="fas fa-dollar-sign" style="color: var(--accent-orange); width: 20px;"></i> <strong>Precio por persona:</strong> $${pre} MXN</p>
        <p style="margin: 8px 0;"><i class="fas fa-wifi" style="color: var(--accent-orange); width: 20px;"></i> <strong>Amenidades:</strong> ${ameni}</p>
        <p style="margin: 8px 0;"><i class="fas fa-money-check-alt" style="color: var(--accent-orange); width: 20px;"></i> <strong>Cuenta bancaria:</strong> ${cuenta}</p>
        <div style="background: #fff3e0; padding: 15px; border-left: 4px solid var(--accent-orange); border-radius: 4px; margin-top: 15px; font-size: 0.9rem;">
            <strong style="color: #d35400;"><i class="fas fa-bullhorn"></i> Promociones Activas:</strong><br>
            <div style="color: #555; white-space: pre-wrap; margin-top: 5px;">${promo}</div>
        </div>`;
        
    document.getElementById('sede-min').value = capMin; 
    document.getElementById('sede-max').value = capMax;
    document.getElementById('sede-precio').value = pre; 
    document.getElementById('sede-amenidades').value = ameni;
    document.getElementById('sede-cuenta').value = cuenta !== "No registrada" ? cuenta : "";
    document.getElementById('sede-promociones').value = promo;
}

window.cambiarMesSede = function(direccion) { 
    fechaActualCalendarioSede.setMonth(fechaActualCalendarioSede.getMonth() + direccion); 
    window.renderizarCalendarioSede(); 
}

window.renderizarCalendarioSede = function() {
    let cal = document.getElementById('calendario-sede'); 
    let headerMes = document.getElementById('mes-anio-sede');
    if(!cal || !headerMes) return;
    
    let anio = fechaActualCalendarioSede.getFullYear(); 
    let mes = fechaActualCalendarioSede.getMonth();
    const nombresMeses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    headerMes.innerText = `${nombresMeses[mes]} ${anio}`;

    let primerDiaMes = new Date(anio, mes, 1).getDay(); 
    let diasEnMes = new Date(anio, mes + 1, 0).getDate();
    let html = '';
    
    for (let i = 0; i < primerDiaMes; i++) html += `<div></div>`;
    
    for (let dia = 1; dia <= diasEnMes; dia++) {
        let fechaStringStr = formatearFechaISO(anio, mes, dia);
        
        // LA MAGIA ESTÁ AQUÍ: Usamos .includes() para ignorar si trae la hora pegada
        let eventosDelDia = eventosSedeLista.filter(e => e.fecha && e.fecha.includes(fechaStringStr));
        
        let isOcupado = eventosDelDia.length > 0;
        let colorBg = isOcupado ? '#fceceb' : '#e8f5e9'; 
        let colorText = isOcupado ? '#e74c3c' : '#27ae60'; 
        let cursor = isOcupado ? 'cursor: pointer;' : 'cursor: default;';
        
        html += `<div style="background:${colorBg}; color:${colorText}; padding:8px 0; border-radius:4px; ${cursor}; font-weight: ${isOcupado ? 'bold' : 'normal'}; border: ${isOcupado ? '1px solid #e74c3c' : 'none'};" ${isOcupado ? `onclick="window.abrirModalDiaSede('${fechaStringStr}')"` : ''}>${dia}</div>`;
    }
    cal.innerHTML = html;
}

window.abrirModalDiaSede = function(fechaISO) {
    // También usamos .includes() aquí para que despliegue correctamente la info
    let eventosDelDia = eventosSedeLista.filter(e => e.fecha && e.fecha.includes(fechaISO));
    let contenido = document.getElementById('contenido-dia-calendario');
    
    let html = `<p style="font-size:0.95rem; color:#444; margin-bottom:15px; border-bottom: 2px solid #eee; padding-bottom: 10px;">Agenda para el <strong>${fechaISO}</strong>:</p>`;
    
    eventosDelDia.forEach((ev, index) => {
        let numeroVisual = index + 1; 
        let paleta = obtenerEstilosEstadoSede(ev.estado);
        html += `<div style="background: #fff; border-left: 4px solid #e74c3c; padding: 15px; margin-bottom: 15px; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); border-right: 1px solid #eee; border-top: 1px solid #eee; border-bottom: 1px solid #eee;">
                    <h4 style="margin: 0 0 8px 0; color: var(--header-bg);">Evento #${numeroVisual}: ${ev.nombre}</h4>
                    <p style="margin: 5px 0; font-size: 0.85rem; color: #555;"><i class="fas fa-user-tie" style="color: var(--accent-orange); width: 15px;"></i> Org: <strong>${ev.organizador}</strong></p>
                    <p style="margin: 5px 0; font-size: 0.85rem; color: #555;"><i class="fas fa-clock" style="color: var(--accent-orange); width: 15px;"></i> Hora: <strong>${ev.hora || ev.fecha.split(' ')[1] || 'No especificada'}</strong></p>
                    <p style="margin: 5px 0; font-size: 0.85rem; color: #555;"><i class="fas fa-users" style="color: var(--accent-orange); width: 15px;"></i> Aforo esperado: ${ev.personas}</p>
                    <p style="margin: 10px 0 0 0; font-size: 0.85rem;">Estado: <span style="background: ${paleta.bg}; color: ${paleta.color}; padding: 3px 8px; border-radius: 4px; font-weight:bold;">${ev.estado}</span></p>
                </div>`;
    });
    contenido.innerHTML = html; 
    abrirModal('modal-dia-calendario');
}

function renderizarPanelesSede() {
    let reservas = document.getElementById('contenedor-reservas-sede'); 
    let eventos = document.getElementById('contenedor-eventos-sede');
    let eventosTerminados = document.getElementById('contenedor-eventos-terminados-sede'); // 👈 NUEVO CONTENEDOR
    
    let cotizaciones = document.getElementById('contenedor-cotizaciones-sede');
    let cotizadasEnviadas = document.getElementById('contenedor-cotizaciones-enviadas');
    let cotizadasSeguimiento = document.getElementById('contenedor-cotizaciones-seguimiento');

    if(!reservas || !eventos || !cotizaciones || !cotizadasEnviadas || !cotizadasSeguimiento) return;
    
    // ----------------------------------------------------
    // 1. RENDERIZAR RESERVAS
    // ----------------------------------------------------
    reservas.innerHTML = '';
    if(!reservasSede || reservasSede.length === 0) {
        reservas.innerHTML = '<p style="color: #666; font-size: 0.9rem;">No hay solicitudes de reserva en seguimiento.</p>';
    } else {
        reservasSede.forEach(res => {
            let chatUser = res.org_username || res.organizador; 

            reservas.innerHTML += `<div style="flex: 1; min-width: 320px; border: 1px solid #eee; padding: 20px; border-radius: 8px; background: white; border-left: 4px solid #f39c12; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                <p style="margin: 0 0 5px 0;"><strong>Org:</strong> ${res.organizador}</p>
                <p style="margin: 0 0 5px 0;"><strong>Evento:</strong> ${res.nombre_evento}</p>
                <p style="margin: 0 0 5px 0;"><strong>Fecha:</strong> ${res.fecha_hora} | <strong>Pax:</strong> ${res.asistentes_esperados}</p>
                
                <div style="background: #f9f9f9; padding: 10px; border-radius: 5px; margin-bottom: 10px; font-size: 0.85rem; color: #555;">
                    <strong>Notas del Organizador:</strong><br> ${res.notas || 'Sin notas adicionales.'}
                </div>

                <div style="background: #fffdf5; padding: 10px; border-radius: 5px; margin-bottom: 15px;">
                    <p style="margin: 0; font-size: 0.85rem; color: #d35400; font-weight: bold;"><i class="fas fa-exclamation-triangle"></i> En seguimiento: Faltan comprobantes</p>
                </div>

                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                    <button class="btn-outline" style="margin: 0; padding: 6px 12px; font-size: 0.8rem; flex: 1;" onclick="window.pedirComprobanteYtarea('${chatUser}', '${res.nombre_evento}')"><i class="fas fa-comment-dollar"></i> Pedir Comprobante</button>
                    <button class="btn-submit" style="margin: 0; padding: 6px 12px; font-size: 0.8rem; flex: 1;" onclick="window.responderReservaFinal('${res.id_evento}', true)"><i class="fas fa-check-double"></i> Validar y Programar</button>
                    <button class="btn-outline" style="margin: 0; padding: 6px 12px; font-size: 0.8rem; flex: 1; border-color: #e74c3c; color: #e74c3c;" onclick="window.responderReservaFinal('${res.id_evento}', false)"><i class="fas fa-times"></i> Cancelar</button>
                </div>
            </div>`;
        });
    }
    
    // ----------------------------------------------------
    // 2. RENDERIZAR COTIZACIONES
    // ----------------------------------------------------
    cotizaciones.innerHTML = '';
    cotizadasEnviadas.innerHTML = '';
    cotizadasSeguimiento.innerHTML = '';

    let hayPendientes = false, hayEnviadas = false, haySeguimiento = false;

    if(!cotizacionesSede || cotizacionesSede.length === 0) {
        cotizaciones.innerHTML = '<p style="color: #666; font-size: 0.9rem;">No hay nuevas solicitudes de cotización.</p>';
        cotizadasEnviadas.innerHTML = '<p style="color: #666; font-size: 0.9rem;">No hay cotizaciones enviadas en espera de respuesta.</p>';
        cotizadasSeguimiento.innerHTML = '<p style="color: #666; font-size: 0.9rem;">No hay cotizaciones en seguimiento o rechazadas.</p>';
    } else {
        cotizacionesSede.forEach(cot => {
            let baseHTML = `<div style="flex: 1; min-width: 320px; border: 1px solid #eee; padding: 20px; border-radius: 8px; background: white; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                <p style="margin: 0 0 5px 0;"><strong>Org:</strong> ${cot.organizador}</p>
                <p style="margin: 0 0 5px 0;"><strong>Fecha:</strong> ${cot.fecha_evento} | <strong>Pax:</strong> ${cot.personas}</p>
                <p style="margin: 0 0 10px 0; font-size: 0.9rem; color: #555;">"${cot.concepto}"</p>`;

            let precioP = cot.precio_persona ? ` ($${cot.precio_persona} p/p)` : '';

            if (cot.estado === 'Pendiente') {
                hayPendientes = true;
                cotizaciones.innerHTML += baseHTML + `
                    <button class="btn-submit" style="margin: 0; padding: 6px 12px; font-size: 0.8rem; width: auto;" onclick="window.abrirModalResponderCotizacion(${cot.id_cotizacion}, '${cot.concepto}', ${cot.personas}, '${cot.fecha_evento}')">Responder Cotización</button>
                </div>`;
            } else if (cot.estado === 'Respondida') {
                hayEnviadas = true;
                cotizadasEnviadas.innerHTML += baseHTML + `
                    <p style="margin: 0 0 10px 0; font-size: 0.9rem; color: #0284c7;"><strong>Precio enviado:</strong> $${cot.precio_estimado} ${precioP}</p>
                    <p style="font-size: 0.85rem; color: #f39c12; font-weight: bold;"><i class="fas fa-clock"></i> En espera de respuesta del organizador</p>
                </div>`;
            } else if (cot.estado === 'Aceptada') {
                haySeguimiento = true;
                cotizadasSeguimiento.innerHTML += baseHTML + `
                    <p style="margin: 0 0 10px 0; font-size: 0.9rem; color: #27ae60;"><strong>Precio acordado:</strong> $${cot.precio_estimado} ${precioP}</p>
                    <p style="font-size: 0.85rem; color: #27ae60; font-weight: bold;"><i class="fas fa-check-circle"></i> Aceptada - Esperando reserva formal</p>
                    <button class="btn-outline" style="margin-top: 10px; padding: 6px 12px; font-size: 0.8rem;" onclick="window.abrirChat('${cot.org_username}', null)"><i class="fas fa-envelope"></i> Mensaje al Org</button>
                </div>`;
            } else if (cot.estado === 'Rechazada') {
                haySeguimiento = true;
                cotizadasSeguimiento.innerHTML += baseHTML + `
                    <p style="margin: 0 0 10px 0; font-size: 0.9rem; color: #e74c3c;"><strong>Precio ofertado:</strong> $${cot.precio_estimado} ${precioP}</p>
                    <p style="font-size: 0.85rem; color: #e74c3c; font-weight: bold;"><i class="fas fa-times-circle"></i> Rechazada por el Organizador</p>
                    <div style="display:flex; gap: 10px; margin-top: 10px;">
                        <button class="btn-outline" style="margin: 0; padding: 6px 12px; font-size: 0.8rem;" onclick="window.abrirChat('${cot.org_username}', null)"><i class="fas fa-envelope"></i> Mensaje</button>
                        <button class="btn-outline" style="margin: 0; padding: 6px 12px; font-size: 0.8rem; border-color: #e74c3c; color: #e74c3c;" onclick="window.eliminarCotizacionSede(${cot.id_cotizacion})"><i class="fas fa-trash"></i> Eliminar</button>
                    </div>
                </div>`;
            }
        });

        if(!hayPendientes) cotizaciones.innerHTML = '<p style="color: #666; font-size: 0.9rem;">No hay nuevas solicitudes de cotización.</p>';
        if(!hayEnviadas) cotizadasEnviadas.innerHTML = '<p style="color: #666; font-size: 0.9rem;">No hay cotizaciones enviadas en espera de respuesta.</p>';
        if(!haySeguimiento) cotizadasSeguimiento.innerHTML = '<p style="color: #666; font-size: 0.9rem;">No hay cotizaciones en seguimiento o rechazadas.</p>';
    }

    // ----------------------------------------------------
    // 3. RENDERIZAR EVENTOS (EL DETECTOR DE TIEMPO) ⏱️
    // ----------------------------------------------------
    eventos.innerHTML = '';
    if (eventosTerminados) eventosTerminados.innerHTML = '';

    if(eventosSedeLista.length === 0) { 
        eventos.innerHTML = '<p style="color: #666; font-size: 0.9rem;">No hay eventos programados próximos.</p>'; 
        if(eventosTerminados) eventosTerminados.innerHTML = '<p style="color: #666; font-size: 0.9rem;">No hay historial de eventos concluidos.</p>';
    } else {
        
        let htmlActivos = '';
        let htmlPasados = '';
        let hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        eventosSedeLista.forEach((ev, index) => {
            let numeroVisual = index + 1;
            let faltaLiquidar = ev.total - ev.abono; 
            let paleta = obtenerEstilosEstadoSede(ev.estado);
            let nombreClaveNotas = "Evento Sede: " + ev.nombre; 
            let htmlNotas = "";
            
            if(notasGlobales[nombreClaveNotas] && notasGlobales[nombreClaveNotas].length > 0) {
                notasGlobales[nombreClaveNotas].forEach(nota => { htmlNotas += `<div style="margin-top: 10px; padding: 10px; background: #fffdf5; border-left: 3px solid #f1c40f; font-size: 0.85rem; color: #555; border-radius: 4px; font-style: italic;"><i class="fas fa-sticky-note" style="color: #f1c40f;"></i> "${nota}"</div>`; });
            }

            let esPasado = false;
            if(ev.fecha) {
                let partes = ev.fecha.split('-'); // La base de datos lo manda como YYYY-MM-DD
                if(partes.length === 3) {
                    let fechaDelEvento = new Date(partes[0], partes[1] - 1, partes[2]);
                    if (fechaDelEvento < hoy) {
                        esPasado = true; // ¡El evento ya caducó!
                    }
                }
            }

            let opacidad = esPasado ? '0.85' : '1';
            let filtro = esPasado ? 'grayscale(30%)' : 'none';
            let borde = esPasado ? '#95a5a6' : 'var(--header-bg)';
            let titulo = esPasado ? `<h4 style="margin: 0 0 10px 0; color: #777; font-size: 1.1rem; text-decoration: line-through;">Evento #${numeroVisual}: ${ev.nombre}</h4>` : `<h4 style="margin: 0 0 10px 0; color: var(--header-bg); font-size: 1.1rem;" class="ev-sede-nombre">Evento #${numeroVisual}: ${ev.nombre}</h4>`;
            let gridBotones = esPasado ? '1fr 1fr' : '1fr 1fr 1fr';
            let botonEditar = esPasado ? '' : `<button class="btn-outline" style="margin: 0; padding: 8px; font-size: 0.85rem; color: #555; border-color: #ccc;" onclick="window.abrirModalEditarEventoSede(${index})"><i class="fas fa-edit"></i> Editar Pagos</button>`;

            let htmlTarjeta = `<div class="evento-sede-card" style="flex: 1; min-width: 320px; border: 1px solid #eee; padding: 20px; border-radius: 8px; background: white; border-top: 4px solid ${borde}; box-shadow: 0 2px 5px rgba(0,0,0,0.05); opacity: ${opacidad}; filter: ${filtro};">
                <div style="display:flex; justify-content:space-between; align-items:start;">
                    ${titulo}
                </div>
                <p style="margin: 5px 0; font-size: 0.9rem;"><strong>Organiza:</strong> <span class="ev-sede-org">${ev.organizador}</span></p>
                <hr style="border: 0; border-top: 1px dashed #ddd; margin: 10px 0;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                    <p style="margin: 0; font-size: 0.9rem; ${esPasado ? 'color:#e74c3c; font-weight:bold;' : ''}"><i class="fas fa-clock" style="color:#555;"></i> <span class="ev-sede-fecha">${ev.fecha} ${ev.hora}</span></p>
                    <p style="margin: 0; font-size: 0.9rem;"><i class="fas fa-users" style="color:#555;"></i> <span class="ev-sede-personas">${ev.personas}</span> Personas</p>
                </div>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; border: 1px solid #e9ecef;">
                    <p style="margin: 0 0 5px 0; font-size: 0.9rem;"><strong>Total Acordado:</strong> $<span class="ev-sede-total">${ev.total}</span> MXN</p>
                    <p style="margin: 0 0 5px 0; font-size: 0.9rem;"><strong>Estado de Pago:</strong> <span class="ev-sede-estado" style="color: ${paleta.color}; background: ${paleta.bg}; padding: 2px 6px; border-radius: 4px; font-weight:bold;">${ev.estado}</span></p>
                    <p style="margin: 0 0 5px 0; font-size: 0.9rem;"><strong>Abono Recibido:</strong> $<span class="ev-sede-abono">${ev.abono}</span> MXN</p>
                    ${faltaLiquidar > 0 ? `<p style="margin: 0; font-size: 0.9rem; color: #e74c3c;"><strong>Falta liquidar:</strong> $${faltaLiquidar} MXN</p>` : ''}
                </div>
                <div class="notas-dom-sede">${htmlNotas}</div>
                <div style="display: grid; grid-template-columns: ${gridBotones}; gap: 10px; margin-top: 15px;">
                    ${botonEditar}
                    <button class="btn-outline" style="margin: 0; padding: 8px; font-size: 0.85rem; color: #555; border-color: #ccc;" onclick="window.abrirChat('${ev.organizador}', null)"><i class="fas fa-comments"></i> Mensaje</button>
                    <button class="btn-outline" style="margin: 0; padding: 8px; font-size: 0.85rem; color: #555; border-color: #ccc;" onclick="window.abrirModalNotas('${nombreClaveNotas}', 'sede')"><i class="fas fa-sticky-note"></i> Notas</button>
                </div>
            </div>`;
            if (esPasado) {
                htmlPasados += htmlTarjeta;
            } else {
                htmlActivos += htmlTarjeta;
            }
        });
        
        eventos.innerHTML = htmlActivos || '<p style="color: #666; font-size: 0.9rem; grid-column: 1 / -1;">No hay eventos programados para los próximos días.</p>';
        if(eventosTerminados) eventosTerminados.innerHTML = htmlPasados || '<p style="color: #666; font-size: 0.9rem; grid-column: 1 / -1;">No hay eventos concluidos en tu historial.</p>';
    }
}

// ------------------------------------------
// PEDIR COMPROBANTE Y TAREA AUTOMÁTICA
// ------------------------------------------
window.pedirComprobanteYtarea = function(orgUsername, nombreEvento) {
    if(!confirm("¿Deseas enviar un recordatorio automático y crearle una tarea al organizador para que envíe el comprobante?")) return;
    
    fetch('http://127.0.0.1:5000/api/pedir_comprobante', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            sede_username: usuarioActual, 
            org_username: orgUsername, 
            evento: nombreEvento 
        })
    }).then(r => r.json()).then(data => {
        if(data.exito) {
            alert("Se le ha enviado el mensaje y la tarea al organizador de forma exitosa.");
            window.abrirChat(orgUsername, null); 
        } else {
            alert("Error: " + data.mensaje);
        }
    }).catch(err => {
        console.error("Error al pedir comprobante:", err);
        alert("Error de conexión con el servidor.");
    });
};

// ------------------------------------------
// RESPONDER RESERVA FINAL (BLINDADA CON MODAL HTML)
// ------------------------------------------
window.responderReservaFinal = function(id_evento, aceptado) {
    console.log("¡Botón clickeado! ID Evento:", id_evento, "Aceptado:", aceptado);
    
    if (aceptado) {
        let formAbono = document.getElementById('form-ingresar-abono');
        if(formAbono) formAbono.reset();
        document.getElementById('abono-id-evento').value = id_evento;
        document.getElementById('abono-monto').value = "0";
        abrirModal('modal-ingresar-abono');
    } else {
        if(confirm("¿Estás seguro de rechazar esta reserva?")) {
            enviarRespuestaReserva(id_evento, false, 0);
        }
    }
};

let formAbono = document.getElementById('form-ingresar-abono');
if (formAbono) {
    formAbono.addEventListener('submit', function(e) {
        e.preventDefault();
        let id_evento = document.getElementById('abono-id-evento').value;
        let abono = parseFloat(document.getElementById('abono-monto').value);
        
        if (isNaN(abono) || abono < 0) {
            alert("Por favor ingresa una cantidad válida.");
            return;
        }
        
        enviarRespuestaReserva(id_evento, true, abono);
        cerrarModal('modal-ingresar-abono');
    });
}

function enviarRespuestaReserva(id_evento, aceptado, abono) {
    fetch('http://127.0.0.1:5000/api/responder_reserva', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_evento: id_evento, aceptado: aceptado, abono: abono })
    }).then(r=>r.json()).then(data => {
        if(data.exito) {
            alert(aceptado ? "¡Reserva Confirmada y programada!" : "Reserva rechazada.");
            let reservaAfectada = reservasSede.find(r => r.id_evento == id_evento);
            
            if(aceptado && reservaAfectada) {
                let estadoEvento = 'Pendiente de Anticipo';
                if (abono >= reservaAfectada.total_acordado && reservaAfectada.total_acordado > 0) {
                    estadoEvento = 'Liquidado / Pagado';
                } else if (abono > 0) {
                    estadoEvento = 'En Proceso';
                }

                reservaAfectada.estado = estadoEvento;
                reservaAfectada.hora = ''; 
                reservaAfectada.fecha = reservaAfectada.fecha_hora;
                reservaAfectada.personas = reservaAfectada.asistentes_esperados;
                reservaAfectada.total = reservaAfectada.total_acordado;
                reservaAfectada.abono = abono; 
                
                eventosSedeLista.push(reservaAfectada);
                cotizacionesSede = cotizacionesSede.filter(c => !(c.organizador === reservaAfectada.organizador && c.estado === 'Aceptada'));
            }
            
            reservasSede = reservasSede.filter(r => r.id_evento != id_evento);
            renderizarPanelesSede();
            renderizarCalendarioSede();
        } else { 
            alert("Error del servidor: " + data.mensaje); 
        }
    }).catch(error => {
        console.error("Error de conexión (Fetch):", error);
        alert("Falló la conexión con Python.");
    });
}

window.eliminarCotizacionSede = function(id_cotizacion) {
    if(!confirm("¿Seguro que deseas eliminar esta cotización de tu historial de seguimiento?")) return;
    fetch('http://127.0.0.1:5000/api/eliminar_cotizacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_cotizacion: id_cotizacion })
    }).then(r=>r.json()).then(data => {
        if(data.exito) {
            cotizacionesSede = cotizacionesSede.filter(c => c.id_cotizacion !== id_cotizacion);
            renderizarPanelesSede();
        } else { alert("Error: " + data.mensaje); }
    });
};

function aplicarRestriccionGlobal() {
    const is_auth = usuarioActual !== null;
    const is_org = is_auth && baseDeDatos[usuarioActual] && baseDeDatos[usuarioActual].rol === 'organizador';
    const is_lector = is_auth && baseDeDatos[usuarioActual] && baseDeDatos[usuarioActual].rol === 'lector';
    
    document.querySelectorAll('.req-auth').forEach(btn => { 
        btn.style.display = (!is_auth) ? 'none' : 'inline-block'; 
    });
    
    document.querySelectorAll('.req-org').forEach(btn => { 
        btn.style.display = (!is_org) ? 'none' : 'inline-block'; 
    });

    document.querySelectorAll('.req-lector').forEach(btn => { 
        btn.style.display = (!is_lector) ? 'none' : 'inline-block'; 
    });
}

function cargarClubesGlobales() {
    fetch('http://127.0.0.1:5000/api/clubes')
        .then(response => response.json())
        .then(data => {
            if(data.exito && data.clubes) {
                listaClubesGlobal = data.clubes;
                renderizarClubesGlobales();
            }
        })
        .catch(err => console.error("Error al cargar clubes:", err));
}

function renderizarClubesGlobales() {
    const container = document.getElementById('lista-clubes-container');
    const inicioContainer = document.getElementById('inicio-clubes-container');
    if (!container) return;
    const is_authenticated = usuarioActual !== null;
    
    let htmlContent = '';
    if(listaClubesGlobal.length === 0) {
        htmlContent = '<p>No hay clubes disponibles por el momento.</p>';
    } else {
        listaClubesGlobal.forEach((club, index) => {
            let numeroVisual = index + 1;
            let botonesCTA = `<button class="btn-submit req-auth" style="margin: 0; padding: 5px 15px; font-size: 0.85rem; width: auto;" onclick="unirmeAlClub(${club.id_club}, '${club.nombre}')">Unirme al Club</button>`;
            const tipoImg = club.es_online ? 'fa-video' : 'fa-map-marker-alt';
            const imagenUrl = club.imagenURL || `https://via.placeholder.com/400x200?text=${club.img_mock || "Club"}`;

            htmlContent += `
                <div class="panel-box" style="display: flex; flex-direction: column; padding: 0; overflow: hidden; margin-bottom: 0;">
                    <img src="${imagenUrl}" alt="Club Portada" style="width:100%; height: 180px; object-fit:cover;">
                    <div style="padding: 20px; flex: 1; display: flex; flex-direction: column;">
                        <h4 style="margin: 0 0 10px 0; color: var(--header-bg); font-size: 1.1rem;">Club #${numeroVisual}: ${club.nombre}</h4>
                        <p style="margin: 5px 0; font-size: 0.85rem; color: #555;"><i class="fas fa-book-open"></i> Temática: <strong>${club.tematica || 'General'}</strong></p>
                        <p style="margin: 5px 0; font-size: 0.85rem; color: #555;"><i class="fas fa-user-tie"></i> Org: ${club.organizador}</p>
                        <p style="margin: 5px 0; font-size: 0.85rem; color: #555;"><i class="fas ${tipoImg}"></i> Sede: ${club.sede || 'Online'}</p>
                        <p style="margin: 5px 0; font-size: 0.85rem; color: #555;"><i class="fas fa-calendar-alt"></i> Horario: ${club.horario || 'Por definir'}</p>
                        <p style="margin: 5px 0; font-size: 0.85rem; color: var(--accent-orange); font-weight:bold;"><i class="fas fa-users"></i> Max cupo: ${club.max_cupo}</p>
                        <div style="margin-top: auto; padding-top: 15px; border-top: 1px solid #eee; text-align: right;">${botonesCTA}</div>
                    </div>
                </div>`;
        });
    }
    
    container.innerHTML = htmlContent;
    if(inicioContainer) inicioContainer.innerHTML = htmlContent;
    aplicarRestriccionGlobal();
}

function unirmeAlClub(id_club, nombre) {
    if(!usuarioActual) { alert("Inicia sesión para unirte a un club."); return; }
    fetch('http://127.0.0.1:5000/api/unirse_club', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: usuarioActual, id_club: id_club })
    }).then(r=>r.json()).then(data => {
        if(data.exito) { alert('Has enviado tu solicitud para unirte al club ' + nombre + '. El organizador la revisará pronto.'); } 
        else { alert(data.mensaje); }
    }).catch(err => alert("Error de conexión."));
}

function cargarLibrosGlobales() {
    fetch('http://127.0.0.1:5000/api/libros')
        .then(response => response.json())
        .then(data => {
            if(data.exito && data.libros) {
                listaLibrosGlobal = data.libros;
                renderizarLibrosGlobales();
            }
        })
        .catch(err => console.error("Error al cargar libros:", err));
}

window.abrirDetalleLibroDesdeLista = function(id_libro) {
    let libro = listaLibrosGlobal.find(l => l.id_libro == id_libro);
    if(libro) {
        window.mostrarDetalleLibro(libro.id_libro, libro.titulo, libro.genero, libro.paginas, libro.sinopsis);
    }
};

window.agregarLecturaDesdeLista = function(id_libro) {
    let libro = listaLibrosGlobal.find(l => l.id_libro == id_libro);
    if(libro) {
        let autorNombre = libro.autor || libro.nombre_autor_externo || 'Autor Desconocido';
        let imgSrc = libro.portada_url || libro.portada || 'https://via.placeholder.com/150x220?text=Libro';
        window.agregarAProximasLecturas(libro.id_libro, libro.titulo, autorNombre, imgSrc);
    }
};

function renderizarLibrosGlobales() {
    const container = document.getElementById('biblioteca-container');
    const inicioContainer = document.getElementById('inicio-libros-container');
    if (!container && !inicioContainer) return;
    
    let htmlBiblioteca = '';
    let htmlInicio = '';

    if(listaLibrosGlobal.length === 0) {
        htmlBiblioteca = '<p>No hay libros en la biblioteca virtual por ahora.</p>';
        htmlInicio = '<p>No hay libros recientes.</p>';
    } else {
        listaLibrosGlobal.forEach((libro) => {
            let imgSrc = libro.portada_url || libro.portada || 'https://via.placeholder.com/150x220?text=Libro';
            let autorNombre = libro.autor || libro.nombre_autor_externo || 'Autor Desconocido';
            
            htmlBiblioteca += `
                <div class="panel-box" style="display: flex; gap: 20px; align-items: flex-start; margin-bottom: 0; padding: 20px;">
                    <img src="${imgSrc}" style="width: 120px; height: 180px; object-fit: cover; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.15);">
                    <div style="flex: 1; display: flex; flex-direction: column;">
                        <h3 style="margin: 0 0 5px 0; color: #333; font-size: 1.2rem;">${libro.titulo}</h3>
                        <p style="margin: 0 0 10px 0; color: var(--accent-orange); font-weight: bold; font-size: 0.95rem;">${autorNombre}</p>
                        
                        <div style="display: flex; gap: 15px; font-size: 0.85rem; color: #666; margin-bottom: 10px;">
                            <span><i class="fas fa-tags"></i> ${libro.genero || 'General'}</span>
                            <span><i class="fas fa-book-open"></i> ${libro.paginas || '?'} Páginas</span>
                        </div>
                        
                        <p style="font-size: 0.85rem; color: #555; line-height: 1.5; margin-bottom: 15px; text-align: justify; background: #f9f9f9; padding: 10px; border-radius: 5px; border-left: 3px solid var(--accent-orange);">${libro.sinopsis || 'Sin descripción'}</p>
                        
                        <div class="contenedor-resenas-libro-${libro.id_libro}" style="margin-bottom: 15px; border-top: 1px solid #eee; padding-top: 10px;">
                            <p style="font-size: 0.8rem; color: #666; font-style: italic;">Cargando reseñas de la comunidad...</p>
                        </div>
                        
                        <div style="display: flex; gap: 10px; margin-top: auto; align-items: center; flex-wrap: wrap;">
                            <button class="btn-outline req-lector" style="margin: 0; padding: 8px; font-size: 0.85rem; width: auto;" onclick="window.agregarLecturaDesdeLista(${libro.id_libro})"><i class="fas fa-plus"></i> Añadir a mi lista</button>
                        </div>
                    </div>
                </div>`;

            htmlInicio += `
                <div class="panel-box" style="display: flex; gap: 15px; align-items: center; margin-bottom: 0; padding: 15px;">
                    <img src="${imgSrc}" style="width: 80px; height: 120px; object-fit: cover; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <div style="flex: 1;">
                        <h4 style="margin: 0 0 5px 0; color: #333; font-size: 1.05rem;">${libro.titulo}</h4>
                        <p style="margin: 0 0 8px 0; color: var(--accent-orange); font-weight: bold; font-size: 0.85rem;">${autorNombre}</p>
                        
                        <div style="display: flex; flex-direction: column; gap: 5px; font-size: 0.8rem; color: #666; margin-bottom: 10px;">
                            <span><i class="fas fa-tags"></i> ${libro.genero || 'General'}</span>
                            <span><i class="fas fa-book-open"></i> ${libro.paginas || '?'} Páginas</span>
                        </div>
                        
                        <button class="btn-outline req-lector" style="margin: 0; padding: 6px 10px; font-size: 0.8rem; width: auto;" onclick="window.agregarLecturaDesdeLista(${libro.id_libro})"><i class="fas fa-plus"></i> Añadir a mi lista</button>
                    </div>
                </div>`;
        });
    }
    
    if(container) container.innerHTML = htmlBiblioteca;
    if(inicioContainer) inicioContainer.innerHTML = htmlInicio;
    aplicarRestriccionGlobal();

    if (listaLibrosGlobal.length > 0) {
        listaLibrosGlobal.forEach((libro) => {
            fetch('http://127.0.0.1:5000/api/resenas_libro', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ id_libro: libro.id_libro })
            }).then(r => r.json()).then(res => {
                let contenedores = document.querySelectorAll('.contenedor-resenas-libro-' + libro.id_libro);
                
                if (res.exito && contenedores.length > 0) {
                    let htmlResenas = '';
                    if (res.resenas.length === 0) {
                        htmlResenas = '<p style="font-size: 0.85rem; color: #888; font-style: italic; margin: 0;">Aún no hay reseñas para este libro. ¡Sé el primero!</p>';
                    } else {
                        htmlResenas = '<h4 style="margin: 0 0 10px 0; color: #333; font-size: 0.95rem;"><i class="fas fa-star" style="color: #f1c40f;"></i> Reseñas de la comunidad</h4><div style="max-height: 130px; overflow-y: auto; padding-right: 5px;">';
                        res.resenas.forEach(r => {
                            let estrellas = '⭐'.repeat(r.calificacion);
                            htmlResenas += `
                                <div style="background: #fff; padding: 10px; border: 1px solid #e0e0e0; border-radius: 5px; margin-bottom: 8px;">
                                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                        <strong style="font-size: 0.85rem; color: var(--header-bg);">${r.username}</strong>
                                        <span style="font-size: 0.8rem;">${estrellas}</span>
                                    </div>
                                    <p style="margin: 0; font-size: 0.85rem; color: #555; font-style: italic;">"${r.comentario}"</p>
                                </div>
                            `;
                        });
                        htmlResenas += '</div>';
                    }
                    contenedores.forEach(div => div.innerHTML = htmlResenas);
                }
            });
        });
    }
}

function cargarSedesGlobales() {
    fetch('http://127.0.0.1:5000/api/sedes')
        .then(response => response.json())
        .then(data => {
            if(data.exito && data.sedes) {
                listaSedesGlobal = data.sedes;
                renderizarSedesGlobales();
            }
        })
        .catch(err => console.error("Error al cargar sedes:", err));
}

function renderizarSedesGlobales() {
    const container = document.getElementById('espacios-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    if(listaSedesGlobal.length === 0) {
        container.innerHTML = '<p style="color: #666; font-size: 0.9rem;">No hay sedes o espacios disponibles por ahora.</p>';
        return;
    }

    listaSedesGlobal.forEach((sede) => {
        let fotoSrc = sede.foto || 'https://via.placeholder.com/400x200?text=Sede';
        let amenidadesList = sede.amenidades ? sede.amenidades : 'No especificadas';
        let precioTxt = sede.precio ? `$${sede.precio} MXN` : 'Gratis / Por consumo';
        
        let btnAccion = `<button class="btn-outline req-auth" style="margin: 0; padding: 8px 15px; font-size: 0.85rem; width:auto;" onclick="window.abrirChat('${sede.username}', null)"><i class="fas fa-envelope"></i> Contactar Sede</button>`;
        let btnCotizar = `<button class="btn-submit req-org" style="margin: 0 0 0 10px; padding: 8px 15px; font-size: 0.85rem; width:auto;" onclick="window.abrirModalPedirCotizacion('${sede.username}')"><i class="fas fa-file-invoice-dollar"></i> Cotizar</button>`;
        let btnReservar = `<button class="btn-submit req-org" style="margin: 0 0 0 10px; padding: 8px 15px; font-size: 0.85rem; width:auto; background: var(--header-bg);" onclick="window.abrirModalPedirReserva('${sede.username}')"><i class="fas fa-calendar-check"></i> Reservar</button>`;

        container.innerHTML += `
            <div class="panel-box" style="padding: 0; overflow: hidden; margin-bottom: 0;">
                <img src="${fotoSrc}" style="width: 100%; height: 180px; object-fit: cover;">
                <div style="padding: 20px;">
                    <h3 style="margin: 0 0 10px 0; color: var(--header-bg);">${sede.nombre}</h3>
                    <p style="margin: 5px 0; font-size: 0.9rem; color: #555;"><i class="fas fa-map-marker-alt" style="color: var(--accent-orange); width: 20px;"></i> ${sede.direccion}</p>
                    <p style="margin: 5px 0; font-size: 0.9rem; color: #555;"><i class="fas fa-users" style="color: var(--accent-orange); width: 20px;"></i> Capacidad: ${sede.min} - ${sede.max} pax</p>
                    <p style="margin: 5px 0; font-size: 0.9rem; color: #555;"><i class="fas fa-dollar-sign" style="color: var(--accent-orange); width: 20px;"></i> Precio p/p: ${precioTxt}</p>
                    <p style="margin: 5px 0; font-size: 0.9rem; color: #555;"><i class="fas fa-concierge-bell" style="color: var(--accent-orange); width: 20px;"></i> ${amenidadesList}</p>
                    <div style="margin-top: 15px; text-align: right; display: flex; justify-content: flex-end; flex-wrap:wrap; gap: 5px;">${btnAccion} ${btnCotizar} ${btnReservar}</div>
                </div>
            </div>`;
    });
    aplicarRestriccionGlobal();
}

// ==========================================
// LÓGICA DEL DIRECTORIO DE ORGANIZADORES
// ==========================================
let listaComunidadGlobal = []; // Variable global para guardar los datos

function cargarComunidad() {
    const grid = document.getElementById('comunidad-grid');
    if (!grid) return; 
    
    fetch('http://127.0.0.1:5000/api/comunidad')
        .then(response => response.json())
        .then(data => {
            if(data.exito && data.usuarios) {
                listaComunidadGlobal = data.usuarios;
                grid.innerHTML = ''; 
                
                if(listaComunidadGlobal.length === 0) {
                    grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #888;">No hay organizadores registrados aún.</p>';
                    return;
                }
                
                // Dibujamos las tarjetas interactivas
                listaComunidadGlobal.forEach((org, index) => {
                    const fotoSrc = org.foto_perfil_url || monitoGris;
                    const cantidadClubes = org.clubes ? org.clubes.length : 0;
                    
                    const card = document.createElement('div');
                    card.className = 'panel-box';
                    card.style.padding = '25px 15px';
                    card.style.cursor = 'pointer'; 
                    card.style.transition = 'transform 0.2s';
                    card.onmouseover = () => card.style.transform = 'scale(1.03)';
                    card.onmouseout = () => card.style.transform = 'scale(1)';
                    card.onclick = () => window.mostrarPerfilOrg(index); 
                    
                    // Envolvemos todo en una columna flexbox súper estricta
                    card.innerHTML = `
                        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%;">
                            <img src="${fotoSrc}" style="border-radius: 50%; width: 80px; height: 80px; object-fit: cover; border: 3px solid var(--accent-orange); margin-bottom: 10px;">
                            <h3 style="margin: 0 0 5px 0; font-size: 1.1rem; color: #333; text-align: center; align-self: center;">${org.nombre_completo}</h3>
                            <p style="margin: 0 0 10px 0; font-size: 0.85rem; color: #666; text-align: center;"><i class="fas fa-map-marker-alt"></i> ${org.ciudad || 'Ubicación oculta'}</p>
                            <p style="color: white; background: var(--header-bg); display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 0.75rem; font-weight: bold; margin: 0;">
                                <i class="fas fa-layer-group"></i> ${cantidadClubes} Clubes Activos
                            </p>
                        </div>
                    `;
                    grid.appendChild(card);
                });
            }
        }).catch(err => console.error("Error al cargar comunidad:", err));
}

window.mostrarPerfilOrg = function(index) {
    let org = listaComunidadGlobal[index];
    
    document.getElementById('perfil-usuario-nombre').innerText = org.nombre_completo;
    document.getElementById('perfil-usuario-rol').innerText = "Organizador Experto";
    document.getElementById('perfil-usuario-ciudad').innerText = org.ciudad || "No especificada";
    document.getElementById('perfil-usuario-telefono').innerText = org.telefono || "Oculto";
    document.getElementById('perfil-usuario-bio').innerText = '"' + (org.bio || "Sin biografía aún.") + '"';
    document.getElementById('perfil-usuario-foto').src = org.foto_perfil_url || monitoGris;
    
    let contClubes = document.getElementById('perfil-usuario-clubes');
    let contenedorPadre = document.getElementById('perfil-clubes-container');
    
    if(contClubes && contenedorPadre) {
        contenedorPadre.style.display = 'block'; 
        
        // ¡Magia! Le decimos que ponga el título de Clubes
        let tituloSeccion = contenedorPadre.querySelector('h4');
        if(tituloSeccion) tituloSeccion.innerHTML = '<i class="fas fa-users"></i> Clubes que organiza';
        
        contClubes.innerHTML = '';
        
        if(!org.clubes || org.clubes.length === 0) {
            contClubes.innerHTML = '<p style="font-size:0.85rem; color:#888; font-style:italic; text-align:center;">No tiene clubes activos en este momento.</p>';
        } else {
            org.clubes.forEach((c, idx) => {
                let numeroVisual = idx + 1;
                let ubicacion = c.enlace_online ? c.enlace_online : (c.modalidad === 'Online' ? 'Online' : 'Sede Física');
                let imagenUrl = c.portada_url || 'https://via.placeholder.com/400x200?text=Club';
                
                contClubes.innerHTML += `
                <div style="background: white; border-radius: 8px; overflow: hidden; border: 1px solid #ddd; box-shadow: 0 4px 8px rgba(0,0,0,0.05); text-align: left;">
                    <img src="${imagenUrl}" style="width: 100%; height: 160px; object-fit: cover; display: block;">
                    <div style="padding: 20px;">
                        <h4 style="margin: 0 0 10px 0; color: var(--header-bg); font-size: 1.1rem;">Club #${numeroVisual}: ${c.nombre}</h4>
                        <p style="margin: 5px 0; font-size: 0.85rem; color: #555;"><i class="fas fa-book-open" style="color: #666; width: 20px;"></i> Temática: <strong>${c.tematica || 'General'}</strong></p>
                        <p style="margin: 5px 0; font-size: 0.85rem; color: #555;"><i class="fas fa-user-tie" style="color: #666; width: 20px;"></i> Org: ${org.nombre_completo}</p>
                        <p style="margin: 5px 0; font-size: 0.85rem; color: #555;"><i class="fas fa-map-marker-alt" style="color: #666; width: 20px;"></i> Sede: ${ubicacion}</p>
                        <p style="margin: 5px 0; font-size: 0.85rem; color: #555;"><i class="fas fa-calendar-alt" style="color: #666; width: 20px;"></i> Horario: ${c.horario_texto || 'Por definir'}</p>
                        <p style="margin: 5px 0; font-size: 0.85rem; color: var(--header-bg); font-weight: bold;"><i class="fas fa-users" style="color: var(--header-bg); width: 20px;"></i> Max cupo: ${c.cupo_maximo || 'N/A'}</p>
                    </div>
                </div>`;
            });
        }
    }
    abrirModal('modal-perfil-usuario');
};


function actualizarUIClubes() {
    document.querySelectorAll('.club-org-card').forEach(tarjeta => {
        let nombreElement = tarjeta.querySelector('.club-org-nombre') || tarjeta.querySelector('h4');
        if(!nombreElement) return;
        let nombreClub = nombreElement.innerText.replace(/^(Club|Evento) #\d+:\s*/, "").replace("Presencial", "").replace("Online", "").trim();
        let contenedorNotas = tarjeta.querySelector('.notas-dom-org');
        
        if(contenedorNotas) {
            contenedorNotas.innerHTML = '';
            if(notasGlobales[nombreClub]) {
                notasGlobales[nombreClub].forEach(notaTexto => {
                    contenedorNotas.innerHTML += `<div style="margin-top: 10px; padding: 10px; background: #fffdf5; border-left: 3px solid #f1c40f; font-size: 0.85rem; color: #555; border-radius: 4px; font-style: italic; box-shadow: 0 1px 3px rgba(0,0,0,0.05);"><i class="fas fa-sticky-note" style="color: #f1c40f;"></i> "${notaTexto}"</div>`;
                });
            }
        }
    });

    let contenedorListaNotasModal = document.getElementById('lista-notas-evento');
    let tituloModalAutor = document.getElementById('detalle-evento-nombre');
    if(contenedorListaNotasModal && tituloModalAutor && tituloModalAutor.innerText) {
        let nombreModal = tituloModalAutor.innerText.replace(/^(Evento) #\d+:\s*/, "").trim();
        contenedorListaNotasModal.innerHTML = '';
        if(notasGlobales[nombreModal] && notasGlobales[nombreModal].length > 0) {
            notasGlobales[nombreModal].forEach(notaTexto => {
                contenedorListaNotasModal.innerHTML += `<div style="margin-top: 10px; padding: 10px; background: #fffdf5; border-left: 3px solid #f1c40f; font-size: 0.85rem; color: #555; border-radius: 4px; font-style: italic;"><i class="fas fa-sticky-note" style="color: #f1c40f;"></i> "${notaTexto}"</div>`;
            });
        } else {
            contenedorListaNotasModal.innerHTML = '<p style="font-size: 0.85rem; color: #999; font-style: italic;">No hay notas guardadas.</p>';
        }
    }
}

// ==========================================
// FUNCIONES DE MODALES PARA SEDES Y CHAT 
// ==========================================

window.abrirModalPedirCotizacion = function(sedeUsername) {
    let form = document.getElementById('form-pedir-cotizacion');
    if (form) form.reset(); 
    
    let inputSede = document.getElementById('pedir-cot-username-sede');
    if (inputSede) inputSede.value = sedeUsername;
    
    abrirModal('modal-pedir-cotizacion');
};

window.abrirModalPedirReserva = function(sedeUsername) {
    let form = document.getElementById('form-pedir-reserva');
    if (form) form.reset();
    
    let inputSede = document.getElementById('pedir-res-username-sede');
    if (inputSede) inputSede.value = sedeUsername;
    
    let inputPersonas = document.getElementById('pedir-res-personas');
    if (inputPersonas) {
        inputPersonas.readOnly = false;
        inputPersonas.style.background = "";
    }
    
    let inputFecha = document.getElementById('pedir-res-fecha');
    let inputHora = document.getElementById('pedir-res-hora');
    if (inputFecha && inputHora) {
        inputFecha.readOnly = false;
        inputFecha.style.background = "";
        inputHora.readOnly = false;
        inputHora.style.background = "";
    }
    
    window.precioReservaMemoria = 0;
    
    abrirModal('modal-pedir-reserva');
};

window.abrirModalResponderCotizacion = function(id_cotizacion, concepto, personas, fecha) {
    let form = document.getElementById('form-enviar-cotizacion');
    if (form) form.reset();
    
    let inputId = document.getElementById('cot-id');
    if (inputId) inputId.value = id_cotizacion;
    
    let inputConcepto = document.getElementById('cot-concepto');
    if (inputConcepto) inputConcepto.value = concepto;
    
    let inputPersonas = document.getElementById('cot-personas');
    if (inputPersonas) inputPersonas.value = personas;

    let inputFecha = document.getElementById('cot-fecha');
    if (inputFecha) inputFecha.value = fecha;

    let infoGeneral = document.getElementById('cot-info-general');
    if (infoGeneral) {
        infoGeneral.value = `Amenidades: ${datosSede.amenidades}\nCuenta Bancaria: ${datosSede.cuenta}\nPromociones: ${datosSede.promociones}`;
    }
    
    abrirModal('modal-enviar-cotizacion');
};

window.abrirDetalleCotizacionOrg = function(index) {
    let accion = accionesOrgPendientes[index];
    
    document.getElementById('det-cot-sede').innerText = accion.sede_nombre;
    document.getElementById('det-cot-total').innerText = accion.precio_estimado;
    document.getElementById('det-cot-pp').innerText = accion.precio_persona || 'No especificado';
    document.getElementById('det-cot-notas').innerText = accion.notas_sede;
    
    document.getElementById('det-cot-botones').innerHTML = `
        <button class="btn-submit" style="margin: 0; flex: 1; font-size: 0.9rem;" onclick="window.resolverCotizacionOrg(${index}, true, '${accion.sedeUsername}'); cerrarModal('modal-detalle-cotizacion');"><i class="fas fa-check"></i> Aceptar y Reservar</button>
        <button class="btn-outline" style="margin: 0; flex: 1; border-color: #e74c3c; color: #e74c3c; font-size: 0.9rem;" onclick="window.resolverCotizacionOrg(${index}, false, '${accion.sedeUsername}'); cerrarModal('modal-detalle-cotizacion');"><i class="fas fa-times"></i> Rechazar</button>
    `;
    
    abrirModal('modal-detalle-cotizacion');
};

window.abrirBandejaMensajes = function() {
    if(!usuarioActual) { alert("Inicia sesión primero para ver tus mensajes."); return; }
    abrirModal('messages-modal');
    document.getElementById('lista-mensajes').innerHTML = '<p style="text-align:center; color:#666;">Cargando contactos...</p>';
    
    fetch('http://127.0.0.1:5000/api/bandeja_mensajes', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({username: usuarioActual})
    }).then(r=>r.json()).then(data => {
        if(data.exito) {
            listaContactosGlobal = data.contactos; 
            
            let totalPendientes = 0;
            listaContactosGlobal.forEach(c => totalPendientes += (c.sin_leer || 0));
            contadores.mensajes = totalPendientes;
            actualizarHeader(); 
            
            window.renderizarContactos(listaContactosGlobal);
        }
    });
}

window.renderizarContactos = function(lista) {
    let html = '';
    lista.forEach(c => {
        let img = c.foto || monitoGris;
        let esNoLeido = c.sin_leer && c.sin_leer > 0;
        
        let estiloTexto = esNoLeido ? 'color:#111; font-weight:bold;' : 'color:#888;';
        let desc = c.ultimo_mensaje ? `<span style="${estiloTexto} font-size:0.8rem;">${c.ultimo_mensaje}</span>` : `<span style="color:#ccc; font-style:italic; font-size:0.8rem;">Iniciar conversación...</span>`;
        
        let etiqueta = c.rol === 'club' ? '<i class="fas fa-users" style="color:var(--accent-orange);"></i>' : '<i class="fas fa-user" style="color:#3498db;"></i>';
        
        let badgeNotif = esNoLeido ? `<span style="background:var(--accent-orange); color:white; border-radius:50%; padding:2px 6px; font-size:0.7rem; margin-left:5px;">${c.sin_leer}</span>` : '';
        
        let parametrosChat = c.rol === 'club' ? `null, '${c.id_chat}'` : `'${c.id_chat}', null`;
        
        html += `
        <div style="display:flex; align-items:center; gap:10px; padding:12px; border-bottom:1px solid #eee; cursor:pointer; transition: 0.2s; ${esNoLeido ? 'background:#fff9f0;' : ''}" onmouseover="this.style.background='#f9f9f9'" onmouseout="this.style.background='${esNoLeido ? '#fff9f0' : 'transparent'}'" onclick="cerrarModal('messages-modal'); window.abrirChat(${parametrosChat})">
            <img src="${img}" style="width:45px; height:45px; border-radius:50%; object-fit:cover; border: 2px solid #ddd;">
            <div style="flex:1; overflow:hidden;">
                <h4 style="margin:0; font-size:0.95rem; color:#333;">${c.nombre} ${etiqueta} ${badgeNotif}</h4>
                <div style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-top:3px;">${desc}</div>
            </div>
        </div>`;
    });
    if(lista.length === 0) html = '<p style="text-align:center; color:#666;">No se encontraron contactos disponibles.</p>';
    document.getElementById('lista-mensajes').innerHTML = html;
}

window.filtrarContactos = function() {
    let q = document.getElementById('buscador-contactos').value.toLowerCase();
    let filtrados = listaContactosGlobal.filter(c => c.nombre.toLowerCase().includes(q) || c.id_chat.toLowerCase().includes(q));
    window.renderizarContactos(filtrados);
}



window.abrirChat = function(destinatarioUsername, nombreClub) {
    if (!usuarioActual) {
        alert("Inicia sesión para poder enviar mensajes.");
        return;
    }
    
    let title = document.getElementById('chat-room-title');
    
    // Identificamos si estamos abriendo un club o un usuario directo
    chatActualEsClub = nombreClub ? true : false;
    chatActualDestino = nombreClub ? nombreClub : destinatarioUsername;
    
    if (title) title.innerText = chatActualDestino;
    
    let bodyChat = document.getElementById('chat-room-body');
    if (bodyChat) bodyChat.innerHTML = '<p style="text-align:center; color:#666;">Cargando mensajes...</p>';
    
    abrirModal('chat-room-modal');

    abrirModal('chat-room-modal');
    
    // --- NUEVO: Restar el contador global si este chat tenía mensajes sin leer ---
    let contactoActual = listaContactosGlobal.find(c => c.id_chat === chatActualDestino);
    if(contactoActual && contactoActual.sin_leer > 0) {
        contadores.mensajes -= contactoActual.sin_leer;
        if(contadores.mensajes < 0) contadores.mensajes = 0;
        contactoActual.sin_leer = 0; // Lo ponemos en 0 localmente
        actualizarHeader(); // Actualizamos la vista
    }
   
    
    // Marcar mensajes como leídos
    if (!chatActualEsClub) { 
        fetch('http://127.0.0.1:5000/api/marcar_leidos', {
            method: 'POST', 
            headers: {'Content-Type': 'application/json'}, 
            body: JSON.stringify({usuario_actual: usuarioActual, contacto: destinatarioUsername})
        });
    } else {
        fetch('http://127.0.0.1:5000/api/marcar_leidos_club', {
            method: 'POST', 
            headers: {'Content-Type': 'application/json'}, 
            body: JSON.stringify({usuario_actual: usuarioActual, nombre_club: nombreClub})
        });
    }
    

    fetch('http://127.0.0.1:5000/api/historial_chat', {
        method: 'POST', 
        headers: {'Content-Type': 'application/json'}, 
        body: JSON.stringify({remitente: usuarioActual, destinatario: chatActualDestino})
    }).then(r => r.json()).then(res => {
        if(res.exito && bodyChat) {
            let html = '';
            res.mensajes.forEach(m => {
                let alineacion = (m.remitente === usuarioActual) ? 'flex-end' : 'flex-start';
                let colorBg = (m.remitente === usuarioActual) ? 'var(--accent-orange)' : 'white';
                let colorTxt = (m.remitente === usuarioActual) ? 'white' : '#333';
                html += `<div style="display: flex; flex-direction: column; align-items: ${alineacion}; margin-bottom: 10px;">
                    <span style="font-size: 0.75rem; color: #888; margin-bottom: 2px;">${m.remitente}</span>
                    <div style="background: ${colorBg}; color: ${colorTxt}; padding: 10px 15px; border-radius: 15px; max-width: 80%; box-shadow: 0 1px 3px rgba(0,0,0,0.1); word-break: break-word;">${m.contenido}</div>
                </div>`;
            });
            if(res.mensajes.length === 0) html = '<p style="text-align:center; color:#666;">No hay mensajes previos.</p>';
            bodyChat.innerHTML = html;
            bodyChat.scrollTop = bodyChat.scrollHeight;
        }
    });
};

window.enviarMensajeChat = function() {
    let input = document.getElementById('chat-input');
    if(!input || input.value.trim() === '') return;
    
    fetch('http://127.0.0.1:5000/api/enviar_mensaje', {
        method: 'POST', 
        headers: {'Content-Type': 'application/json'}, 
        body: JSON.stringify({remitente: usuarioActual, destinatario: chatActualDestino, contenido: input.value})
    }).then(r => r.json()).then(res => {
        if(res.exito) {
            input.value = '';
            // Recargar chat con los parámetros correctos
            if (chatActualEsClub) {
                window.abrirChat(null, chatActualDestino);
            } else {
                window.abrirChat(chatActualDestino, null);
            }
        } else {
            alert("Error: " + res.mensaje);
        }
    });
};


window.enviarImagenChat = function(input) {
    if (input.files && input.files[0]) {
        let reader = new FileReader();
        
        reader.onload = function(e) {
            let base64Image = e.target.result;
            
            let contenidoHtml = `<img src="${base64Image}" style="max-width: 100%; border-radius: 8px; margin-top: 5px; border: 2px solid rgba(0,0,0,0.1);">`;

            fetch('http://127.0.0.1:5000/api/enviar_mensaje', {
                method: 'POST', 
                headers: {'Content-Type': 'application/json'}, 
                body: JSON.stringify({
                    remitente: usuarioActual, 
                    destinatario: chatActualDestino, 
                    contenido: contenidoHtml
                })
            }).then(r => r.json()).then(res => {
                if(res.exito) {
                    input.value = ""; 
                    
                    if (chatActualEsClub) {
                        window.abrirChat(null, chatActualDestino);
                    } else {
                        window.abrirChat(chatActualDestino, null);
                    }
                } else {
                    alert("Error al enviar imagen: " + res.mensaje);
                }
            });
        };
        
        reader.readAsDataURL(input.files[0]);
    }
};

window.prepararReservaDesdeTarea = function(sedeUsername, precio, personas, fechaCompleta) {
    let form = document.getElementById('form-pedir-reserva');
    if(form) form.reset();
    
    let inputSede = document.getElementById('pedir-res-username-sede');
    if(inputSede) inputSede.value = sedeUsername;
    
    let inputPersonas = document.getElementById('pedir-res-personas');
    if(inputPersonas) {
        if(personas) {
            inputPersonas.value = personas;
            inputPersonas.readOnly = true;
            inputPersonas.style.background = "#f4f4f4";
        } else {
            inputPersonas.value = '';
            inputPersonas.readOnly = false;
            inputPersonas.style.background = "";
        }
    }
    
    let inputFecha = document.getElementById('pedir-res-fecha');
    let inputHora = document.getElementById('pedir-res-hora');
    
    if(inputFecha && inputHora) {
        if(fechaCompleta) {
            let partesFecha = fechaCompleta.split(' ');
            inputFecha.value = partesFecha[0] || '';
            inputHora.value = partesFecha[1] || '';
            
            inputFecha.readOnly = true;
            inputFecha.style.background = "#f4f4f4";
            inputHora.readOnly = true;
            inputHora.style.background = "#f4f4f4";
        } else {
            inputFecha.value = '';
            inputHora.value = '';
            inputFecha.readOnly = false;
            inputFecha.style.background = "";
            inputHora.readOnly = false;
            inputHora.style.background = "";
        }
    }
    
    window.precioReservaMemoria = precio ? parseFloat(precio) : 0;
    
    abrirModal('modal-pedir-reserva');
};

// ==========================================
// EVENTOS SUBMIT SEGUROS PARA FORMULARIOS
// ==========================================

let formCotizacion = document.getElementById('form-pedir-cotizacion');
if (formCotizacion) {
    formCotizacion.addEventListener('submit', function(e) {
        e.preventDefault();
        
        let fechaCompleta = document.getElementById('pedir-cot-fecha').value + ' ' + document.getElementById('pedir-cot-hora').value;
        
        let data = {
            username: usuarioActual,
            sede_username: document.getElementById('pedir-cot-username-sede').value,
            concepto: document.getElementById('pedir-cot-concepto').value,
            personas: document.getElementById('pedir-cot-personas').value,
            fecha: fechaCompleta
        };
        fetch('http://127.0.0.1:5000/api/pedir_cotizacion', {
            method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data)
        }).then(r => r.json()).then(res => {
            alert(res.mensaje);
            if(res.exito) cerrarModal('modal-pedir-cotizacion');
        });
    });
}

let formReserva = document.getElementById('form-pedir-reserva');
if (formReserva) {
    formReserva.addEventListener('submit', function(e) {
        e.preventDefault();
        
        let fechaCompleta = document.getElementById('pedir-res-fecha').value + ' ' + document.getElementById('pedir-res-hora').value;
        
        let data = {
            username: usuarioActual,
            sede_username: document.getElementById('pedir-res-username-sede').value,
            nombre: document.getElementById('pedir-res-nombre').value,
            personas: document.getElementById('pedir-res-personas').value,
            fecha: fechaCompleta,
            notas: document.getElementById('pedir-res-notas').value,
            total: window.precioReservaMemoria
        };
        
        fetch('http://127.0.0.1:5000/api/pedir_reserva', {
            method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data)
        }).then(r => r.json()).then(res => {
            alert(res.mensaje);
            if(res.exito) {
                cerrarModal('modal-pedir-reserva');
                
                let indexTarea = accionesOrgPendientes.findIndex(t => t.tipo === 'tarea' && t.texto.includes(data.sede_username));
                if (indexTarea !== -1) {
                    fetch('http://127.0.0.1:5000/api/marcar_tarea', {
                        method: 'POST', headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({ id_tarea: accionesOrgPendientes[indexTarea].id })
                    }).then(() => {
                        accionesOrgPendientes.splice(indexTarea, 1);
                        renderAccionesOrg();
                    });
                }
            }
        });
    });
}

let formEnviarCot = document.getElementById('form-enviar-cotizacion');
if (formEnviarCot) {
    formEnviarCot.addEventListener('submit', function(e) {
        e.preventDefault();
        let data = {
            id_cotizacion: document.getElementById('cot-id').value,
            precio_persona: document.getElementById('cot-precio-persona').value,
            precio: document.getElementById('cot-precio').value,
            info_general: document.getElementById('cot-info-general').value,
            notas: document.getElementById('cot-notas').value
        };
        fetch('http://127.0.0.1:5000/api/responder_cotizacion', {
            method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data)
        }).then(r => r.json()).then(res => {
            alert(res.mensaje);
            if(res.exito) {
                cerrarModal('modal-enviar-cotizacion');
                let cot = cotizacionesSede.find(c => c.id_cotizacion == data.id_cotizacion);
                if(cot) { 
                    cot.estado = 'Respondida'; 
                    cot.precio_estimado = data.precio; 
                    cot.precio_persona = data.precio_persona;
                }
                renderizarPanelesSede();
            }
        });
    });
}

let formEditarSede = document.getElementById('form-editar-sede');
if (formEditarSede) {
    formEditarSede.addEventListener('submit', function(e) {
        e.preventDefault();
        let data = {
            username: usuarioActual,
            cupoMin: document.getElementById('sede-min').value,
            cupoMax: document.getElementById('sede-max').value,
            precio: document.getElementById('sede-precio').value,
            amenidades: document.getElementById('sede-amenidades').value,
            promociones: document.getElementById('sede-promociones').value,
            cuentaBancaria: document.getElementById('sede-cuenta').value
        };
        fetch('http://127.0.0.1:5000/api/editar_sede', {
            method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data)
        }).then(r => r.json()).then(res => {
            alert(res.mensaje);
            if(res.exito) {
                cerrarModal('modal-editar-sede');
                datosSede.cupoMin = data.cupoMin;
                datosSede.cupoMax = data.cupoMax;
                datosSede.precio = data.precio;
                datosSede.amenidades = data.amenidades;
                datosSede.promociones = data.promociones;
                datosSede.cuenta = data.cuentaBancaria;
                renderizarPerfilSede();
            }
        });
    });
}

// ==========================================
// LÓGICA PARA EL MODAL DE NOTAS
// ==========================================
window.abrirModalNotas = function(referencia, contexto, btn) {
    clubActualParaNota = referencia;
    document.getElementById('notas-club-nombre').innerText = referencia;
    document.getElementById('texto-nota').value = ''; 
    abrirModal('modal-notas-club');
};

let formNotas = document.getElementById('form-notas-club');
if (formNotas) {
    formNotas.addEventListener('submit', function(e) {
        e.preventDefault();
        let contenidoNota = document.getElementById('texto-nota').value;
        
        fetch('http://127.0.0.1:5000/api/guardar_nota', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                username: usuarioActual,
                club: clubActualParaNota,
                contenido: contenidoNota
            })
        }).then(r => r.json()).then(res => {
            if(res.exito) {
                alert("Nota guardada exitosamente.");
                cerrarModal('modal-notas-club');
                
                if (!notasGlobales[clubActualParaNota]) {
                    notasGlobales[clubActualParaNota] = [];
                }
                notasGlobales[clubActualParaNota].push(contenidoNota);
                
                if(baseDeDatos[usuarioActual].rol === 'sede') {
                    renderizarPanelesSede();
                } else {
                    actualizarUIClubes();
                }
            } else {
                alert("Error al guardar: " + res.mensaje);
            }
        }).catch(err => alert("Error de conexión al guardar nota."));
    });
}

// ==========================================
// LÓGICA PARA EDITAR EVENTOS DE LA SEDE
// ==========================================
window.abrirModalEditarEventoSede = function(index) {
    indexEventoSedeEditando = index; 
    let ev = eventosSedeLista[index];
    
    let nombreLimpio = ev.nombre.replace(/^Evento #\d+:\s*/, "");
    
    document.getElementById('edit-ev-sede-nombre').value = nombreLimpio; 
    document.getElementById('edit-ev-sede-org').value = ev.organizador;
    document.getElementById('edit-ev-sede-fecha').value = `${ev.fecha} ${ev.hora}`; 
    document.getElementById('edit-ev-sede-personas').value = ev.personas;
    document.getElementById('edit-ev-sede-estado').value = ev.estado; 
    document.getElementById('edit-ev-sede-total').value = ev.total; 
    document.getElementById('edit-ev-sede-abono').value = ev.abono;
    
    abrirModal('modal-editar-evento-sede');
};

let formEditarEventoSede = document.getElementById('form-editar-evento-sede');
if (formEditarEventoSede) {
    formEditarEventoSede.addEventListener('submit', function(e) {
        e.preventDefault();
        
        let data = {
            username: usuarioActual,
            nombre: document.getElementById('edit-ev-sede-nombre').value,
            personas: document.getElementById('edit-ev-sede-personas').value,
            estado: document.getElementById('edit-ev-sede-estado').value,
            total: document.getElementById('edit-ev-sede-total').value,
            abono: document.getElementById('edit-ev-sede-abono').value
        };

        fetch('http://127.0.0.1:5000/api/editar_evento_sede', {
            method: 'POST', 
            headers: {'Content-Type': 'application/json'}, 
            body: JSON.stringify(data)
        }).then(r => r.json()).then(res => {
            alert(res.mensaje);
            if(res.exito) {
                cerrarModal('modal-editar-evento-sede');
                
                let ev = eventosSedeLista[indexEventoSedeEditando];
                ev.personas = data.personas;
                ev.estado = data.estado;
                ev.total = data.total;
                ev.abono = data.abono;
                
                renderizarPanelesSede(); 
            }
        }).catch(err => alert("Error de conexión al editar el evento."));
    });
}

// ==========================================
// LÓGICA DE LIBROS (VISTA LECTOR Y GLOBAL)
// ==========================================

// 1. Añadir libro desde la biblioteca global a "Próximas Lecturas"
window.agregarAProximasLecturas = function(id_libro, titulo, autor, img) {
    if(!usuarioActual) {
        alert("Inicia sesión para añadir libros a tu lista.");
        return;
    }
    
    fetch('http://127.0.0.1:5000/api/agregar_lectura', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ username: usuarioActual, id_libro: id_libro })
    })
    .then(r => r.json())
    .then(res => {
        if(res.exito) {
            alert(`¡El libro "${titulo}" se añadió a tus próximas lecturas!`);
            
            proximasLecturasLista.push({
                id_libro: id_libro,
                titulo: titulo,
                autor: autor,
                img: img
            });
            

            if (baseDeDatos[usuarioActual] && baseDeDatos[usuarioActual].rol === 'lector') {
                if(typeof window.renderLecturasLector === 'function') {
                    window.renderLecturasLector();
                }
            }
        

        } else {
            alert("Atención: " + res.mensaje); // Por si ya lo tenía agregado
        }
    })
    .catch(err => alert("Error de conexión al añadir libro."));
};


window.abrirModalEditarLectura = function(index) {
    lecturaEditandoIndex = index;
    
    let form = document.getElementById('form-editar-lectura');
    if(form) form.reset();
    
    document.getElementById('titulo-modal-lectura').innerText = (index === -1) ? "Añadir Nueva Lectura" : "Actualizar Lectura";
    

    if (index !== -1 && lecturasActuales && lecturasActuales[index]) {
        let lectura = lecturasActuales[index];
        document.getElementById('input-lectura-titulo').value = lectura.titulo;
        document.getElementById('input-lectura-autor').value = lectura.autor;
        document.getElementById('input-lectura-leidas').value = lectura.leidas || 0;
        document.getElementById('input-lectura-totales').value = lectura.totales || 0;
    }
    
    abrirModal('modal-editar-lectura');
};


let formEditarLectura = document.getElementById('form-editar-lectura');
if (formEditarLectura) {
    formEditarLectura.addEventListener('submit', function(e) {
        e.preventDefault();
        
        let data = {
            username: usuarioActual,
            titulo: document.getElementById('input-lectura-titulo').value,
            autor: document.getElementById('input-lectura-autor').value,
            // Nos aseguramos de convertirlos a números reales para las matemáticas
            leidas: parseInt(document.getElementById('input-lectura-leidas').value) || 0,
            totales: parseInt(document.getElementById('input-lectura-totales').value) || 0,
            id_libro: null 
        };


        if (lecturaEditandoIndex !== -1 && lecturasActuales && lecturasActuales[lecturaEditandoIndex]) {
            data.id_libro = lecturasActuales[lecturaEditandoIndex].id_libro;
        }

        fetch('http://127.0.0.1:5000/api/editar_lectura', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data)
        })
        .then(r => r.json())
        .then(res => {
            if(res.exito) {
                alert("Lectura guardada correctamente.");
                cerrarModal('modal-editar-lectura');
                

                if (lecturaEditandoIndex !== -1) {
                    lecturasActuales[lecturaEditandoIndex].titulo = data.titulo;
                    lecturasActuales[lecturaEditandoIndex].autor = data.autor;
                    lecturasActuales[lecturaEditandoIndex].leidas = data.leidas;
                    lecturasActuales[lecturaEditandoIndex].totales = data.totales;

                    if (data.leidas >= data.totales && data.totales > 0) {
                        let libroTerminado = lecturasActuales.splice(lecturaEditandoIndex, 1)[0];
                        lecturasTerminadas.push(libroTerminado);
                    }
                } else {

                    let nuevaLectura = {
                        id_libro: res.id_libro || Date.now(), 
                        titulo: data.titulo,
                        autor: data.autor,
                        leidas: data.leidas,
                        totales: data.totales
                    };
                    
                    if (data.leidas >= data.totales && data.totales > 0) {
                        lecturasTerminadas.push(nuevaLectura);
                    } else {
                        lecturasActuales.push(nuevaLectura);
                    }
                }
                

                if(typeof window.renderLecturasLector === 'function') {
                    window.renderLecturasLector();
                }

                
            } else {
                alert("Error: " + res.mensaje);
            }
        })
        .catch(err => alert("Error de conexión al guardar lectura."));
    });
}

// ==========================================
// RENDERIZAR PANEL DEL LECTOR (LIBROS Y ESTADÍSTICAS)
// ==========================================
window.renderLecturasLector = function() {
    let statLibros = document.getElementById('stat-libros');
    let statClubes = document.getElementById('stat-clubes'); 
    let statResenas = document.getElementById('stat-resenas');
    
    if(statLibros) statLibros.innerText = lecturasTerminadas.length; 
    if(statClubes) {
        let misClubes = baseDeDatos[usuarioActual]?.mis_clubes || [];
        statClubes.innerText = misClubes.length; 
    }
    if(statResenas) {
        let misResenas = baseDeDatos[usuarioActual]?.mis_resenas || {};
        statResenas.innerText = Object.keys(misResenas).length;
    }


   let contActuales = document.getElementById('contenedor-lecturas-actuales');
   if (contActuales) {
       contActuales.innerHTML = '';
       if (lecturasActuales.length === 0) {
           contActuales.innerHTML = '<p style="color: #666; font-size: 0.9rem;">No estás leyendo ningún libro actualmente. ¡Añade uno!</p>';
       } else {
           lecturasActuales.forEach((lectura, index) => {
               let porcentaje = lectura.totales > 0 ? (lectura.leidas / lectura.totales) * 100 : 0;
               contActuales.innerHTML += `
                   <div style="background: white; border: 1px solid #eee; padding: 15px; border-radius: 8px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
                       <div style="flex: 1; padding-right: 20px;">
                           <h4 style="margin: 0 0 5px 0; color: #333; font-size: 1.1rem;">${lectura.titulo}</h4>
                           <p style="margin: 0 0 10px 0; font-size: 0.85rem; color: #666;"><i class="fas fa-pen-nib"></i> ${lectura.autor}</p>
                           <div style="display: flex; justify-content: space-between; font-size: 0.8rem; font-weight: bold; color: var(--accent-orange); margin-bottom: 5px;">
                               <span>Progreso</span>
                               <span>${lectura.leidas} / ${lectura.totales} págs</span>
                           </div>
                           <div style="width: 100%; background: #eee; height: 8px; border-radius: 4px; overflow: hidden;">
                               <div style="width: ${porcentaje}%; background: var(--accent-orange); height: 100%; transition: width 0.3s ease;"></div>
                           </div>
                       </div>
                       <div>
                           <button class="btn-outline" style="margin: 0; padding: 8px 12px; font-size: 0.8rem; white-space: nowrap;" onclick="abrirModalEditarLectura(${index})">
                               <i class="fas fa-sync-alt"></i> Actualizar
                           </button>
                       </div>
                   </div>`;
           });
       }
   }


   let contProximas = document.getElementById('contenedor-proximas-lecturas');
   if (contProximas) {
       contProximas.innerHTML = '';
       if (proximasLecturasLista.length === 0) {
           contProximas.innerHTML = '<p style="color: #666; font-size: 0.9rem;">Tu lista de pendientes está vacía.</p>';
       } else {
           proximasLecturasLista.forEach((libro, index) => {
               let img = libro.img || 'https://via.placeholder.com/100x150?text=Libro';
               contProximas.innerHTML += `
                   <div style="min-width: 120px; max-width: 120px; text-align: center; display: flex; flex-direction: column;">
                       <img src="${img}" style="width: 100px; height: 150px; object-fit: cover; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); border: 1px solid #ddd; margin: 0 auto;">
                       <h5 style="margin: 8px 0 2px 0; font-size: 0.85rem; color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${libro.titulo}">${libro.titulo}</h5>
                       <p style="margin: 0 0 8px 0; font-size: 0.75rem; color: #666; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${libro.autor}">${libro.autor}</p>
                       
                       <button class="btn-outline" style="margin-top: auto; padding: 4px; font-size: 0.75rem; border-color: var(--accent-orange); color: var(--accent-orange); width: 100%;" onclick="window.empezarALeer(${index})">
                           <i class="fas fa-play"></i> Empezar
                       </button>
                   </div>`;
           });
       }
   }


   let contTerminadas = document.getElementById('contenedor-lecturas-terminadas');
   if (contTerminadas) {
       contTerminadas.innerHTML = '';
       if (lecturasTerminadas.length === 0) {
           contTerminadas.innerHTML = '<p style="color: #666; font-size: 0.9rem;">Aún no has marcado ningún libro como terminado.</p>';
       } else {
           lecturasTerminadas.forEach(libro => {
               let tituloLimpio = libro.titulo.replace(/'/g, "\\'"); 
               
               let misResenas = baseDeDatos[usuarioActual]?.mis_resenas || {};
               let resenaData = misResenas[libro.id_libro] || (libro.calificacion ? { calificacion: libro.calificacion, comentario: libro.comentario || '' } : null);
               
               let botonResena = resenaData 
                   ? `<button class="btn-outline" style="margin: 0; padding: 4px 8px; font-size: 0.75rem; width: auto; border-color: #27ae60; color: #27ae60;" onclick="window.abrirModalResena(${libro.id_libro}, '${tituloLimpio}', ${resenaData.calificacion}, '${(resenaData.comentario || '').replace(/'/g, "\\'")}')"><i class="fas fa-edit"></i> Ver / Editar</button>`
                   : `<button class="btn-outline" style="margin: 0; padding: 4px 8px; font-size: 0.75rem; width: auto; border-color: var(--accent-orange); color: var(--accent-orange);" onclick="window.abrirModalResena(${libro.id_libro}, '${tituloLimpio}')"><i class="fas fa-star"></i> Reseñar</button>`;

               contTerminadas.innerHTML += `
                   <div style="background: #f9f9f9; border: 1px solid #ddd; padding: 12px 15px; border-radius: 5px; min-width: 230px; border-left: 4px solid #27ae60; display: flex; flex-direction: column; justify-content: space-between;">
                       <div>
                           <h5 style="margin: 0 0 5px 0; color: #333; font-size: 0.95rem;">${libro.titulo}</h5>
                           <p style="margin: 0; font-size: 0.8rem; color: #666;">${libro.autor}</p>
                       </div>
                       <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 15px;">
                           <p style="margin: 0; font-size: 0.75rem; color: #27ae60; font-weight: bold;"><i class="fas fa-check-double"></i> Terminado</p>
                           ${botonResena}
                       </div>
                   </div>`;
           });
       }
   }
};

// ==========================================
// MOVER DE PRÓXIMAS A LECTURAS ACTUALES
// ==========================================
window.empezarALeer = function(index) {
    let libroPendiente = proximasLecturasLista[index];
    
    // El código busca en la biblioteca global para saber cuántas páginas tiene
    let libroBaseDeDatos = listaLibrosGlobal.find(l => l.id_libro == libroPendiente.id_libro);
    let totalPaginas = (libroBaseDeDatos && libroBaseDeDatos.paginas) ? parseInt(libroBaseDeDatos.paginas) : 0;

    let data = {
        username: usuarioActual,
        titulo: libroPendiente.titulo,
        autor: libroPendiente.autor,
        leidas: 0,              // ¡Empieza en la página cero!
        totales: totalPaginas,  // Trae el total de páginas automático
        id_libro: libroPendiente.id_libro
    };

    fetch('http://127.0.0.1:5000/api/editar_lectura', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
    })
    .then(r => r.json())
    .then(res => {
        if(res.exito) {

            proximasLecturasLista.splice(index, 1);

            lecturasActuales.push({
                id_libro: data.id_libro,
                titulo: data.titulo,
                autor: data.autor,
                leidas: 0,
                totales: data.totales
            });
            

            window.renderLecturasLector();
        } else {
            alert("Hubo un error: " + res.mensaje);
        }
    })
    .catch(err => alert("Error de conexión al mover a actuales."));
};

// ==========================================
// LÓGICA DE RESEÑAS
// ==========================================
window.abrirModalResena = function(id_libro, titulo, calificacion = "", comentario = "") {
    document.getElementById('resena-id-libro').value = id_libro;
    document.getElementById('resena-libro-titulo').innerText = titulo;
    
    let form = document.getElementById('form-escribir-resena');
    if(form) form.reset();
    

    if (calificacion) document.getElementById('resena-calificacion').value = calificacion;
    if (comentario) document.getElementById('resena-comentario').value = comentario;
    
    abrirModal('modal-escribir-resena');
};

// ==========================================
// LÓGICA DE RESEÑAS (HÍBRIDA: PRIVADAS Y PÚBLICAS)
// ==========================================
let formResena = document.getElementById('form-escribir-resena');
if (formResena) {
    formResena.addEventListener('submit', function(e) {
        e.preventDefault();
        
        let idOriginal = document.getElementById('resena-id-libro').value;
        let calif = document.getElementById('resena-calificacion').value;
        let coment = document.getElementById('resena-comentario').value;
        

        let libroOficial = listaLibrosGlobal.find(l => String(l.id_libro) === String(idOriginal));
        
        let esPublico = true;
        

        if (!libroOficial) {
            alert("Nota: Este libro fue añadido manualmente. Tu reseña se guardará en tu perfil personal, pero no aparecerá en la Biblioteca Pública.");
            esPublico = false;
        }

        let data = {
            username: usuarioActual,
            id_libro: idOriginal, 
            calificacion: parseInt(calif),
            comentario: coment
        };
        
        fetch('http://127.0.0.1:5000/api/crear_resena', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data)
        }).then(r => r.json()).then(res => {
           if (res.exito) {
                if (esPublico) {
                    alert("¡Reseña publicada con éxito en la Biblioteca Global!");
                }
                
                cerrarModal('modal-escribir-resena');
                
  
                if (baseDeDatos[usuarioActual] && baseDeDatos[usuarioActual].estadisticas) {
                    baseDeDatos[usuarioActual].estadisticas.resenas += 1;
                    let statResenas = document.getElementById('stat-resenas');
                    if (statResenas) statResenas.innerText = baseDeDatos[usuarioActual].estadisticas.resenas;
                }

  
                let libroTerminado = lecturasTerminadas.find(l => String(l.id_libro) === String(data.id_libro));
                if (libroTerminado) {
                    libroTerminado.calificacion = data.calificacion;
                    libroTerminado.comentario = data.comentario;
                }

                if (!baseDeDatos[usuarioActual].mis_resenas) {
                    baseDeDatos[usuarioActual].mis_resenas = {};
                }
                baseDeDatos[usuarioActual].mis_resenas[data.id_libro] = {
                    calificacion: data.calificacion,
                    comentario: data.comentario
                };

      
                if (typeof window.renderLecturasLector === 'function') {
                    window.renderLecturasLector();
                }
                
      
                if (esPublico) {
                    setTimeout(() => {
                        fetch('http://127.0.0.1:5000/api/resenas_libro', {
                            method: 'POST',
                            headers: {'Content-Type': 'application/json'},
                            body: JSON.stringify({ id_libro: data.id_libro })
                        }).then(r2 => r2.json()).then(res2 => {
                            if (res2.exito) {
                                let htmlResenas = '';
                                if (res2.resenas.length > 0) {
                                    htmlResenas = '<h4 style="margin: 0 0 10px 0; color: #333; font-size: 0.95rem;"><i class="fas fa-star" style="color: #f1c40f;"></i> Reseñas de la comunidad</h4><div style="max-height: 130px; overflow-y: auto; padding-right: 5px;">';
                                    res2.resenas.forEach(r => {
                                        let estrellas = '⭐'.repeat(r.calificacion);
                                        let esMia = (r.username === usuarioActual);
                                        let border = esMia ? 'border-left: 4px solid #f1c40f;' : 'border: 1px solid #e0e0e0;';
                                        let etiquetaNombre = esMia ? `${r.username} (Tú)` : r.username;
                                        
                                        htmlResenas += `
                                            <div style="background: #fff; padding: 10px; border-radius: 5px; margin-bottom: 8px; ${border}">
                                                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                                    <strong style="font-size: 0.85rem; color: var(--header-bg);">${etiquetaNombre}</strong>
                                                    <span style="font-size: 0.8rem;">${estrellas}</span>
                                                </div>
                                                <p style="margin: 0; font-size: 0.85rem; color: #555; font-style: italic;">"${r.comentario}"</p>
                                            </div>`;
                                    });
                                    htmlResenas += '</div>';
                                }
                                
   
                                let contenedores = document.querySelectorAll('.contenedor-resenas-libro-' + data.id_libro);
                                contenedores.forEach(div => div.innerHTML = htmlResenas);
                                

                                let modalDetalleResenas = document.getElementById('lista-resenas-dinamicas');
                                if (modalDetalleResenas) modalDetalleResenas.innerHTML = htmlResenas;
                            }
                        });
                    }, 500);
                }

           } else {
                alert("Error de la base de datos: " + res.mensaje);
           }
        }).catch(err => alert("Error de conexión al enviar reseña."));
    });
}

// ==========================================
// RENDERIZAR AUTORES GLOBALES
// ==========================================
let listaAutoresGlobal = []; 

function cargarAutoresGlobales() {
    fetch('http://127.0.0.1:5000/api/autores')
        .then(response => response.json())
        .then(data => {
            if(data.exito && data.autores) {
                listaAutoresGlobal = data.autores;
                renderizarAutoresGlobales(listaAutoresGlobal);
            }
        })
        .catch(err => console.error("Error al cargar autores:", err));
}

function renderizarAutoresGlobales(autores) {
    const container = document.getElementById('autores-container');
    if (!container) return;

    if(!autores || autores.length === 0) {
        container.innerHTML = '<p style="color: #666; font-size: 0.9rem;">No hay autores registrados por el momento.</p>';
        return;
    }

    let isOrganizador = false;
    if (typeof usuarioActual !== 'undefined' && usuarioActual && typeof baseDeDatos !== 'undefined' && baseDeDatos[usuarioActual]) {
        if (baseDeDatos[usuarioActual].rol === 'organizador' || baseDeDatos[usuarioActual].rol === 'Organizador') {
            isOrganizador = true;
        }
    }

    container.innerHTML = ''; 
    
    autores.forEach((autor, index) => {
        let fotoSrc = autor.foto ? autor.foto : (typeof monitoGris !== 'undefined' ? monitoGris : '');
        let bioText = autor.bio ? `"${autor.bio}"` : '"Sin biografía aún."';
        let nombreSeguro = autor.nombre_completo || 'Autor Desconocido';
        let nombreLimpio = nombreSeguro.replace(/'/g, "\\'").replace(/"/g, "&quot;");
        let idAutorLimpio = autor.id_usuario ? autor.id_usuario : 'null';
        
        let btnProponer = isOrganizador ? `<button class="btn-submit" style="margin: 0; padding: 6px 12px; font-size: 0.8rem; background: var(--header-bg);" onclick="event.stopPropagation(); window.abrirModalInvitarAutor(${idAutorLimpio}, '${nombreLimpio}')"><i class="fas fa-calendar-plus"></i> Proponer Evento</button>` : '';

        let librosDelAutor = listaLibrosGlobal.filter(l => l.autor && l.autor.toLowerCase().trim() === nombreSeguro.toLowerCase().trim()).length;

        const card = document.createElement('div');
        card.className = 'panel-box';
        
  
        card.style.display = 'flex';
        card.style.flexDirection = 'column';
        card.style.alignItems = 'center';
        card.style.justifyContent = 'center';
        card.style.textAlign = 'center';
        card.style.padding = '25px 15px';
        card.style.cursor = 'pointer'; 
        card.style.transition = 'transform 0.2s';
        card.onmouseover = () => card.style.transform = 'scale(1.03)';
        card.onmouseout = () => card.style.transform = 'scale(1)';
        card.onclick = () => window.mostrarPerfilAutor(index);

        card.innerHTML = `
            <img src="${fotoSrc}" style="border-radius: 50%; width: 90px; height: 90px; object-fit: cover; border: 3px solid var(--accent-orange); margin-bottom: 15px; display: block; margin-left: auto; margin-right: auto;">
            
            <h3 style="margin: 0 auto 5px auto; color: #333; font-size: 1.1rem; text-align: center; width: 100%; display: block;">${nombreSeguro}</h3>
            
            <p style="color: #666; font-size: 0.85rem; margin: 0 auto 10px auto; font-weight: bold; text-align: center; width: 100%; display: block;">@${autor.username}</p>
            
            <div style="width: 100%; display: flex; justify-content: center; margin-bottom: 15px;">
                <span style="color: white; background: var(--header-bg); display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 0.75rem; font-weight: bold;">
                    <i class="fas fa-book"></i> ${librosDelAutor} Libros Publicados
                </span>
            </div>
            
            <p style="font-size: 0.9rem; color: #555; margin: 0 auto 20px auto; font-style: italic; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; text-align: center; width: 100%;">${bioText}</p>
            
            <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; width: 100%;">
                <button class="btn-outline req-auth" style="margin: 0; padding: 6px 12px; font-size: 0.8rem;" onclick="event.stopPropagation(); window.abrirChat('${autor.username}', null)">
                    <i class="fas fa-envelope"></i> Mensaje
                </button>
                ${btnProponer}
            </div>`;
        container.appendChild(card);
    });
    
    if (typeof aplicarRestriccionGlobal === 'function') { aplicarRestriccionGlobal(); }
}


window.mostrarPerfilAutor = function(index) {
    let autor = listaAutoresGlobal[index];
    if(!autor) return;
    
    document.getElementById('perfil-usuario-nombre').innerText = autor.nombre_completo || 'Autor';
    document.getElementById('perfil-usuario-rol').innerText = "Autor Destacado";
    document.getElementById('perfil-usuario-ciudad').innerText = autor.ciudad || "Ubicación oculta";
    document.getElementById('perfil-usuario-telefono').innerText = autor.telefono || "Contacto vía Mensaje";
    document.getElementById('perfil-usuario-bio').innerText = '"' + (autor.bio || "Sin biografía aún.") + '"';
    document.getElementById('perfil-usuario-foto').src = autor.foto || autor.foto_perfil_url || monitoGris;
    
    let contListado = document.getElementById('perfil-usuario-clubes');
    let contenedorPadre = document.getElementById('perfil-clubes-container');
    
    if(contListado && contenedorPadre) {
        contenedorPadre.style.display = 'block'; 
        
        // Cambiamos el título para que diga Libros
        let tituloSeccion = contenedorPadre.querySelector('h4');
        if(tituloSeccion) tituloSeccion.innerHTML = '<i class="fas fa-book"></i> Libros Publicados';
        
        contListado.innerHTML = '';
        

        let librosAutor = listaLibrosGlobal.filter(l => l.autor && l.autor.toLowerCase().trim() === autor.nombre_completo.toLowerCase().trim());
        
        if(librosAutor.length === 0) {
            contListado.innerHTML = '<p style="font-size:0.85rem; color:#888; font-style:italic; text-align:center;">No ha publicado libros aún.</p>';
        } else {
            librosAutor.forEach((l) => {
                let imagenUrl = l.portada_url || l.portada || 'https://via.placeholder.com/150x220?text=Libro';
                
                // Tarjeta bonita para el libro
                contListado.innerHTML += `
                <div style="background: white; border-radius: 8px; overflow: hidden; border: 1px solid #ddd; box-shadow: 0 4px 8px rgba(0,0,0,0.05); text-align: left; display: flex; gap: 15px; padding: 15px; align-items: center;">
                    <img src="${imagenUrl}" style="width: 70px; height: 100px; object-fit: cover; border-radius: 4px; border: 1px solid #eee;">
                    <div>
                        <h4 style="margin: 0 0 5px 0; color: var(--header-bg); font-size: 1.1rem;">${l.titulo}</h4>
                        <p style="margin: 5px 0; font-size: 0.85rem; color: #555;"><i class="fas fa-tags" style="color: #666; width: 15px;"></i> ${l.genero || 'General'}</p>
                        <p style="margin: 5px 0; font-size: 0.85rem; color: #555;"><i class="fas fa-file-alt" style="color: #666; width: 15px;"></i> ${l.paginas || '?'} Páginas</p>
                    </div>
                </div>`;
            });
        }
    }
    abrirModal('modal-perfil-usuario');
};

// ==========================================
// DICCIONARIO DE PAÍSES, CIUDADES Y MUNICIPIOS
// ==========================================
window.ubicacionesCascada = {
    "México": {
        "Guadalajara": ["Centro", "Providencia", "Chapultepec", "Oblatos", "Tlaquepaque", "Zapopan"],
        "Ciudad de México": ["Coyoacán", "Polanco", "Condesa", "Roma", "Centro Histórico"],
        "Monterrey": ["San Pedro", "Cumbres", "Centro", "San Nicolás"]
    },
    "Colombia": {
        "Bogotá": ["Chapinero", "Usaquén", "Teusaquillo", "Suba"],
        "Medellín": ["El Poblado", "Laureles", "Envigado", "Bello"]
    },
    "España": {
        "Madrid": ["Salamanca", "Chamberí", "Malasaña", "Centro"],
        "Barcelona": ["Eixample", "Gràcia", "El Raval", "Sants"]
    },
    "Argentina": {
        "Buenos Aires": ["Palermo", "Recoleta", "San Telmo", "Belgrano"],
        "Córdoba": ["Centro", "Nueva Córdoba", "General Paz"]
    }
};




// ==========================================
// 1. LÓGICA DE INVITACIÓN INICIAL AL AUTOR
// ==========================================
window.abrirModalInvitarAutor = function(id_autor, nombre_autor) {
    if (id_autor === null) {
        alert("⚠️ Error: El sistema no detectó el ID de este autor.");
        return;
    }

    let selectClub = document.getElementById('invitar-club-select');
    if (!selectClub) return;


    selectClub.innerHTML = '<option value="">-- Selecciona un club --</option>';
    let misClubes = (baseDeDatos[usuarioActual] && baseDeDatos[usuarioActual].mis_clubes) ? baseDeDatos[usuarioActual].mis_clubes : [];
    if(misClubes.length === 0) {
        alert("No tienes clubes creados para invitar al autor. Crea uno primero en tu panel.");
        return;
    }
    misClubes.forEach(c => {
        selectClub.innerHTML += `<option value="${c.id_club}">${c.nombre}</option>`;
    });
    
    // Llenar Sedes
    let selectSede = document.getElementById('invitar-sede');
    if(selectSede) {
        selectSede.innerHTML = '<option value="">-- Selecciona una Sede Registrada --</option>';
        if(typeof listaSedesGlobal !== 'undefined' && listaSedesGlobal.length > 0) {
            listaSedesGlobal.forEach(sede => {
                selectSede.innerHTML += `<option value="${sede.nombre}">${sede.nombre}</option>`;
            });
        }
        selectSede.innerHTML += '<option value="Sede Externa / Evento Online">Otra sede externa / Evento Online</option>';
    }

    document.getElementById('invitar-autor-id').value = id_autor;
    document.getElementById('invitar-autor-nombre').value = nombre_autor;
    document.getElementById('invitar-autor-titulo').innerText = nombre_autor;
    
    let form = document.getElementById('form-invitar-autor');
    if(form) {
        form.reset();
        document.getElementById('invitar-ciudad').innerHTML = '<option value="">Selecciona Ciudad...</option>';
        document.getElementById('invitar-municipio').innerHTML = '<option value="">Selecciona Municipio...</option>';
    }
    abrirModal('modal-invitar-autor');
};

let formInvitarAutor = document.getElementById('form-invitar-autor');
if (formInvitarAutor) {
    formInvitarAutor.addEventListener('submit', function(e) {
        e.preventDefault();
        let id_club = document.getElementById('invitar-club-select').value;
        let data = {
            id_club: id_club,
            id_autor: document.getElementById('invitar-autor-id').value,
            autor_nombre: document.getElementById('invitar-autor-nombre').value,
            formato: document.getElementById('invitar-formato').value,
            fecha: document.getElementById('invitar-fecha').value,
            hora: document.getElementById('invitar-hora').value,
            sede: document.getElementById('invitar-sede').value,
            pais: document.getElementById('invitar-pais').value,
            municipio: document.getElementById('invitar-municipio').value,
            ciudad: document.getElementById('invitar-ciudad').value
        };
        
        fetch('http://127.0.0.1:5000/api/enviar_propuesta_autor', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data)
        }).then(r => r.json()).then(res => {
            if (res.exito) {
                alert(res.mensaje);
                cerrarModal('modal-invitar-autor');
                let clubAfectado = baseDeDatos[usuarioActual].mis_clubes.find(c => c.id_club == id_club);
                if(clubAfectado) {
                    clubAfectado.autor = data.autor_nombre;
                    clubAfectado.estadoAutor = 'Pendiente';
                }
                if (typeof renderClubesOrganizador === 'function') renderClubesOrganizador();
                if (typeof renderSeguimientoAutores === 'function') renderSeguimientoAutores();
            } else {
                alert("Error: " + res.mensaje);
            }
        }).catch(err => alert("Error de conexión al enviar propuesta."));
    });
}

// ==========================================
// 2. PANEL DE SEGUIMIENTO (VISTA ORGANIZADORA)
// ==========================================
function renderSeguimientoAutores() {
    let container = document.getElementById('contenedor-seguimiento-autores');
    if(!container) return;
    container.innerHTML = '';

    let misClubes = baseDeDatos[usuarioActual].mis_clubes || [];
    let invitaciones = misClubes.filter(c => c.autor && c.autor !== 'Sin asignar' && c.estadoAutor);

    if(invitaciones.length === 0) {
        container.innerHTML = '<p style="color: #666; font-size: 0.9rem;">No hay invitaciones enviadas actualmente.</p>';
        return;
    }

    invitaciones.forEach(inv => {
        let colorBorde = '#f39c12';
        let msjEstado = `⏳ Esperando respuesta de <strong>${inv.autor}</strong>.`;
        
        if(inv.estadoAutor === 'Confirmada') { 
            colorBorde = '#27ae60'; 
            msjEstado = `✅ ¡<strong>${inv.autor}</strong> ha aceptado!`; 
        } else if(inv.estadoAutor === 'Rechazada') { 
            colorBorde = '#e74c3c'; 
            msjEstado = `❌ <strong>${inv.autor}</strong> no podrá asistir.`; 
        }

        // 1. Botón de Modificar
        let btnEditar = (inv.estadoAutor === 'Pendiente' || inv.estadoAutor === 'Rechazada') 
            ? `<button class="btn-outline" style="margin: 0; flex: 1; padding: 6px; font-size: 0.8rem; border-color: var(--accent-orange); color: var(--accent-orange);" onclick="window.abrirModalEditarPropuesta(${inv.id_club}, '${inv.autor.replace(/'/g, "\\'")}')"><i class="fas fa-edit"></i> Modificar Invitación</button>` 
            : '';

        // 2. Botón de Mensajear
        let usernameAutor = inv.autor_username || inv.autor; 
        let btnMensaje = `<button class="btn-outline" style="margin: 0; flex: 1; padding: 6px; font-size: 0.8rem; border-color: #3498db; color: #3498db;" onclick="window.abrirChat('${usernameAutor.replace(/'/g, "\\'")}', null)"><i class="fas fa-envelope"></i> Mensajear al Escritor</button>`;

 
        container.innerHTML += `
        <div style="flex: 1; min-width: 320px; border: 1px solid #eee; padding: 15px; border-radius: 8px; background: white; border-left: 4px solid ${colorBorde}; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
            <h4 style="margin: 0 0 5px 0; color: var(--header-bg); font-size: 1.05rem;">Club: ${inv.nombre}</h4>
            <p style="margin: 0 0 10px 0; font-size: 0.85rem; color: #555;">Autor: <strong>${inv.autor}</strong></p>
            <div style="background: #f9f9f9; padding: 10px; border-radius: 5px; font-size: 0.85rem; margin-bottom: 15px; border: 1px solid #eee;">
                ${msjEstado}
            </div>
            <div style="display: flex; gap: 10px; width: 100%;">
                ${btnEditar}
                ${btnMensaje}
            </div>
        </div>`;
    });
}

// ==========================================
// 3. LÓGICA DE EDICIÓN DE PROPUESTA
// ==========================================
window.actualizarCiudadesEdicion = function() {
    let pais = document.getElementById("editar-propuesta-pais").value;
    let selectCiudad = document.getElementById("editar-propuesta-ciudad");
    let selectMunicipio = document.getElementById("editar-propuesta-municipio");
    
    selectCiudad.innerHTML = '<option value="">Selecciona Ciudad...</option>';
    selectMunicipio.innerHTML = '<option value="">Selecciona Municipio...</option>';
    if (pais && ubicacionesCascada[pais]) {
        for (let ciudad in ubicacionesCascada[pais]) { selectCiudad.innerHTML += `<option value="${ciudad}">${ciudad}</option>`; }
    }
};

window.actualizarMunicipiosEdicion = function() {
    let pais = document.getElementById("editar-propuesta-pais").value;
    let ciudad = document.getElementById("editar-propuesta-ciudad").value;
    let selectMunicipio = document.getElementById("editar-propuesta-municipio");
    
    selectMunicipio.innerHTML = '<option value="">Selecciona Municipio...</option>';
    if (pais && ciudad && ubicacionesCascada[pais][ciudad]) {
        ubicacionesCascada[pais][ciudad].forEach(mun => { selectMunicipio.innerHTML += `<option value="${mun}">${mun}</option>`; });
    }
};

window.abrirModalEditarPropuesta = function(id_club, nombre_autor) {
    document.getElementById('editar-propuesta-autor-titulo').innerText = nombre_autor;
    document.getElementById('editar-propuesta-id-club').value = id_club;
    document.getElementById('editar-propuesta-autor-nombre').value = nombre_autor;
    
    let selectSede = document.getElementById('editar-propuesta-sede');
    if(selectSede) {
        selectSede.innerHTML = '<option value="">-- Selecciona una Sede Registrada --</option>';
        if(typeof listaSedesGlobal !== 'undefined' && listaSedesGlobal.length > 0) {
            listaSedesGlobal.forEach(sede => { selectSede.innerHTML += `<option value="${sede.nombre}">${sede.nombre}</option>`; });
        }
        selectSede.innerHTML += '<option value="Sede Externa / Evento Online">Otra sede externa / Evento Online</option>';
    }

    let form = document.getElementById('form-editar-propuesta');
    if(form) {
        form.reset();
        document.getElementById('editar-propuesta-ciudad').innerHTML = '<option value="">Selecciona Ciudad...</option>';
        document.getElementById('editar-propuesta-municipio').innerHTML = '<option value="">Selecciona Municipio...</option>';
    }
    abrirModal('modal-editar-propuesta');
};

let formEditarPropuesta = document.getElementById('form-editar-propuesta');
if (formEditarPropuesta) {
    formEditarPropuesta.addEventListener('submit', function(e) {
        e.preventDefault();
        let id_club = document.getElementById('editar-propuesta-id-club').value;
        
        let data = {
            id_club: id_club,
            formato: document.getElementById('editar-propuesta-formato').value,
            fecha: document.getElementById('editar-propuesta-fecha').value,
            hora: document.getElementById('editar-propuesta-hora').value,
            sede: document.getElementById('editar-propuesta-sede').value,
            pais: document.getElementById('editar-propuesta-pais').value,
            municipio: document.getElementById('editar-propuesta-municipio').value,
            ciudad: document.getElementById('editar-propuesta-ciudad').value
        };
        
        fetch('http://127.0.0.1:5000/api/editar_propuesta_autor', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data)
        }).then(r => r.json()).then(res => {
            if (res.exito) {
                alert("¡Invitación actualizada! El autor ya verá los nuevos detalles en su panel.");
                cerrarModal('modal-editar-propuesta');
                
                // Regresamos el estado a "Pendiente" por si el autor la había rechazado antes
                let clubAfectado = baseDeDatos[usuarioActual].mis_clubes.find(c => c.id_club == id_club);
                if(clubAfectado) clubAfectado.estadoAutor = 'Pendiente';
                
                if (typeof renderClubesOrganizador === 'function') renderClubesOrganizador();
                if (typeof renderSeguimientoAutores === 'function') renderSeguimientoAutores();
            } else {
                alert("Error: " + res.mensaje);
            }
        }).catch(err => alert("Error de conexión al actualizar invitación."));
    });
}

// =========================================================================
// LÓGICA DEL FORMULARIO PARA CREAR CLUB (SIN AUTOR DIRECTO)
// =========================================================================


window.prepararModalCrearClub = function() {
    let form = document.getElementById('form-crear-club');
    if (form) form.reset();

    let selectSede = document.getElementById('nuevo-club-sede-select');
    
    if (selectSede) selectSede.innerHTML = '<option value="">Buscando sedes...</option>';

    fetch('http://127.0.0.1:5000/api/sedes')
        .then(r => r.json())
        .then(data => {
            if(data.exito && selectSede) {
                selectSede.innerHTML = '<option value="">-- Selecciona una Sede Registrada --</option>';
                data.sedes.forEach(s => {
                    selectSede.innerHTML += `<option value="${s.nombre}">${s.nombre} (${s.direccion})</option>`;
                });
            }
        });

  
    let modalidadSelect = document.getElementById('nuevo-club-modalidad');
    if (modalidadSelect) modalidadSelect.value = 'Presencial';
    window.cambiarModalidadClub('nuevo');
    

    let previewImg = document.getElementById('preview-portada-club');
    if (previewImg) previewImg.src = 'https://via.placeholder.com/400x200?text=Portada+Club';


    abrirModal('modal-crear-club');
};


window.cambiarModalidadClub = function(prefijo) {
    let modalidad = document.getElementById(prefijo + '-club-modalidad').value;
    let selectSede = document.getElementById(prefijo + '-club-sede-select');
    let inputEnlace = document.getElementById(prefijo + '-club-sede-input');

    if (modalidad === 'Presencial') {
        if(selectSede) { selectSede.style.display = 'block'; selectSede.required = true; }
        if(inputEnlace) { inputEnlace.style.display = 'none'; inputEnlace.required = false; }
    } else {
        if(selectSede) { selectSede.style.display = 'none'; selectSede.required = false; }
        if(inputEnlace) { inputEnlace.style.display = 'block'; inputEnlace.required = true; }
    }
};


let formCrearClub = document.getElementById('form-crear-club');
if (formCrearClub) {
    formCrearClub.addEventListener('submit', function(e) {
        e.preventDefault();
        
        let modalidad = document.getElementById('nuevo-club-modalidad').value;
        let sedeFinal = modalidad === 'Presencial' 
            ? document.getElementById('nuevo-club-sede-select').value 
            : document.getElementById('nuevo-club-sede-input').value;
        

        let fecha = document.getElementById('nuevo-club-fecha').value;
        let hora = document.getElementById('nuevo-club-hora').value;
        let horarioFinal = `${fecha} a las ${hora} hrs`;

        let data = {
            organizador_username: usuarioActual,
            nombre: document.getElementById('nuevo-club-nombre').value,
            tematica: document.getElementById('nuevo-club-tematica').value,
            libro_actual: document.getElementById('nuevo-club-libro').value,
            // Mandamos los campos vacíos a Python para evitar invitaciones fantasma
            autor: "", 
            estadoAutor: "Sin asignar", 
            modalidad: modalidad,
            sede: sedeFinal,
            cupo: document.getElementById('nuevo-club-cupo').value,
            estadoSede: document.getElementById('nuevo-club-estado-sede').value,
            abonoSede: document.getElementById('nuevo-club-abono').value,
            horario: horarioFinal,
            portada: document.getElementById('preview-portada-club').src
        };

        fetch('http://127.0.0.1:5000/api/crear_club', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data)
        }).then(r => r.json()).then(res => {
            if (res.exito) {
                alert("¡Club creado exitosamente! Puedes invitar a un autor desde el directorio de Autores.");
                cerrarModal('modal-crear-club');
                
   
                if (typeof cargarClubesGlobales === 'function') cargarClubesGlobales();

                if (baseDeDatos[usuarioActual] && baseDeDatos[usuarioActual].mis_clubes) {
                    baseDeDatos[usuarioActual].mis_clubes.push({
                        id_club: res.id_club,
                        nombre: data.nombre,
                        tematica: data.tematica,
                        autor: "Sin asignar", // Predeterminado
                        estadoAutor: "Sin asignar", // Predeterminado
                        modalidad: data.modalidad,
                        sede: data.sede,
                        cupo: data.cupo,
                        estadoSede: data.estadoSede,
                        abono: data.abonoSede,
                        horario: data.horario,
                        portada: data.portada,
                        libro_actual: data.libro_actual,
                        inscritos: 0
                    });
                }
                
                if (typeof renderClubesOrganizador === 'function') renderClubesOrganizador();
                if (typeof renderSeguimientoAutores === 'function') renderSeguimientoAutores();
            } else {
                alert("Error de la base de datos: " + res.mensaje);
            }
        }).catch(err => alert("Error de conexión al crear club."));
    });
}

// =========================================================================
// LÓGICA PARA EDITAR UN CLUB (ORGANIZADOR) SIN RECARGAR SESIÓN
// =========================================================================
let indexClubOrganizadorEditando = -1;

window.abrirModalEditarClub = function(index) {
    indexClubOrganizadorEditando = index;
    let club = baseDeDatos[usuarioActual].mis_clubes[index];

    // Rellenamos el modal con la info actual del club
    document.getElementById('edit-club-nombre').value = club.nombre || '';
    document.getElementById('edit-club-tematica').value = club.tematica || '';
    document.getElementById('edit-club-libro').value = club.libro_actual || '';
    document.getElementById('edit-club-autor').value = club.autor || '';
    document.getElementById('edit-club-asistencia').value = club.estadoAutor || 'Pendiente';
    document.getElementById('edit-club-modalidad').value = club.modalidad || 'Presencial';
    document.getElementById('edit-club-sede').value = club.sede || '';
    document.getElementById('edit-club-cupo').value = club.cupo || 0;
    document.getElementById('edit-club-estado-sede').value = club.estadoSede || 'Pendiente de Pago';
    document.getElementById('edit-club-abono').value = club.abono || 0;
    document.getElementById('edit-club-horario').value = club.horario || '';

    abrirModal('modal-editar-club');
};

let formEditarClub = document.getElementById('form-editar-club');
if (formEditarClub) {
    formEditarClub.addEventListener('submit', function(e) {
        e.preventDefault(); // Evita que se recargue la página
        if (indexClubOrganizadorEditando === -1) return;

        let clubAEditar = baseDeDatos[usuarioActual].mis_clubes[indexClubOrganizadorEditando];

        let data = {
            username: usuarioActual,
            nombre: document.getElementById('edit-club-nombre').value,
            tematica: document.getElementById('edit-club-tematica').value,
            libro_actual: document.getElementById('edit-club-libro').value,
            autor: document.getElementById('edit-club-autor').value,
            estadoAutor: document.getElementById('edit-club-asistencia').value,
            modalidad: document.getElementById('edit-club-modalidad').value,
            sede: document.getElementById('edit-club-sede').value,
            cupo: document.getElementById('edit-club-cupo').value,
            estadoSede: document.getElementById('edit-club-estado-sede').value,
            abono: document.getElementById('edit-club-abono').value,
            horario: document.getElementById('edit-club-horario').value
        };

        fetch('http://127.0.0.1:5000/api/editar_club', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data)
        }).then(r => r.json()).then(res => {
            if (res.exito) {
                alert("¡Club actualizado correctamente!");
                cerrarModal('modal-editar-club');

  
                baseDeDatos[usuarioActual].mis_clubes[indexClubOrganizadorEditando] = {
                    ...clubAEditar,
                    ...data
                };

 
                renderClubesOrganizador();
                
   
                if (typeof cargarClubesGlobales === 'function') cargarClubesGlobales();
                if (typeof renderSeguimientoAutores === 'function') renderSeguimientoAutores();
            } else {
                alert("Error de la base de datos: " + res.mensaje);
            }
        }).catch(err => alert("Error de conexión al editar club."));
    });
}

// =========================================================================
// LÓGICA PARA EDITAR PERFIL (LLENADO Y GUARDADO SIN RECARGAR)
// =========================================================================


window.abrirModalEditarPerfil = function() {
    if (!usuarioActual || !baseDeDatos[usuarioActual]) return;
    
    let data = baseDeDatos[usuarioActual];

   
    document.getElementById('edit-username').value = data.username || '';
    document.getElementById('edit-nombre').value = data.nombre || '';
    document.getElementById('edit-correo').value = data.correo || '';
    document.getElementById('edit-telefono').value = data.telefono || '';
    document.getElementById('edit-ciudad').value = data.ciudad || '';
    document.getElementById('edit-bio').value = data.bio || '';
    document.getElementById('preview-foto').src = data.foto || (typeof monitoGris !== 'undefined' ? monitoGris : 'https://via.placeholder.com/150');

    abrirModal('edit-profile-modal');
};

let formEditProfile = document.getElementById('form-edit-profile');
if (formEditProfile) {
    formEditProfile.addEventListener('submit', function(e) {
        e.preventDefault(); // Evita que se recargue la página
        
        let dataToSave = {
            username: usuarioActual,
            nombre: document.getElementById('edit-nombre').value,
            correo: document.getElementById('edit-correo').value,
            telefono: document.getElementById('edit-telefono').value,
            ciudad: document.getElementById('edit-ciudad').value,
            bio: document.getElementById('edit-bio').value,
            foto: document.getElementById('preview-foto').src // Atrapamos la imagen previsualizada (Base64)
        };

        fetch('http://127.0.0.1:5000/api/update_profile', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(dataToSave)
        })
        .then(r => r.json())
        .then(res => {
            if(res.exito) {
                alert("¡Perfil actualizado con éxito!");
                cerrarModal('edit-profile-modal');
                
                // Actualizamos la memoria temporal de JavaScript
                baseDeDatos[usuarioActual].nombre = dataToSave.nombre;
                baseDeDatos[usuarioActual].correo = dataToSave.correo;
                baseDeDatos[usuarioActual].telefono = dataToSave.telefono;
                baseDeDatos[usuarioActual].ciudad = dataToSave.ciudad;
                baseDeDatos[usuarioActual].bio = dataToSave.bio;
                baseDeDatos[usuarioActual].foto = dataToSave.foto;
                
                
                if (typeof actualizarHeader === 'function') actualizarHeader(); 
                
            } else {
                alert("Error al guardar: " + res.mensaje);
            }
        })
        .catch(err => alert("Error de conexión al actualizar perfil."));
    });
}

// ==========================================
// LÓGICA PARA AGREGAR NUEVAS TAREAS (ESCUDO ANTI-RECARGAS)
// ==========================================
document.addEventListener('submit', function(e) {
    if (e.target && e.target.id === 'form-agregar-tarea') {
        
        e.preventDefault(); // 🛡️ ¡ESCUDO ACTIVADO! Esto evita que la página se recargue.
        
        let textoNuevaTarea = document.getElementById('nueva-tarea-texto').value;
        
        fetch('http://127.0.0.1:5000/api/agregar_tarea', { 
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                username: usuarioActual,
                texto: textoNuevaTarea
            })
        }).then(r => r.json()).then(res => {
            if(res.exito) {
                alert("¡Tarea agregada a tus pendientes!");
                
             
                e.target.reset();
                cerrarModal('modal-agregar-tarea'); 
                
             
                accionesOrgPendientes.push({
                    id: res.id_tarea, 
                    tipo: 'tarea',
                    texto: textoNuevaTarea
                });
                
  
                renderAccionesOrg();
                
            } else {
                alert("Error al agregar la tarea: " + res.mensaje);
            }
        }).catch(err => alert("Error de conexión al intentar guardar la tarea."));
    }
});

window.addEventListener('DOMContentLoaded', () => { 
    cargarClubesGlobales();
    cargarLibrosGlobales();
    cargarSedesGlobales();
    cargarComunidad();
    cargarAutoresGlobales();
    aplicarRestriccionGlobal(); 
});