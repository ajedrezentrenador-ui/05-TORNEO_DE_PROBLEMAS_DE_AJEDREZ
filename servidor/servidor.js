const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

// ============================================
// CONFIGURACIÓN DEL TORNEO (SOLO ADMINISTRADOR)
// ============================================
const CONFIG = {
    modoJuego: 'torneo',
    
    // ========================================
    // CONFIGURACIÓN DE FECHA Y HORA (EN UTC)
    // ========================================
    fechaUTC: '2026-03-11',               // Formato AAAA-MM-DD en UTC
    horaUTC: '22:15',                      // Formato HH:MM en UTC (24h)
    
    // ========================================
    // PARÁMETROS DEL TORNEO
    // ========================================
    rondas: 3,
    problemasPorRonda: 4,
    fallosMaximos: 3,
    intentosPorProblema: 1,
    descansoEntreRondas: 30,
    
    // ========================================
    // MODO DE PROBLEMAS (SOLO ADMINISTRADOR)
    // ========================================
    modoProblemas: 'azar',                // 'orden' o 'azar'
    
    // ========================================
    // CONTROL DE REPETICIÓN DE PROBLEMAS
    // ========================================
    permitirRepeticionEntreRondas: false, // true = pueden repetirse, false = NO se repiten en todo el torneo
    
    // ========================================
    // TEMPORIZADORES (SOLO ADMINISTRADOR)
    // ========================================
    tiempoPorProblema: 30,                // segundos (0 = ilimitado)
    tiempoPorRondaActivo: false,          // true/false
    tiempoPorRonda: 300,                  // segundos
    
    // ========================================
    // GENERAL
    // ========================================
    maxJugadores: 10
};

// ============================================
// BASE DE DATOS DE PROBLEMAS (10 ejemplos)
// ============================================
const problemas = [
        {
        id: 1,
        fen: "r1b2r1k/ppp1b1pp/2n1q3/8/2B5/5N2/PP2QPPP/R4RK1 w - - 0 1",
        solucion: ["Bxe6"],
        objetivo: "Ejercicio mixto",
        descripcion: "Mix A vs 02"
    },
    {
        id: 2,
        fen: "n7/2r3k1/p4p1p/1p6/4B3/1P4P1/P3R1KP/8 w - - 0 1",
        solucion: ["Bxa8"],
        objetivo: "Ejercicio mixto",
        descripcion: "Mix A vs 03"
    },
    {
        id: 3,
        fen: "kn6/8/K7/8/8/8/3q3B/1Q6 w - - 0 1",
        solucion: ["Qxb8#"],
        objetivo: "Ejercicio mixto",
        descripcion: "Mix A vs 01"
    },
    {
        id: 4,
        fen: "r4r2/pp2npkp/4p1p1/1N1pNb2/2qP4/8/PPP2PPP/R2Q1RK1 w - - 0 1",
        solucion: ["Nxc4"],
        objetivo: "Ejercicio mixto",
        descripcion: "Mix A vs 05"
    },
    {
        id: 5,
        fen: "8/8/8/8/2nb2B1/3k4/3B4/4K3 w - - 0 1",
        solucion: ["Bf5#"],
        objetivo: "Ejercicio mixto",
        descripcion: "Mix A vs 06"
    },
    {
        id: 6,
        fen: "r2q1rk1/2p1bppp/p3p3/1pPp4/1n1PnB2/P3PN2/1P2BPPP/R2QK2R b KQ - 0 1",
        solucion: ["Nc6"],
        objetivo: "Ejercicio mixto",
        descripcion: "Mix A vs 08"
    },
    {
        id: 7,
        fen: "3rr3/2p1k2p/ppb2R2/2p1P2p/8/8/PPP4P/2K3R1 w - - 0 1",
        solucion: ["Rg7#"],
        objetivo: "Ejercicio mixto",
        descripcion: "Mix A vs 09"
    },
    {
        id: 8,
        fen: "8/8/6k1/6P1/1p6/8/pK6/8 b - - 0 1",
        solucion: ["b3"],
        objetivo: "Ejercicio mixto",
        descripcion: "Mix A vs 10"
    },
    {
        id: 9,
        fen: "1R4k1/4rpp1/5n1p/8/8/pN6/P1B2PPb/5K2 b - - 0 1",
        solucion: ["Bxb8"],
        objetivo: "Ejercicio mixto",
        descripcion: "Mix A vs 11"
    },
    {
        id: 10,
        fen: "rn1q1k2/p1ppp1br/5nQ1/1B4B1/3Pb2P/2P1N3/PP3P2/R3K1R1 w Q - 0 1",
        solucion: ["Nf5"],
        objetivo: "Ejercicio mixto",
        descripcion: "Mix A vs 12"
    },
    {
        id: 11,
        fen: "2KB1k2/8/6P1/8/8/8/8/8 w - - 0 1",
        solucion: ["Bf6"],
        objetivo: "Ejercicio mixto",
        descripcion: "Mix B vs 01"
    },
    {
        id: 12,
        fen: "1r4k1/p1p2pp1/3n4/2N2Pp1/4b1P1/PnB3KP/1P6/4RB2 w - - 0 1",
        solucion: ["Nxe4"],
        objetivo: "Ejercicio mixto",
        descripcion: "Mix B vs 03"
    }
];

