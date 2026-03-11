let socket = null;
let chess = new Chess();
let miId = null;
let miNombre = '';
let puedeMover = false;
let piezaSeleccionada = null;
let arrastrando = false;
let clone = null;
let colorJugador = 'w';
let enTorneo = false;
let rondaActual = 0;
let totalRondas = 0;
let problemasRonda = 0;
let fallosRonda = 0;
let fallosMaximos = 3;
let eliminadoEnRonda = false;
let clasificacion = [];
let puntuacionTotal = 0;
let puntuacionesPorRonda = [];

// Temporizadores
let tiempoProblema = 0;
let tiempoProblemaRestante = 0;
let tiempoRondaActivo = false;
let tiempoRondaRestante = 0;
let modoProblemas = 'azar';

const estadoSpan = document.getElementById('estado');
const btnConectar = document.getElementById('btnConectar');
const btnDesconectar = document.getElementById('btnDesconectar');
const tableroDiv = document.getElementById('tablero');
const miIdSpan = document.getElementById('miId');
const miNombreSpan = document.getElementById('miNombre');
const turnoDisplay = document.getElementById('turnoDisplay');
const problemaDescSpan = document.getElementById('problemaDesc');
const mensajesDiv = document.getElementById('mensajes');
const btnRegistrar = document.getElementById('btnRegistrar');
const btnInscribir = document.getElementById('btnInscribir');
const btnCancelarInscripcion = document.getElementById('btnCancelarInscripcion');
const registroDiv = document.getElementById('registro');
const juegoPanelDiv = document.getElementById('juegoPanel');
const torneoPanelDiv = document.getElementById('torneoPanel');
const esperaDiv = document.getElementById('espera');
const countdownDiv = document.getElementById('countdown');
const torneoActivoDiv = document.getElementById('torneoActivo');
const descansoDiv = document.getElementById('descanso');
const clasificacionDiv = document.getElementById('clasificacion');
const listaClasificacion = document.getElementById('listaClasificacion');
const infoTorneoSpan = document.getElementById('infoTorneo');
const inscritosSpan = document.getElementById('inscritos');
const countdownNumero = document.getElementById('countdownNumero');
const descansoTiempo = document.getElementById('descansoTiempo');
const siguienteRondaSpan = document.getElementById('siguienteRonda');
const misDatosSpan = document.getElementById('misDatos');
const tiempoProblemaSpan = document.getElementById('tiempoProblema');
const tiempoRondaSpan = document.getElementById('tiempoRonda');
const tiempoProblemaDisplay = document.getElementById('tiempoProblemaDisplay');
const tiempoRondaDisplay = document.getElementById('tiempoRondaDisplay');
const nombreInput = document.getElementById('nombreInput');

function obtenerURLPieza(pieza) {
    const prefijo = pieza.color === 'w' ? 'w' : 'b';
    let tipo = pieza.type.toLowerCase();
    return `imagenes/${prefijo}${tipo}.svg`;
}

function dibujarTablero() {
    const tablero = chess.board();
    tableroDiv.innerHTML = '';
    
    const rotado = (colorJugador === 'b');
    
    for (let i = 0; i < 8; i++) {
        const fila = rotado ? 7 - i : i;
        const numeroFila = 8 - fila;
        
        for (let j = 0; j < 8; j++) {
            const columna = rotado ? 7 - j : j;
            
            const pieza = tablero[fila][columna];
            const casilla = document.createElement('div');
            casilla.className = `casilla ${(fila + columna) % 2 === 0 ? 'blanca' : 'negra'}`;
            casilla.dataset.fila = fila;
            casilla.dataset.columna = columna;
            casilla.dataset.filaNum = numeroFila;
            
            if (pieza) {
                const img = document.createElement('img');
                img.src = obtenerURLPieza(pieza);
                img.dataset.fila = fila;
                img.dataset.columna = columna;
                img.dataset.pieza = pieza.type;
                img.dataset.color = pieza.color;
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.objectFit = 'contain';
                img.style.padding = '2px';
                img.style.cursor = 'grab';
                img.style.userSelect = 'none';
                img.style.pointerEvents = 'auto';
                img.style.touchAction = 'none';
                
                img.addEventListener('mousedown', iniciarArrastre);
                img.addEventListener('touchstart', iniciarArrastreTouch, { passive: false });
                img.addEventListener('dragstart', (e) => e.preventDefault());
                
                casilla.appendChild(img);
            }
            
            casilla.addEventListener('dragover', (e) => e.preventDefault());
            casilla.addEventListener('drop', manejarSoltar);
            casilla.addEventListener('click', manejarClick);
            casilla.addEventListener('touchend', manejarClickTouch);
            
            tableroDiv.appendChild(casilla);
        }
    }
    
    actualizarTurno();
}