// ============================================
// SERVIDOR HTTP PARA ARCHIVOS ESTÁTICOS
// ============================================
const server = http.createServer((req, res) => {
    console.log(`📁 Solicitud HTTP: ${req.url}`);
    
    let filePath;
    if (req.url === '/') {
        filePath = path.join(__dirname, '../cliente/index.html');
    } else {
        filePath = path.join(__dirname, '../cliente', req.url);
    }
    
    const ext = path.extname(filePath);
    let contentType = 'text/html';
    const mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon',
        '.txt': 'text/plain'
    };
    if (mimeTypes[ext]) contentType = mimeTypes[ext];
    
    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404);
                res.end('Archivo no encontrado');
            } else {
                res.writeHead(500);
                res.end(`Error del servidor: ${err.code}`);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        }
    });
});

// ============================================
// SERVIDOR WEBSOCKET
// ============================================
const wss = new WebSocket.Server({ server });
let jugadores = {};
let torneo = null;
let salaEspera = [];

// ============================================
// FUNCIÓN PARA OBTENER FECHA/HORA LOCAL DEL SERVIDOR
// ============================================
function obtenerFechaLocal() {
    const [anio, mes, dia] = CONFIG.fechaUTC.split('-').map(Number);
    const [hora, minuto] = CONFIG.horaUTC.split(':').map(Number);
    
    const fechaUTC = new Date(Date.UTC(anio, mes - 1, dia, hora, minuto, 0));
    const fechaLocal = new Date(fechaUTC);
    
    return {
        fechaLocal: fechaLocal,
        timestamp: fechaLocal.getTime(),
        horaLocal: fechaLocal.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
        fechaLocalStr: fechaLocal.toLocaleDateString('es-CO')
    };
}

// ============================================
// FUNCIÓN PARA CALCULAR TIEMPO HASTA EL TORNEO
// ============================================
function calcularTiempoRestante() {
    const ahora = Date.now();
    const [anio, mes, dia] = CONFIG.fechaUTC.split('-').map(Number);
    const [hora, minuto] = CONFIG.horaUTC.split(':').map(Number);
    
    const fechaInicioUTC = Date.UTC(anio, mes - 1, dia, hora, minuto, 0);
    return Math.floor((fechaInicioUTC - ahora) / 1000);
}

console.log("====================================");
console.log("🖥️  SERVIDOR DE DUELO DE PROBLEMAS");
console.log("=========== MODO TORNEO ============");
console.log(`📡 Servidor HTTP y WebSocket listo`);
console.log(`📚 Problemas disponibles: ${problemas.length}`);
const fechaLocal = obtenerFechaLocal();
console.log(`🎯 Torneo (UTC): ${CONFIG.fechaUTC} ${CONFIG.horaUTC} UTC`);
console.log(`🎯 Torneo (hora servidor): ${fechaLocal.fechaLocalStr} ${fechaLocal.horaLocal}`);
console.log(`🎯 Rondas: ${CONFIG.rondas} | Problemas por ronda: ${CONFIG.problemasPorRonda}`);
console.log(`🔄 Modo problemas: ${CONFIG.modoProblemas}`);
console.log(`🔄 Permitir repetición entre rondas: ${CONFIG.permitirRepeticionEntreRondas ? 'SÍ' : 'NO'}`);
console.log(`🎯 Fallos máximos por ronda: ${CONFIG.fallosMaximos}`);
console.log(`⏱️ Tiempo por problema: ${CONFIG.tiempoPorProblema > 0 ? CONFIG.tiempoPorProblema + 's' : 'ILIMITADO'}`);
console.log(`⏱️ Tiempo por ronda: ${CONFIG.tiempoPorRondaActivo ? CONFIG.tiempoPorRonda + 's' : 'DESACTIVADO'}`);
console.log("====================================");

wss.on('connection', (ws) => {
    if (Object.keys(jugadores).length >= CONFIG.maxJugadores) {
        ws.send(JSON.stringify({ tipo: 'error', mensaje: 'Servidor lleno' }));
        ws.close();
        return;
    }

    const idJugador = Math.random().toString(36).substring(2, 8);
    
    jugadores[idJugador] = {
        id: idJugador,
        conexion: ws,
        nombre: '',
        enTorneo: false,
        
        puntuacionTotal: 0,
        puntuacionesPorRonda: [],
        
        rondaActual: 0,
        problemasResueltosRonda: 0,
        fallosRonda: 0,
        eliminadoEnRonda: false,
        problemaActual: null,
        indiceMovimiento: 0,
        problemaEnCurso: false,
        
        tiempoRestanteProblema: CONFIG.tiempoPorProblema,
        tiempoRestanteRonda: CONFIG.tiempoPorRonda,
        temporizadorProblema: null,
        temporizadorRonda: null
    };

    console.log(`🎮 Jugador ${idJugador} conectado`);
    
    const fechaInfo = obtenerFechaLocal();
    
    ws.send(JSON.stringify({ 
        tipo: 'bienvenida', 
        id: idJugador,
        modo: CONFIG.modoJuego,
        config: {
            fechaTorneo: fechaInfo.fechaLocalStr,
            horaTorneo: fechaInfo.horaLocal,
            rondas: CONFIG.rondas,
            problemasPorRonda: CONFIG.problemasPorRonda,
            fallosMaximos: CONFIG.fallosMaximos,
            tiempoPorProblema: CONFIG.tiempoPorProblema,
            tiempoPorRondaActivo: CONFIG.tiempoPorRondaActivo,
            tiempoPorRonda: CONFIG.tiempoPorRonda,
            modoProblemas: CONFIG.modoProblemas
        }
    }));

    ws.on('message', (mensaje) => {
        try {
            const datos = JSON.parse(mensaje.toString());
            console.log(`📨 ${idJugador}: ${datos.tipo}`);

            switch(datos.tipo) {
                case 'registro':
                    manejarRegistro(idJugador, datos);
                    break;
                case 'inscribir_torneo':
                    manejarInscripcion(idJugador);
                    break;
                case 'cancelar_inscripcion':
                    manejarCancelarInscripcion(idJugador);
                    break;
                case 'movimiento':
                    manejarMovimiento(idJugador, datos);
                    break;
                case 'abandonar':
                    manejarAbandono(idJugador);
                    break;
            }
        } catch (e) {
            console.error('Error:', e);
        }
    });

    ws.on('close', () => {
        console.log(`🚪 Jugador ${idJugador} desconectado`);
        manejarDesconexion(idJugador);
        delete jugadores[idJugador];
    });
});

// ============================================
// FUNCIONES DE MANEJO DEL TORNEO
// ============================================

function manejarRegistro(idJugador, datos) {
    const jugador = jugadores[idJugador];
    jugador.nombre = datos.nombre;
    jugador.conexion.send(JSON.stringify({ tipo: 'registro_ok' }));
}

function manejarInscripcion(idJugador) {
    const jugador = jugadores[idJugador];
    
    if (jugador.enTorneo) {
        jugador.conexion.send(JSON.stringify({
            tipo: 'error',
            mensaje: 'Ya estás inscrito en el torneo'
        }));
        return;
    }
    
    if (torneo && torneo.estado !== 'esperando') {
        jugador.conexion.send(JSON.stringify({
            tipo: 'error',
            mensaje: 'El torneo ya ha comenzado'
        }));
        return;
    }
    
    salaEspera.push(idJugador);
    jugador.enTorneo = true;
    
    jugador.conexion.send(JSON.stringify({
        tipo: 'inscrito',
        mensaje: 'Te has inscrito en el torneo',
        inscritos: salaEspera.length
    }));
    
    console.log(`📝 ${jugador.nombre} inscrito en el torneo. Total: ${salaEspera.length}`);
    
    actualizarListaInscritos();
    
    if (!torneo) {
        crearTorneo();
    }
}

function manejarCancelarInscripcion(idJugador) {
    const jugador = jugadores[idJugador];
    
    const index = salaEspera.indexOf(idJugador);
    if (index !== -1) {
        salaEspera.splice(index, 1);
        jugador.enTorneo = false;
        
        jugador.conexion.send(JSON.stringify({
            tipo: 'inscripcion_cancelada',
            mensaje: 'Has cancelado tu inscripción'
        }));
        
        actualizarListaInscritos();
    }
}

function crearTorneo() {
    const tiempoRestante = calcularTiempoRestante();
    
    torneo = {
        estado: 'esperando',
        inscritos: [],
        rondaActual: 0,
        rondas: CONFIG.rondas,
        problemasPorRonda: CONFIG.problemasPorRonda,
        clasificacion: [],
        tiempoInicio: Date.now(),
        tiempoRestante: tiempoRestante,
        temporizador: null,
        descansoTemporizador: null,
        problemasRonda: [],
        // ============================================
        // HISTORIAL DE PROBLEMAS YA UTILIZADOS
        // ============================================
        problemasUtilizados: []  // IDs de problemas que ya han aparecido en rondas anteriores
    };
    
    const fechaLocal = obtenerFechaLocal();
    console.log(`🏆 TORNEO CREADO - Inicio (hora servidor): ${fechaLocal.fechaLocalStr} ${fechaLocal.horaLocal}`);
    
    if (tiempoRestante > 0) {
        setTimeout(() => {
            iniciarCountdown();
        }, (tiempoRestante - 10) * 1000);
        
        setTimeout(() => {
            iniciarTorneo();
        }, tiempoRestante * 1000);
        
        console.log(`⏱️ Tiempo hasta el torneo: ${Math.floor(tiempoRestante / 60)} minutos ${tiempoRestante % 60} segundos`);
    }
}