function actualizarTurno() {
    const turno = chess.turn();
    if (turno === 'w') {
        turnoDisplay.innerHTML = '⚪ Blancas';
        turnoDisplay.style.background = '#f39c12';
    } else {
        turnoDisplay.innerHTML = '⚫ Negras';
        turnoDisplay.style.background = '#34495e';
    }
}

function formatearTiempo(segundos) {
    if (segundos === undefined || segundos === null) return '--:--';
    if (segundos < 0) segundos = 0;
    const mins = Math.floor(segundos / 60);
    const segs = segundos % 60;
    return `${mins}:${segs.toString().padStart(2, '0')}`;
}

function actualizarTiempos() {
    if (tiempoProblemaSpan) {
        tiempoProblemaSpan.textContent = formatearTiempo(tiempoProblemaRestante);
        tiempoProblemaSpan.style.color = tiempoProblemaRestante <= 10 && tiempoProblemaRestante > 0 ? '#e74c3c' : '#e67e22';
    }
    
    if (tiempoProblemaDisplay) {
        tiempoProblemaDisplay.textContent = formatearTiempo(tiempoProblemaRestante);
        tiempoProblemaDisplay.style.color = tiempoProblemaRestante <= 10 && tiempoProblemaRestante > 0 ? '#e74c3c' : '#e67e22';
    }
    
    if (tiempoRondaActivo) {
        if (tiempoRondaSpan) {
            tiempoRondaSpan.textContent = formatearTiempo(tiempoRondaRestante);
            tiempoRondaSpan.style.color = tiempoRondaRestante <= 30 && tiempoRondaRestante > 0 ? '#e74c3c' : '#3498db';
        }
        
        if (tiempoRondaDisplay) {
            tiempoRondaDisplay.textContent = formatearTiempo(tiempoRondaRestante);
            tiempoRondaDisplay.style.color = tiempoRondaRestante <= 30 && tiempoRondaRestante > 0 ? '#e74c3c' : '#3498db';
        }
    } else {
        if (tiempoRondaSpan) tiempoRondaSpan.textContent = '--:--';
        if (tiempoRondaDisplay) tiempoRondaDisplay.textContent = '--:--';
    }
}