function iniciarCountdown() {
    if (!torneo || torneo.estado !== 'esperando') return;
    
    torneo.estado = 'countdown';
    torneo.tiempoRestante = 10;
    
    console.log(`⏰ COUNTDOWN INICIADO - 10 segundos para el torneo`);
    
    salaEspera.forEach(id => {
        const jugador = jugadores[id];
        if (!jugador) return;
        
        jugador.conexion.send(JSON.stringify({
            tipo: 'countdown_torneo',
            segundos: 10
        }));
    });
    
    torneo.temporizador = setInterval(() => {
        torneo.tiempoRestante--;
        
        salaEspera.forEach(id => {
            const jugador = jugadores[id];
            if (!jugador) return;
            
            jugador.conexion.send(JSON.stringify({
                tipo: 'countdown_torneo',
                segundos: torneo.tiempoRestante
            }));
        });
        
        if (torneo.tiempoRestante <= 0) {
            clearInterval(torneo.temporizador);
            torneo.temporizador = null;
        }
    }, 1000);
}

function iniciarTorneo() {
    if (!torneo) return;
    
    torneo.estado = 'en_curso';
    torneo.rondaActual = 1;
    torneo.inscritos = [...salaEspera];
    
    console.log(`🏁 TORNEO INICIADO - ${torneo.inscritos.length} participantes - Modo: ${CONFIG.modoProblemas}`);
    console.log(`   Repetición entre rondas: ${CONFIG.permitirRepeticionEntreRondas ? 'PERMITIDA' : 'NO PERMITIDA'}`);
    
    torneo.inscritos.forEach(id => {
        const jugador = jugadores[id];
        if (!jugador) return;
        
        jugador.enTorneo = true;
        jugador.puntuacionTotal = 0;
        jugador.puntuacionesPorRonda = [];
        
        jugador.conexion.send(JSON.stringify({
            tipo: 'torneo_iniciado',
            ronda: 1,
            totalRondas: CONFIG.rondas,
            problemasPorRonda: CONFIG.problemasPorRonda
        }));
    });
    
    comenzarRonda(1);
}

// ============================================
// NUEVA FUNCIÓN: Seleccionar problemas SIN repetición entre rondas
// ============================================
function seleccionarProblemasRonda() {
    const problemasSeleccionados = [];
    
    if (CONFIG.modoProblemas === 'orden') {
        // MODO ORDEN: tomar por ID ascendente, considerando repetición
        const problemasOrdenados = problemas.sort((a, b) => a.id - b.id);
        let contador = 0;
        
        for (let i = 0; i < problemasOrdenados.length && contador < CONFIG.problemasPorRonda; i++) {
            const problema = problemasOrdenados[i];
            
            // Si no se permiten repeticiones, verificar que el problema no haya sido usado
            if (!CONFIG.permitirRepeticionEntreRondas && torneo.problemasUtilizados.includes(problema.id)) {
                continue; // Saltar este problema, ya se usó en ronda anterior
            }
            
            problemasSeleccionados.push(JSON.parse(JSON.stringify(problema)));
            torneo.problemasUtilizados.push(problema.id);
            contador++;
        }
        
        // Si no hay suficientes problemas disponibles (caso extremo), permitir repetición como fallback
        if (contador < CONFIG.problemasPorRonda) {
            console.log(`⚠️ No hay suficientes problemas nuevos. Usando repetición como fallback.`);
            for (let i = 0; i < problemasOrdenados.length && contador < CONFIG.problemasPorRonda; i++) {
                const problema = problemasOrdenados[i];
                if (!problemasSeleccionados.some(p => p.id === problema.id)) {
                    problemasSeleccionados.push(JSON.parse(JSON.stringify(problema)));
                    contador++;
                }
            }
        }
        
    } else {
        // MODO AZAR: selección aleatoria sin repetición
        const problemasDisponibles = [...problemas];
        let contador = 0;
        
        while (problemasDisponibles.length > 0 && contador < CONFIG.problemasPorRonda) {
            const indice = Math.floor(Math.random() * problemasDisponibles.length);
            const problema = problemasDisponibles[indice];
            
            // Si no se permiten repeticiones, verificar que el problema no haya sido usado
            if (!CONFIG.permitirRepeticionEntreRondas && torneo.problemasUtilizados.includes(problema.id)) {
                problemasDisponibles.splice(indice, 1); // Eliminar de disponibles
                continue; // Saltar este problema
            }
            
            problemasSeleccionados.push(JSON.parse(JSON.stringify(problema)));
            torneo.problemasUtilizados.push(problema.id);
            problemasDisponibles.splice(indice, 1);
            contador++;
        }
        
        // Si no hay suficientes problemas disponibles, usar repetición como fallback
        if (contador < CONFIG.problemasPorRonda) {
            console.log(`⚠️ No hay suficientes problemas nuevos. Usando repetición como fallback.`);
            const problemasRestantes = problemas.filter(p => !problemasSeleccionados.some(sel => sel.id === p.id));
            for (let i = 0; i < problemasRestantes.length && contador < CONFIG.problemasPorRonda; i++) {
                problemasSeleccionados.push(JSON.parse(JSON.stringify(problemasRestantes[i])));
                contador++;
            }
        }
    }
    
    console.log(`   📋 Problemas seleccionados para ronda ${torneo.rondaActual + 1}: ${problemasSeleccionados.map(p => p.id).join(', ')}`);
    return problemasSeleccionados;
}