function iniciarArrastre(e) {
    if (!puedeMover || eliminadoEnRonda) {
        e.preventDefault();
        return;
    }
    
    const img = e.target;
    const fila = parseInt(img.dataset.fila);
    const columna = parseInt(img.dataset.columna);
    const color = img.dataset.color;
    
    if (color !== chess.turn()) {
        e.preventDefault();
        return;
    }
    
    e.preventDefault();
    arrastrando = true;
    piezaSeleccionada = { fila, columna };
    
    img.style.opacity = '0.3';
    
    clone = img.cloneNode(true);
    clone.style.position = 'fixed';
    clone.style.width = '60px';
    clone.style.height = '60px';
    clone.style.left = (e.clientX - 30) + 'px';
    clone.style.top = (e.clientY - 30) + 'px';
    clone.style.opacity = '0.9';
    clone.style.pointerEvents = 'none';
    clone.style.zIndex = '9999';
    clone.style.filter = 'drop-shadow(0 0 5px gold)';
    clone.style.transform = 'scale(1.1)';
    
    document.body.appendChild(clone);
    
    function moverClone(e) {
        if (!arrastrando || !clone) return;
        clone.style.left = (e.clientX - 30) + 'px';
        clone.style.top = (e.clientY - 30) + 'px';
    }
    
    function terminarArrastre(e) {
        if (!arrastrando) return;
        
        arrastrando = false;
        img.style.opacity = '1';
        
        if (clone && clone.parentNode) {
            document.body.removeChild(clone);
            clone = null;
        }
        
        const elementos = document.elementsFromPoint(e.clientX, e.clientY);
        for (let el of elementos) {
            if (el.classList && el.classList.contains('casilla')) {
                const filaDestino = parseInt(el.dataset.fila);
                const columnaDestino = parseInt(el.dataset.columna);
                realizarMovimiento(fila, columna, filaDestino, columnaDestino);
                break;
            }
        }
        
        piezaSeleccionada = null;
        document.removeEventListener('mousemove', moverClone);
        document.removeEventListener('mouseup', terminarArrastre);
    }
    
    document.addEventListener('mousemove', moverClone);
    document.addEventListener('mouseup', terminarArrastre);
}

function iniciarArrastreTouch(e) {
    e.preventDefault();
    if (!puedeMover || eliminadoEnRonda) return;
    
    const touch = e.touches[0];
    const img = e.target;
    const fila = parseInt(img.dataset.fila);
    const columna = parseInt(img.dataset.columna);
    const color = img.dataset.color;
    
    if (color !== chess.turn()) return;
    
    arrastrando = true;
    piezaSeleccionada = { fila, columna };
    img.style.opacity = '0.3';
    
    clone = img.cloneNode(true);
    clone.style.position = 'fixed';
    clone.style.width = '60px';
    clone.style.height = '60px';
    clone.style.left = (touch.clientX - 30) + 'px';
    clone.style.top = (touch.clientY - 30) + 'px';
    clone.style.opacity = '0.9';
    clone.style.pointerEvents = 'none';
    clone.style.zIndex = '9999';
    clone.style.filter = 'drop-shadow(0 0 5px gold)';
    
    document.body.appendChild(clone);
    
    function moverCloneTouch(e) {
        e.preventDefault();
        if (!arrastrando || !clone) return;
        const touch = e.touches[0];
        clone.style.left = (touch.clientX - 30) + 'px';
        clone.style.top = (touch.clientY - 30) + 'px';
    }
    
    function terminarArrastreTouch(e) {
        e.preventDefault();
        if (!arrastrando) return;
        
        arrastrando = false;
        img.style.opacity = '1';
        
        if (clone && clone.parentNode) {
            document.body.removeChild(clone);
            clone = null;
        }
        
        const touch = e.changedTouches[0];
        const elementos = document.elementsFromPoint(touch.clientX, touch.clientY);
        
        for (let el of elementos) {
            if (el.classList && el.classList.contains('casilla')) {
                const filaDestino = parseInt(el.dataset.fila);
                const columnaDestino = parseInt(el.dataset.columna);
                realizarMovimiento(fila, columna, filaDestino, columnaDestino);
                break;
            }
        }
        
        piezaSeleccionada = null;
        document.removeEventListener('touchmove', moverCloneTouch);
        document.removeEventListener('touchend', terminarArrastreTouch);
    }
    
    document.addEventListener('touchmove', moverCloneTouch, { passive: false });
    document.addEventListener('touchend', terminarArrastreTouch, { passive: false });
}

function manejarSoltar(e) {
    e.preventDefault();
}

function manejarClick(e) {
    if (arrastrando || eliminadoEnRonda) return;
    
    const casilla = e.currentTarget;
    const fila = parseInt(casilla.dataset.fila);
    const columna = parseInt(casilla.dataset.columna);
    const pieza = chess.board()[fila][columna];
    
    if (!puedeMover) return;
    
    if (!piezaSeleccionada && pieza && pieza.color === chess.turn()) {
        piezaSeleccionada = { fila, columna };
        resaltarCasilla(fila, columna);
        return;
    }
    
    if (piezaSeleccionada) {
        realizarMovimiento(piezaSeleccionada.fila, piezaSeleccionada.columna, fila, columna);
        piezaSeleccionada = null;
        quitarResaltado();
    }
}