function comenzarRonda(numeroRonda) {
    if (!torneo || torneo.estado !== 'en_curso') return;
    
    console.log(`🎯 COMIENZA RONDA ${numeroRonda}/${CONFIG.rondas}`);
    
    const problemasRonda = seleccionarProblemasRonda();
    
    torneo.problemasRonda = problemasRonda;
    torneo.rondaActual = numeroRonda;
    
    torneo.inscritos.forEach(id => {
        const jugador = jugadores[id];
        if (!jugador) return;
        
        jugador.rondaActual = numeroRonda;
        jugador.problemasResueltosRonda = 0;
        jugador.fallosRonda = 0;
        jugador.eliminadoEnRonda = false;
        jugador.problemaEnCurso = false;
        jugador.tiempoRestanteRonda = CONFIG.tiempoPorRonda;
        
        jugador.conexion.send(JSON.stringify({
            tipo: 'ronda_iniciada',
            ronda: numeroRonda,
            totalRondas: CONFIG.rondas,
            problemasPorRonda: CONFIG.problemasPorRonda,
            tiempoRondaActivo: CONFIG.tiempoPorRondaActivo,
            tiempoRonda: CONFIG.tiempoPorRonda
        }));
    });
    
    // Iniciar temporizador de ronda INDIVIDUAL si está activado
    if (CONFIG.tiempoPorRondaActivo) {
        torneo.inscritos.forEach(id => {
            const jugador = jugadores[id];
            if (!jugador) return;
            
            jugador.temporizadorRonda = setInterval(() => {
                if (!jugador || jugador.eliminadoEnRonda || torneo.estado !== 'en_curso') return;
                
                jugador.tiempoRestanteRonda--;
                
                jugador.conexion.send(JSON.stringify({
                    tipo: 'tiempo_ronda',
                    segundos: jugador.tiempoRestanteRonda
                }));
                
                if (jugador.tiempoRestanteRonda <= 0) {
                    clearInterval(jugador.temporizadorRonda);
                    jugador.temporizadorRonda = null;
                    
                    console.log(`⏰ TIEMPO DE RONDA AGOTADO para ${jugador.nombre}`);
                    
                    jugador.problemasResueltosRonda = torneo.problemasRonda.length;
                    finalizarRondaParaJugador(id);
                    verificarFinRonda();
                }
            }, 1000);
        });
    }
    
    torneo.inscritos.forEach(id => {
        const jugador = jugadores[id];
        if (!jugador) return;
        
        enviarProblemaAJugador(id);
    });
}

function enviarProblemaAJugador(idJugador) {
    const jugador = jugadores[idJugador];
    if (!jugador || !jugador.enTorneo) return;
    
    if (jugador.eliminadoEnRonda) return;
    
    if (!torneo || torneo.estado !== 'en_curso') return;
    
    if (jugador.problemasResueltosRonda >= torneo.problemasRonda.length) return;
    
    const problema = torneo.problemasRonda[jugador.problemasResueltosRonda];
    
    jugador.problemaActual = JSON.parse(JSON.stringify(problema));
    jugador.indiceMovimiento = 0;
    jugador.problemaEnCurso = true;
    jugador.tiempoRestanteProblema = CONFIG.tiempoPorProblema;
    
    const colorJugador = problema.fen.includes(' w ') ? 'w' : 'b';
    
    console.log(`📤 ${jugador.nombre} - Ronda ${jugador.rondaActual} Problema ${jugador.problemasResueltosRonda + 1} (ID: ${problema.id})`);
    
    jugador.conexion.send(JSON.stringify({
        tipo: 'problema_torneo',
        fen: problema.fen,
        colorJugador: colorJugador,
        descripcion: problema.descripcion,
        objetivo: problema.objetivo,
        numProblema: jugador.problemasResueltosRonda + 1,
        totalProblemas: torneo.problemasRonda.length,
        ronda: jugador.rondaActual,
        fallosRonda: jugador.fallosRonda,
        fallosMaximos: CONFIG.fallosMaximos,
        tiempoProblema: CONFIG.tiempoPorProblema,
        tiempoRondaActivo: CONFIG.tiempoPorRondaActivo,
        tiempoRonda: jugador.tiempoRestanteRonda,
        eliminadoEnRonda: false
    }));
    
    // Iniciar temporizador del problema INDIVIDUAL
    if (CONFIG.tiempoPorProblema > 0) {
        if (jugador.temporizadorProblema) {
            clearInterval(jugador.temporizadorProblema);
        }
        
        jugador.temporizadorProblema = setInterval(() => {
            if (!jugador.problemaEnCurso || jugador.eliminadoEnRonda || torneo.estado !== 'en_curso') {
                if (jugador.temporizadorProblema) {
                    clearInterval(jugador.temporizadorProblema);
                    jugador.temporizadorProblema = null;
                }
                return;
            }
            
            jugador.tiempoRestanteProblema--;
            
            jugador.conexion.send(JSON.stringify({
                tipo: 'tiempo_problema',
                segundos: jugador.tiempoRestanteProblema
            }));
            
            if (jugador.tiempoRestanteProblema <= 0) {
                clearInterval(jugador.temporizadorProblema);
                jugador.temporizadorProblema = null;
                
                console.log(`   ⏰ ${jugador.nombre} - TIEMPO AGOTADO en problema ${jugador.problemasResueltosRonda + 1}`);
                
                jugador.fallosRonda++;
                jugador.problemaEnCurso = false;
                
                jugador.conexion.send(JSON.stringify({
                    tipo: 'tiempo_agotado',
                    mensaje: '⏰ ¡Tiempo agotado!',
                    fallosRonda: jugador.fallosRonda,
                    fallosMaximos: CONFIG.fallosMaximos
                }));
                
                if (jugador.fallosRonda >= CONFIG.fallosMaximos) {
                    jugador.eliminadoEnRonda = true;
                    console.log(`   ⚠️ ${jugador.nombre} ELIMINADO DE LA RONDA ${jugador.rondaActual} (sigue en el torneo)`);
                    
                    jugador.conexion.send(JSON.stringify({
                        tipo: 'eliminado_ronda',
                        mensaje: `⚠️ Has sido eliminado de la ronda ${jugador.rondaActual} por 3 fallos. Espera a la siguiente ronda.`,
                        puntuacionTotal: jugador.puntuacionTotal
                    }));
                    
                    jugador.problemasResueltosRonda = torneo.problemasRonda.length;
                    finalizarRondaParaJugador(idJugador);
                    verificarFinRonda();
                } else {
                    jugador.problemasResueltosRonda++;
                    
                    if (jugador.problemasResueltosRonda >= torneo.problemasRonda.length) {
                        finalizarRondaParaJugador(idJugador);
                        verificarFinRonda();
                    } else {
                        enviarProblemaAJugador(idJugador);
                    }
                }
            }
        }, 1000);
    }
}

function manejarMovimiento(idJugador, datos) {
    const jugador = jugadores[idJugador];
    
    if (!jugador || !jugador.enTorneo || !jugador.problemaEnCurso || jugador.eliminadoEnRonda) return;
    
    if (!torneo || torneo.estado !== 'en_curso') return;
    
    // Detener temporizador del problema
    if (jugador.temporizadorProblema) {
        clearInterval(jugador.temporizadorProblema);
        jugador.temporizadorProblema = null;
    }
    
    const problema = jugador.problemaActual;
    const indice = jugador.indiceMovimiento;
    
    if (datos.movimiento === problema.solucion[indice]) {
        jugador.indiceMovimiento++;
        
        if (jugador.indiceMovimiento >= problema.solucion.length) {
            finalizarProblemaExitoso(idJugador);
        } else {
            setTimeout(() => {
                if (!jugador.problemaEnCurso || jugador.eliminadoEnRonda) return;
                
                const movimientoPrograma = problema.solucion[jugador.indiceMovimiento];
                jugador.indiceMovimiento++;
                
                jugador.conexion.send(JSON.stringify({
                    tipo: 'movimiento_programa',
                    movimiento: movimientoPrograma
                }));
                
                if (jugador.indiceMovimiento >= problema.solucion.length) {
                    finalizarProblemaExitoso(idJugador);
                }
            }, 800);
        }
    } else {
        jugador.fallosRonda++;
        jugador.problemaEnCurso = false;
        
        console.log(`   ❌ ${jugador.nombre} falla en ronda ${jugador.rondaActual}. Fallos ronda: ${jugador.fallosRonda}/${CONFIG.fallosMaximos}`);
        
        jugador.conexion.send(JSON.stringify({
            tipo: 'movimiento_incorrecto',
            correcto: problema.solucion[indice],
            fallosRonda: jugador.fallosRonda,
            fallosMaximos: CONFIG.fallosMaximos
        }));
        
        if (jugador.fallosRonda >= CONFIG.fallosMaximos) {
            jugador.eliminadoEnRonda = true;
            jugador.problemaEnCurso = false;
            
            console.log(`   ⚠️ ${jugador.nombre} ELIMINADO DE LA RONDA ${jugador.rondaActual} (sigue en el torneo)`);
            
            jugador.conexion.send(JSON.stringify({
                tipo: 'eliminado_ronda',
                mensaje: `⚠️ Has sido eliminado de la ronda ${jugador.rondaActual} por 3 fallos. Espera a la siguiente ronda.`,
                puntuacionTotal: jugador.puntuacionTotal
            }));
            
            jugador.problemasResueltosRonda = torneo.problemasRonda.length;
            finalizarRondaParaJugador(idJugador);
            verificarFinRonda();
            return;
        }
        
        jugador.problemasResueltosRonda++;
        
        if (jugador.problemasResueltosRonda >= torneo.problemasRonda.length) {
            finalizarRondaParaJugador(idJugador);
            verificarFinRonda();
        } else {
            setTimeout(() => {
                enviarProblemaAJugador(idJugador);
            }, 1500);
        }
    }
}