function manejarClickTouch(e) {
    e.preventDefault();
    manejarClick(e);
}

function realizarMovimiento(filaOrigen, columnaOrigen, filaDestino, columnaDestino) {
    const desdeNotacion = `${String.fromCharCode(97 + columnaOrigen)}${8 - filaOrigen}`;
    const hastaNotacion = `${String.fromCharCode(97 + columnaDestino)}${8 - filaDestino}`;
    
    const movimiento = {
        from: desdeNotacion,
        to: hastaNotacion,
        promotion: 'q'
    };
    
    const movimientoLegal = chess.move(movimiento);
    
    if (movimientoLegal) {
        const notacionCompleta = movimientoLegal.san;
        dibujarTablero();
        
        socket.send(JSON.stringify({
            tipo: 'movimiento',
            movimiento: notacionCompleta
        }));
        
        puedeMover = false;
        actualizarTurno();
    }
}

function resaltarCasilla(fila, columna) {
    quitarResaltado();
    const casillas = document.querySelectorAll('.casilla');
    const indice = fila * 8 + columna;
    if (casillas[indice]) {
        casillas[indice].style.outline = '3px solid #f1c40f';
        casillas[indice].style.zIndex = '10';
    }
}

function quitarResaltado() {
    document.querySelectorAll('.casilla').forEach(c => {
        c.style.outline = '';
        c.style.zIndex = '';
    });
}

function agregarMensaje(texto, tipo) {
    const div = document.createElement('div');
    div.className = `mensaje ${tipo}`;
    div.textContent = texto;
    mensajesDiv.appendChild(div);
    mensajesDiv.scrollTop = mensajesDiv.scrollHeight;
}