function finalizarProblemaExitoso(idJugador) {
    const jugador = jugadores[idJugador];
    if (!jugador) return;
    
    jugador.problemaEnCurso = false;
    jugador.problemasResueltosRonda++;
    
    console.log(`   ✅ ${jugador.nombre} resuelve problema ${jugador.problemasResueltosRonda}/${torneo.problemasRonda.length}`);
    
    jugador.conexion.send(JSON.stringify({
        tipo: 'problema_completado',
        mensaje: '✅ ¡Problema resuelto!'
    }));
    
    if (jugador.problemasResueltosRonda >= torneo.problemasRonda.length) {
        finalizarRondaParaJugador(idJugador);
        verificarFinRonda();
    } else {
        setTimeout(() => {
            enviarProblemaAJugador(idJugador);
        }, 1500);
    }
}

function finalizarRondaParaJugador(idJugador) {
    const jugador = jugadores[idJugador];
    if (!jugador) return;
    
    // Limpiar temporizadores INDIVIDUALES
    if (jugador.temporizadorProblema) {
        clearInterval(jugador.temporizadorProblema);
        jugador.temporizadorProblema = null;
    }
    
    if (jugador.temporizadorRonda) {
        clearInterval(jugador.temporizadorRonda);
        jugador.temporizadorRonda = null;
    }
    
    const aciertos = jugador.problemasResueltosRonda - jugador.fallosRonda;
    const puntuacionRonda = aciertos * 10;
    
    jugador.puntuacionesPorRonda[jugador.rondaActual - 1] = puntuacionRonda;
    jugador.puntuacionTotal += puntuacionRonda;
    
    console.log(`   📊 ${jugador.nombre} - Ronda ${jugador.rondaActual}: ${puntuacionRonda} puntos (Total: ${jugador.puntuacionTotal})`);
    
    jugador.conexion.send(JSON.stringify({
        tipo: 'ronda_completada',
        puntuacionRonda: puntuacionRonda,
        puntuacionTotal: jugador.puntuacionTotal,
        aciertos: aciertos,
        fallos: jugador.fallosRonda
    }));
}

function verificarFinRonda() {
    if (!torneo) return;
    
    console.log(`🔍 Verificando fin de ronda ${torneo.rondaActual}...`);
    
    const todosJugadores = torneo.inscritos
        .map(id => jugadores[id])
        .filter(j => j);
    
    const todosTerminaron = todosJugadores.every(j => 
        j.problemasResueltosRonda >= torneo.problemasRonda.length
    );
    
    console.log(`   Jugadores: ${todosJugadores.length}, Terminaron: ${todosJugadores.filter(j => j.problemasResueltosRonda >= torneo.problemasRonda.length).length}`);
    
    if (todosTerminaron) {
        console.log(`   ✅ TODOS TERMINARON RONDA ${torneo.rondaActual}`);
        
        actualizarClasificacion();
        
        if (torneo.rondaActual < CONFIG.rondas) {
            iniciarDescansoEntreRondas();
        } else {
            finalizarTorneo();
        }
    }
}

function iniciarDescansoEntreRondas() {
    if (!torneo) return;
    if (torneo.estado === 'descanso') return;
    
    torneo.estado = 'descanso';
    torneo.tiempoRestante = CONFIG.descansoEntreRondas;
    
    console.log(`⏸️ DESCANSO - ${torneo.tiempoRestante} segundos hasta ronda ${torneo.rondaActual + 1}`);
    
    if (torneo.descansoTemporizador) {
        clearInterval(torneo.descansoTemporizador);
    }
    
    torneo.inscritos.forEach(id => {
        const jugador = jugadores[id];
        if (!jugador) return;
        
        jugador.conexion.send(JSON.stringify({
            tipo: 'descanso_iniciado',
            segundos: CONFIG.descansoEntreRondas,
            siguienteRonda: torneo.rondaActual + 1
        }));
    });
    
    torneo.descansoTemporizador = setInterval(() => {
        torneo.tiempoRestante--;
        
        torneo.inscritos.forEach(id => {
            const jugador = jugadores[id];
            if (!jugador) return;
            
            jugador.conexion.send(JSON.stringify({
                tipo: 'descanso_contador',
                segundos: torneo.tiempoRestante
            }));
        });
        
        if (torneo.tiempoRestante <= 0) {
            clearInterval(torneo.descansoTemporizador);
            torneo.descansoTemporizador = null;
            torneo.estado = 'en_curso';
            torneo.rondaActual++;
            
            console.log(`🎯 COMIENZA RONDA ${torneo.rondaActual}/${CONFIG.rondas}`);
            
            torneo.inscritos.forEach(id => {
                const jugador = jugadores[id];
                if (!jugador) return;
                
                jugador.conexion.send(JSON.stringify({
                    tipo: 'nueva_ronda',
                    ronda: torneo.rondaActual
                }));
            });
            
            comenzarRonda(torneo.rondaActual);
        }
    }, 1000);
}

function actualizarClasificacion() {
    if (!torneo) return;
    
    const clasificacion = torneo.inscritos
        .map(id => jugadores[id])
        .filter(j => j)
        .map(j => ({
            id: j.id,
            nombre: j.nombre,
            puntuacionTotal: j.puntuacionTotal,
            puntuacionesPorRonda: j.puntuacionesPorRonda || []
        }))
        .sort((a, b) => b.puntuacionTotal - a.puntuacionTotal);
    
    torneo.clasificacion = clasificacion;
    
    torneo.inscritos.forEach(id => {
        const jugador = jugadores[id];
        if (!jugador) return;
        
        jugador.conexion.send(JSON.stringify({
            tipo: 'clasificacion_torneo',
            clasificacion: clasificacion
        }));
    });
}

function finalizarTorneo() {
    if (!torneo) return;
    
    torneo.estado = 'finalizado';
    
    actualizarClasificacion();
    
    const ganador = torneo.clasificacion[0];
    
    console.log(`🏆 TORNEO FINALIZADO - GANADOR: ${ganador?.nombre} con ${ganador?.puntuacionTotal} puntos`);
    
    torneo.inscritos.forEach(id => {
        const jugador = jugadores[id];
        if (!jugador) return;
        
        const ganadorInfo = ganador ? {
            nombre: ganador.nombre || 'Desconocido',
            puntuacion: ganador.puntuacionTotal || 0
        } : {
            nombre: 'No hay ganador',
            puntuacion: 0
        };
        
        jugador.conexion.send(JSON.stringify({
            tipo: 'torneo_finalizado',
            clasificacion: torneo.clasificacion,
            rondas: CONFIG.rondas,
            ganador: ganadorInfo
        }));
        
        jugador.enTorneo = false;
    });
}

function actualizarListaInscritos() {
    const inscritos = salaEspera.map(id => jugadores[id]?.nombre || 'Anónimo');
    
    salaEspera.forEach(id => {
        const jugador = jugadores[id];
        if (!jugador) return;
        
        jugador.conexion.send(JSON.stringify({
            tipo: 'lista_inscritos',
            inscritos: inscritos,
            total: salaEspera.length,
            maximo: CONFIG.maxJugadores
        }));
    });
}

function manejarAbandono(idJugador) {
    const jugador = jugadores[idJugador];
    if (!jugador) return;
    
    if (jugador.enTorneo) {
        if (torneo && torneo.estado === 'en_curso') {
            jugador.problemasResueltosRonda = torneo.problemasRonda.length;
            finalizarRondaParaJugador(idJugador);
            verificarFinRonda();
        }
    }
    
    const index = salaEspera.indexOf(idJugador);
    if (index !== -1) salaEspera.splice(index, 1);
}

function manejarDesconexion(idJugador) {
    const jugador = jugadores[idJugador];
    if (!jugador) return;
    
    manejarAbandono(idJugador);
}

// ============================================
// INICIAR SERVIDOR
// ============================================
const PORT = process.env.PORT || 8081;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Servidor HTTP y WebSocket corriendo en puerto ${PORT}`);
    console.log(`🌍 Accede a: https://tu-app.onrender.com (o localhost:${PORT} en local)`);
    console.log(`📁 Sirviendo archivos desde: ${path.join(__dirname, '../cliente')}`);
});