function actualizarClasificacionHTML() {
    if (!listaClasificacion) return;
    
    listaClasificacion.innerHTML = '';
    
    let cabeceraRondas = '';
    for (let i = 1; i <= totalRondas; i++) {
        cabeceraRondas += `<th style="padding: 6px; font-size: 0.9rem;">R${i}</th>`;
    }
    
    let html = `
        <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
            <thead>
                <tr style="background: #3498db; color: white;">
                    <th style="padding: 8px; text-align: left;">Jugador</th>
                    ${cabeceraRondas}
                    <th style="padding: 8px;">TOTAL</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    clasificacion.forEach((j, index) => {
        const bgColor = j.id === miId ? '#d4edda' : '#f8f9fa';
        const filaRondas = [];
        
        for (let i = 0; i < totalRondas; i++) {
            const puntos = j.puntuacionesPorRonda[i] || 0;
            filaRondas.push(`<td style="padding: 6px; text-align: center;">${puntos}</td>`);
        }
        
        html += `
            <tr style="background: ${bgColor};">
                <td style="padding: 8px; font-weight: bold;">${j.nombre} ${j.id === miId ? '(tú)' : ''}</td>
                ${filaRondas.join('')}
                <td style="padding: 8px; text-align: center; font-weight: bold; background: #e8f4f8;">${j.puntuacionTotal}</td>
            </tr>
        `;
    });
    
    html += `
            </tbody>
        </table>
    `;
    
    listaClasificacion.innerHTML = html;
}

function mostrarGanadorTorneo(ganador) {
    if (!ganador || !ganador.nombre) return;
    
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0,0,0,0.9)';
    modal.style.display = 'flex';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    modal.style.zIndex = '20000';
    modal.style.padding = '15px';
    
    const contenido = document.createElement('div');
    contenido.style.background = 'linear-gradient(135deg, #f1c40f, #f39c12)';
    contenido.style.padding = 'clamp(20px, 5vw, 50px)';
    contenido.style.borderRadius = '20px';
    contenido.style.textAlign = 'center';
    contenido.style.maxWidth = '600px';
    contenido.style.width = '100%';
    contenido.style.boxShadow = '0 0 30px gold';
    contenido.style.animation = 'aparecer 0.5s ease';
    
    contenido.innerHTML = `
        <style>
            @keyframes aparecer {
                from { transform: scale(0.8); opacity: 0; }
                to { transform: scale(1); opacity: 1; }
            }
        </style>
        <h1 style="font-size: clamp(2em, 8vw, 3em); margin-bottom: 15px; color: #2c3e50;">🏆 CAMPEÓN 🏆</h1>
        <div style="font-size: clamp(3em, 12vw, 5em); margin: 15px 0;">👑</div>
        <h2 style="font-size: clamp(1.5em, 6vw, 2.5em); margin: 15px 0; color: #2c3e50;">${ganador.nombre}</h2>
        <p style="font-size: clamp(1.2em, 5vw, 1.8em); margin: 15px 0; background: rgba(255,255,255,0.3); padding: 10px 20px; border-radius: 50px; display: inline-block;">
            ${ganador.puntuacion} puntos
        </p>
        <button onclick="this.parentNode.parentNode.parentNode.removeChild(this.parentNode.parentNode)" 
                style="padding: 12px 40px; background: #2c3e50; color: white; border: none; border-radius: 50px; font-size: clamp(1em, 4vw, 1.2em); cursor: pointer; margin-top: 20px; width: 100%; max-width: 200px;">
            Cerrar
        </button>
    `;
    
    modal.appendChild(contenido);
    document.body.appendChild(modal);
}

// ============================================
// CONEXIÓN WEBSOCKET - ADAPTADA PARA RENDER
// ============================================
btnConectar.onclick = () => {
    // Detectar si estamos en local o en Render
    const wsUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'ws://localhost:8081'
        : `wss://${window.location.hostname}`;
    
    socket = new WebSocket(wsUrl);
    
    socket.onopen = () => {
        estadoSpan.textContent = 'Conectado';
        estadoSpan.className = 'conectado';
        btnConectar.disabled = true;
        btnDesconectar.disabled = false;
        registroDiv.style.display = 'block';
        agregarMensaje('✅ Conectado al servidor', 'sistema');
    };
    
    socket.onmessage = (event) => {
        const datos = JSON.parse(event.data);
        console.log('📩 Recibido:', datos.tipo);
        
        switch(datos.tipo) {
            case 'bienvenida':
                miId = datos.id;
                miIdSpan.textContent = miId;
                if (datos.config) {
                    infoTorneoSpan.textContent = `${datos.config.fechaTorneo} ${datos.config.horaTorneo}`;
                    totalRondas = datos.config.rondas;
                    problemasRonda = datos.config.problemasPorRonda;
                    fallosMaximos = datos.config.fallosMaximos;
                    modoProblemas = datos.config.modoProblemas;
                    
                    tiempoProblema = datos.config.tiempoPorProblema;
                    tiempoProblemaRestante = tiempoProblema;
                    tiempoRondaActivo = datos.config.tiempoPorRondaActivo;
                    tiempoRondaRestante = datos.config.tiempoPorRonda;
                    
                    actualizarTiempos();
                }
                break;
                
            case 'registro_ok':
                miNombre = nombreInput.value;
                miNombreSpan.textContent = miNombre;
                registroDiv.style.display = 'none';
                juegoPanelDiv.style.display = 'block';
                torneoPanelDiv.style.display = 'block';
                agregarMensaje(`👋 Bienvenido ${miNombre}`, 'sistema');
                btnRegistrar.disabled = false;
                break;
                
            case 'inscrito':
                enTorneo = true;
                btnInscribir.disabled = true;
                btnCancelarInscripcion.style.display = 'inline-block';
                esperaDiv.style.display = 'block';
                agregarMensaje(`📝 Te has inscrito. Total inscritos: ${datos.inscritos}`, 'sistema');
                break;
                
            case 'inscripcion_cancelada':
                enTorneo = false;
                btnInscribir.disabled = false;
                btnCancelarInscripcion.style.display = 'none';
                esperaDiv.style.display = 'none';
                agregarMensaje(datos.mensaje, 'sistema');
                break;
                
            case 'lista_inscritos':
                inscritosSpan.textContent = `${datos.inscritos.length}/${datos.maximo}`;
                break;
                
            case 'countdown_torneo':
                countdownDiv.style.display = 'block';
                countdownNumero.textContent = datos.segundos;
                if (datos.segundos <= 0) {
                    countdownDiv.style.display = 'none';
                }
                break;
                
            case 'torneo_iniciado':
                esperaDiv.style.display = 'none';
                countdownDiv.style.display = 'none';
                torneoActivoDiv.style.display = 'block';
                rondaActual = 1;
                puntuacionesPorRonda = [];
                puntuacionTotal = 0;
                eliminadoEnRonda = false;
                agregarMensaje(`🏁 ¡TORNEO INICIADO! Ronda 1/${totalRondas}`, 'sistema');
                break;
                
            case 'ronda_iniciada':
                rondaActual = datos.ronda;
                fallosRonda = 0;
                eliminadoEnRonda = false;
                misDatosSpan.textContent = `R${rondaActual}/${totalRondas} | P0/${problemasRonda} | ❌0/${fallosMaximos}`;
                
                if (datos.tiempoRondaActivo) {
                    tiempoRondaRestante = datos.tiempoRonda;
                }
                actualizarTiempos();
                agregarMensaje(`🎯 Ronda ${rondaActual} comenzada`, 'sistema');
                break;
                
            case 'problema_torneo':
                chess.load(datos.fen);
                colorJugador = datos.colorJugador;
                dibujarTablero();
                problemaDescSpan.textContent = `R${datos.ronda} P${datos.numProblema}/${datos.totalProblemas}`;
                fallosRonda = datos.fallosRonda;
                misDatosSpan.textContent = `R${datos.ronda}/${totalRondas} | P${datos.numProblema-1}/${problemasRonda} | ❌${fallosRonda}/${fallosMaximos}`;
                
                if (datos.tiempoProblema > 0) {
                    tiempoProblemaRestante = datos.tiempoProblema;
                }
                if (datos.tiempoRondaActivo) {
                    tiempoRondaRestante = datos.tiempoRonda;
                }
                actualizarTiempos();
                puedeMover = true;
                break;
                
            case 'tiempo_problema':
                tiempoProblemaRestante = datos.segundos;
                actualizarTiempos();
                break;
                
            case 'tiempo_ronda':
                tiempoRondaRestante = datos.segundos;
                actualizarTiempos();
                break;
                
            case 'tiempo_agotado':
                fallosRonda = datos.fallosRonda;
                misDatosSpan.textContent = `R${rondaActual}/${totalRondas} | ❌${fallosRonda}/${fallosMaximos}`;
                agregarMensaje(datos.mensaje, 'sistema');
                agregarMensaje(`⚠️ Fallos: ${fallosRonda}/${fallosMaximos}`, 'sistema');
                chess.undo();
                dibujarTablero();
                puedeMover = true;
                piezaSeleccionada = null;
                quitarResaltado();
                actualizarTurno();
                break;
                
            case 'movimiento_programa':
                chess.move(datos.movimiento);
                dibujarTablero();
                puedeMover = true;
                actualizarTurno();
                break;
                
            case 'movimiento_incorrecto':
                fallosRonda = datos.fallosRonda;
                misDatosSpan.textContent = `R${rondaActual}/${totalRondas} | ❌${fallosRonda}/${fallosMaximos}`;
                agregarMensaje(`❌ Incorrecto. Era ${datos.correcto}`, 'sistema');
                agregarMensaje(`⚠️ Fallos: ${fallosRonda}/${fallosMaximos}`, 'sistema');
                chess.undo();
                dibujarTablero();
                puedeMover = true;
                piezaSeleccionada = null;
                quitarResaltado();
                actualizarTurno();
                break;
                
            case 'eliminado_ronda':
                eliminadoEnRonda = true;
                puedeMover = false;
                agregarMensaje(datos.mensaje, 'sistema');
                misDatosSpan.innerHTML = `❌ Eliminado R${rondaActual} - Total: ${datos.puntuacionTotal} pts`;
                break;
                
            case 'problema_completado':
                agregarMensaje(`✅ ${datos.mensaje}`, 'sistema');
                break;
                
            case 'ronda_completada':
                puntuacionesPorRonda[rondaActual - 1] = datos.puntuacionRonda;
                puntuacionTotal = datos.puntuacionTotal;
                agregarMensaje(`📊 Ronda ${rondaActual}: +${datos.puntuacionRonda} pts`, 'sistema');
                agregarMensaje(`   Total: ${puntuacionTotal} pts`, 'sistema');
                break;
                
            case 'descanso_iniciado':
                torneoActivoDiv.style.display = 'none';
                descansoDiv.style.display = 'block';
                siguienteRondaSpan.textContent = datos.siguienteRonda;
                descansoTiempo.textContent = datos.segundos;
                agregarMensaje(`⏸️ Descanso ${datos.segundos}s hasta ronda ${datos.siguienteRonda}`, 'sistema');
                break;
                
            case 'descanso_contador':
                descansoTiempo.textContent = datos.segundos;
                break;
                
            case 'nueva_ronda':
                descansoDiv.style.display = 'none';
                torneoActivoDiv.style.display = 'block';
                rondaActual = datos.ronda;
                eliminadoEnRonda = false;
                agregarMensaje(`🎯 Ronda ${datos.ronda} - ¡A jugar!`, 'sistema');
                break;
                
            case 'clasificacion_torneo':
                clasificacion = datos.clasificacion;
                actualizarClasificacionHTML();
                break;
                
            case 'torneo_finalizado':
                torneoActivoDiv.style.display = 'none';
                descansoDiv.style.display = 'none';
                clasificacion = datos.clasificacion;
                actualizarClasificacionHTML();
                agregarMensaje(`🏆 ¡TORNEO FINALIZADO!`, 'sistema');
                
                if (datos.ganador) {
                    setTimeout(() => {
                        mostrarGanadorTorneo(datos.ganador);
                    }, 500);
                }
                
                btnInscribir.disabled = false;
                btnCancelarInscripcion.style.display = 'none';
                enTorneo = false;
                break;
                
            case 'error':
                alert('❌ Error: ' + datos.mensaje);
                break;
        }
    };
    
    socket.onclose = () => {
        estadoSpan.textContent = 'Desconectado';
        estadoSpan.className = 'desconectado';
        btnConectar.disabled = false;
        btnDesconectar.disabled = true;
        registroDiv.style.display = 'none';
        juegoPanelDiv.style.display = 'none';
        esperaDiv.style.display = 'none';
        countdownDiv.style.display = 'none';
        torneoActivoDiv.style.display = 'none';
        descansoDiv.style.display = 'none';
        btnCancelarInscripcion.style.display = 'none';
        agregarMensaje('🔌 Desconectado', 'sistema');
    };
};

btnDesconectar.onclick = () => {
    if (socket) socket.close();
};

btnRegistrar.onclick = () => {
    const nombre = nombreInput.value.trim();
    if (!nombre) {
        alert('Ingresa un nombre');
        return;
    }
    socket.send(JSON.stringify({ tipo: 'registro', nombre: nombre }));
    btnRegistrar.disabled = true;
};

btnInscribir.onclick = () => {
    socket.send(JSON.stringify({ tipo: 'inscribir_torneo' }));
};

btnCancelarInscripcion.onclick = () => {
    socket.send(JSON.stringify({ tipo: 'cancelar_inscripcion' }));
};

dibujarTablero();