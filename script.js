// ==========================================
// 0. MÓDULO DE SEGURIDAD Y CREDENCIALES
// ==========================================
const USUARIOS_SISTEMA = [
    { usr: "admin", pass: "1234", inst: "SSA" },
    { usr: "operador", pass: "imss2026", inst: "IMSS" }
];

// ==========================================
// 1. AUTO-RELLENADO DINÁMICO (ADAPTADO A LA ARQUITECTURA ASÍNCRONA)
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    // Busca el ID del input de fecha (soporta ambos nombres por seguridad)
    const inputFecha = document.getElementById("filtro-fecha-inicio") || document.getElementById("fechaReporte");
    const selectIdentificador = document.getElementById("identificadorReporte");

    if (inputFecha && selectIdentificador) {
        // Se declara la función flecha como asíncrona (async) para permitir llamadas a la BD
        inputFecha.addEventListener("change", async () => {
            const fechaElegida = inputFecha.value;
            
            if (!fechaElegida) {
                selectIdentificador.innerHTML = '<option value="">Selecciona primero una fecha...</option>';
                return;
            }

            // Mensaje de espera mientras se obtienen los datos
            selectIdentificador.innerHTML = '<option value="">Cargando identificadores...</option>';

            try {
                // 1. CONEXIÓN A LA BASE DE DATOS (Usando tu propia función)
                const datosBD = await obtenerDatosDesdeGoogle();
                
                // Validación estricta apuntando al nodo 'censo' de tu JSON
                if (!datosBD || !datosBD.censo || datosBD.censo.length === 0) {
                    console.warn("La base de datos (Censo) no está disponible o está vacía.");
                    selectIdentificador.innerHTML = '<option value="">Inicia sesión para cargar datos</option>';
                    return;
                }

                // 2. EXTRACCIÓN Y FILTRADO
                const censoSeguro = datosBD.censo;
                
                const registrosFecha = censoSeguro.filter(p => {
                    let fActividad = buscarDato(p, "fecha de la actividad");
                    return fActividad ? normalizarFecha(fActividad) === fechaElegida : false;
                });
                
                // Creación de un arreglo único (Set) con los identificadores encontrados ese día
                const identificadoresUnicos = [...new Set(registrosFecha.map(p => buscarDato(p, "identificador")).filter(Boolean))];

                if (identificadoresUnicos.length === 0) {
                    selectIdentificador.innerHTML = '<option value="">No hubo actividades en esta fecha</option>';
                    return;
                }

                // 3. POBLACIÓN DEL DOM (Inyección de etiquetas <option>)
                selectIdentificador.innerHTML = '<option value="">Seleccione el Identificador...</option>';
                identificadoresUnicos.forEach(id => {
                    const opt = document.createElement("option");
                    opt.value = id;
                    opt.textContent = id;
                    selectIdentificador.appendChild(opt);
                });
                
            } catch (error) {
                console.error("Error al obtener los datos para el select:", error);
                selectIdentificador.innerHTML = '<option value="">Error interno al cargar</option>';
            }
        });
    }
});

document.addEventListener("DOMContentLoaded", () => {
    const selectTipo = document.getElementById("filtro-tipo");
    const contenedorCaso = document.getElementById("contenedor-filtro-caso");
    const selectCaso = document.getElementById("filtro-caso");
    
    // Escudo lógico: Solo aplica la interactividad si los elementos existen en el HTML
    if (selectTipo && contenedorCaso) {
        
        // 1. Inyección de reactividad segura
        selectTipo.addEventListener("change", (e) => {
            if (e.target.value === "bloqueo") {
                contenedorCaso.style.display = "block"; // Revela el desplegable
            } else {
                contenedorCaso.style.display = "none";  // Oculta el desplegable
                if (selectCaso) selectCaso.value = "";  // Limpia el valor residual
            }
        });
        
        // 2. Sincronización del estado inicial (Previene desincronización al refrescar con F5)
        if (selectTipo.value === "bloqueo") {
            contenedorCaso.style.display = "block";
        } else {
            contenedorCaso.style.display = "none";
        }
    }
});

let DATOS_CACHE = null;

// UBICACIÓN: script.js -> En la raíz del archivo (fuera de otras funciones)

async function validarAcceso() {
    try {
        const inputU = document.getElementById("login-usuario");
        const inputP = document.getElementById("login-password");
        const inputI = document.getElementById("login-institucion");

        if (!inputU || !inputP || !inputI) {
            throw new Error("No se encuentran los campos de login.");
        }

        const u = inputU.value.trim().toLowerCase(); 
        const p = inputP.value.trim();
        const i = inputI.value;

        if (u === "" || p === "" || i === "") {
            alert("⚠️ Por favor, llena todos los campos y selecciona tu institución.");
            return;
        }

        const valido = USUARIOS_SISTEMA.find(x => x.usr.toLowerCase() === u && x.pass === p && x.inst === i);
        
        if (!valido) {
            alert("❌ Acceso denegado. Tus datos no coinciden.");
            return;
        }

        document.getElementById("seccion-login").classList.add("oculto");
        document.getElementById("seccion-dashboard").classList.remove("oculto");
        
        const inputFiltroInst = document.getElementById("filtro-institucion");
        if (inputFiltroInst) {
            inputFiltroInst.value = valido.inst;
        }

        const btn = document.querySelector(".panel-acciones .btn-principal");
        if (btn) btn.innerText = "Sincronizando Base de Datos... (Puede tomar unos segundos)";
        
        // Petición al servidor (Solo funcionará si usas Live Server / http://)
        DATOS_CACHE = await obtenerDatosDesdeGoogle();
        
        if (!DATOS_CACHE || !DATOS_CACHE.censo) {
            throw new Error("El JSON de 'censo' viene vacío. Revisa la red o permisos de Google Apps Script.");
        }

        const vacs = new Set(); 
        const regs = new Set();
        const casosTotales = new Set(); 
        const instUsuario = valido.inst.toUpperCase();
        
        DATOS_CACHE.censo.forEach(row => {
            let instReg = String(buscarDato(row, "registrador_institucion")).toUpperCase();
            let perteneceInstitucion = (instUsuario === "TODAS" || instReg.includes(instUsuario) || instUsuario === "");
            
            if (perteneceInstitucion) {
                let v = buscarDato(row, "nombre de vacunador") || buscarDato(row, "vacunador");
                if (v && String(v).trim() !== "") vacs.add(String(v).trim());

                let r = buscarDato(row, "registrador_nombre") || buscarDato(row, "nombre del registrador") || buscarDato(row, "registrador_institucion"); 
                if (r && String(r).trim() !== "") regs.add(String(r).trim());

                let nombreCaso = buscarDato(row, "nombre del caso");
                if (nombreCaso && String(nombreCaso).trim() !== "") {
                    casosTotales.add(String(nombreCaso).trim());
                }
            }
        });
        
        const sVac = document.getElementById("filtro-vacunador");
        const sReg = document.getElementById("filtro-registrador");
        const sCaso = document.getElementById("filtro-caso"); 
        
        if (sVac) { sVac.options.length = 1; [...vacs].sort().forEach(val => sVac.add(new Option(val, val))); }
        if (sReg) { sReg.options.length = 1; [...regs].sort().forEach(val => sReg.add(new Option(val, val))); }
        if (sCaso) { sCaso.options.length = 1; [...casosTotales].sort().forEach(val => sCaso.add(new Option(val, val))); }

        if (btn) btn.innerText = "Generar Reporte Seleccionado";

    } catch (error) {
        console.error("Fallo crítico:", error);
        alert(`Fallo en el sistema: ${error.message}`);
        const btn = document.querySelector(".panel-acciones .btn-principal");
        if (btn) btn.innerText = "Error de Conexión.";
    }
}

window.validarAcceso = validarAcceso;

// 1. ESQUEMAS ORIGINALES CENSIA
const ESQUEMAS = {
    "1-A": [ {label:"BCG",key:"bcg"}, {label:"HepB",key:"hepatitis b"}, {label:"Hexa 1",key:"hexavalente acelular (dpat-vip-hb-hib) 1"}, {label:"Hexa 2",key:"hexavalente acelular (dpat-vip-hb-hib) 2"}, {label:"Hexa 3",key:"hexavalente acelular (dpat-vip-hb-hib) 3"}, {label:"Hexa R",key:"hexavalente acelular (dpat-vip-hb-hib) refuerzo"}, {label:"DPT",key:"dpt"}, {label:"Rota 1",key:"rotavirus 1"}, {label:"Rota 2",key:"rotavirus 2"}, {label:"Neumo 1",key:"neumococica conjugada (13 serotipos) 1"}, {label:"Neumo 2",key:"neumococica conjugada (13 serotipos) 2"}, {label:"Neumo 3",key:"neumococica conjugada (13 serotipos) 3"}, {label:"Influ 1",key:"influenza 1"}, {label:"Influ 2",key:"influenza 2"}, {label:"Influ R",key:"influenza refuerzo"}, {label:"SRP 0",key:"srp 0"}, {label:"SRP 1",key:"srp 1"}, {label:"SRP 2",key:"srp 2"}, {label:"Otras",key:"otras"} ],
    "1-B": [ {label:"HepB 1",key:"hepatitis b 1"}, {label:"HepB 2",key:"hepatitis b 2"}, {label:"TD 1",key:"td 1"}, {label:"TD 2",key:"td 2"}, {label:"TD 3",key:"td 3"}, {label:"TD R",key:"td refuerzo"}, {label:"TDPA",key:"tdpa"}, {label:"INFLU",key:"influenza"}, {label:"SR 1",key:"sr 1"}, {label:"SR 2",key:"sr 2"}, {label:"SR R",key:"sr refuerzo"}, {label:"VPH",key:"vph"}, {label:"VARICELA",key:"varicela"}, {label:"HEP A",key:"hepatitis a"}, {label:"COVID",key:"covid"}, {label:"Neumo",key:"neumococica conjugada (refuerzo)"}, {label:"Neumo 23",key:"neumo 23"}, {label:"Otras",key:"otras"} ],
    "1-C": [ {label:"HepB 1",key:"hepatitis b 1"}, {label:"HepB 2",key:"hepatitis b 2"}, {label:"TD 1",key:"td 1"}, {label:"TD 2",key:"td 2"}, {label:"TD 3",key:"td 3"}, {label:"TD R",key:"td refuerzo"}, {label:"TDPA",key:"tdpa"}, {label:"INFLU",key:"influenza"}, {label:"SR 1",key:"sr 1"}, {label:"SR 2",key:"sr 2"}, {label:"SR R",key:"sr refuerzo"}, {label:"VARICELA",key:"varicela"}, {label:"HEP A",key:"hepatitis a"}, {label:"COVID",key:"covid"}, {label:"Neumo",key:"neumococica conjugada (refuerzo)"}, {label:"Neumo 23",key:"neumo 23"}, {label:"Otras",key:"otras"} ]
};

// 2. BUSCADOR Y NORMALIZADORES
function buscarDato(fila, parteNombre) {
    if (!parteNombre || !fila) return "";
    const busqueda = parteNombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    for (let key of Object.keys(fila)) {
        let keyLimpia = key.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        if (keyLimpia === busqueda || keyLimpia.includes(busqueda)) return fila[key] || "";
    }
    return "";
}

// UBICACIÓN: script.js -> Sección de Funciones Auxiliares
const abreviarEdad = (edadStr) => {
    if (!edadStr) return "";
    return String(edadStr)
        .toLowerCase()
        .replace(/años|año/g, 'a')
        .replace(/meses|mes/g, 'm')
        .replace(/\s+/g, ' ') // Limpia espacios dobles
        .trim();
};

const normalizarFecha = (f) => {
    if (!f) return "";
    let soloFecha = String(f).split(' ')[0]; 
    let partes = soloFecha.split(/[\/\-]/); 
    if (partes.length !== 3) return soloFecha;
    let dia = parseInt(partes[0], 10), mes = parseInt(partes[1], 10), anio = parseInt(partes[2], 10);
    if (anio < 100) anio += 2000;
    return `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`; 
};

// Convierte "10 años", "11 meses", o numéricos "25" a enteros válidos
const parseEdadEnAnios = (edadStr) => {
    // Si viene vacío o indefinido, devuelve -1 para ignorarlo en el conteo
    if (!edadStr || String(edadStr).trim() === "") return -1; 
    
    let str = String(edadStr).toLowerCase().trim();
    
    // Si contiene la palabra explícita
    if (str.includes("año") || str.includes("ano")) {
        let match = str.match(/(\d+)\s*(año|ano)/);
        return match ? parseInt(match[1]) : -1;
    }
    // Si contiene solo meses o días, tiene 0 años (Es menor de 1)
    if (str.includes("mes") || str.includes("dia") || str.includes("día")) {
        return 0;
    }
    // Si es un número puro sin texto (ej. "15" o "40")
    if (!isNaN(str)) {
        return parseInt(str);
    }
    
    return -1; // Fallback para datos corruptos
};

// Convierte "H/M" de la BD al formato del reporte
const parseSexo = (sexoStr) => {
    let s = String(sexoStr).trim().toUpperCase();
    if (s === "H" || s === "HOMBRE") return "M"; // Masculino
    if (s === "M" || s === "MUJER") return "F"; // Femenino
    return "";
};

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyjKIXoNE6wV7hj77IMfeJF2-8gOPE68DDsJsEGBCeoqA7azHL4laZ48oIpWFLPY3mW0w/exec';

async function obtenerDatosDesdeGoogle() {
    if (DATOS_CACHE) return DATOS_CACHE;
    try {
        const response = await fetch(APPS_SCRIPT_URL);
        if (!response.ok) throw new Error("Red");
        return await response.json();
    } catch (e) { return null; }
}

function buscarFechaVacuna(filasVacunas, keyVacuna) {
    if (!keyVacuna || !filasVacunas || filasVacunas.length === 0) return "";
    let busqueda = keyVacuna.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    for (let fila of filasVacunas) {
        let esEstaVacuna = Object.values(fila).some(val => String(val).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(busqueda));
        let fechaIngresada = fila["Fecha_Ingresada"] || buscarDato(fila, "fecha_ingresada") || buscarDato(fila, keyVacuna);
        if (esEstaVacuna && fechaIngresada) return normalizarFecha(fechaIngresada);
    }
    return "";
}

// ==========================================
// 2. FUNCIÓN DE EJECUCIÓN (DISPATCHER)
// ==========================================
async function ejecutarGeneracionPorFiltros() {
    const btn = document.querySelector(".panel-acciones .btn-principal");
    
    try {
        const tipoRep = document.getElementById("filtro-tipo").value;
        
        // Uso unificado de variables de lectura (Ajusta los IDs si usas 'filtro-fecha-inicio' o 'fechaReporte')
        const inputFecha = document.getElementById("fechaReporte") || document.getElementById("filtro-fecha-inicio");
        const fInit = inputFecha ? inputFecha.value : "";
        
        const inputFEnd = document.getElementById("fechaFinReporte") || document.getElementById("filtro-fecha-fin");
        let fEnd = inputFEnd ? inputFEnd.value : "";
        if (!fEnd && fInit) fEnd = fInit; 

        const vac = document.getElementById("filtro-vacunador") ? document.getElementById("filtro-vacunador").value : "";
        const reg = document.getElementById("filtro-registrador") ? document.getElementById("filtro-registrador").value : "";
        
        const casoSeleccionado = document.getElementById("filtro-caso") ? document.getElementById("filtro-caso").value : ""; 
        const instSeleccionada = document.getElementById("filtro-institucion") ? document.getElementById("filtro-institucion").value : "";
        
        // Leer el identificador dinámico de la Bitácora
        const selectIdentificador = document.getElementById("identificadorReporte");
        const idActivo = selectIdentificador ? selectIdentificador.value : "";
        
        // REGLAS DE NEGOCIO Y BLOQUEOS
        if (tipoRep === "bloqueo" && !casoSeleccionado) {
            throw new Error("Debe seleccionar un Caso (Bloqueo Terminado) del menú.");
        }
        if (tipoRep === "mapa_diario" && (!fInit || !idActivo)) {
            throw new Error("Para la Bitácora Diaria debe seleccionar la Fecha y el Identificador.");
        }
        
        btn.innerText = "Procesando Datos...";
        
        // Simulación de tu fetch (se asume que obtenerDatosDesdeGoogle() existe)
        const datosBD = await obtenerDatosDesdeGoogle();
        if (!datosBD) throw new Error("No se recibió respuesta del servidor.");
        if (datosBD.error) throw new Error("Error interno: " + datosBD.error);
        
        const censoSeguro = datosBD.censo || [];
        const vacunasSeguras = datosBD.historial_vacunas || []; 
        
        if (censoSeguro.length === 0) throw new Error("La hoja de Censo está vacía.");

        const pacientesFiltrados = censoSeguro.filter(p => {
            let fAct = normalizarFecha(buscarDato(p, "fecha de la actividad"));
            let instReg = String(buscarDato(p, "registrador_institucion")).toUpperCase(); 

            let matchFecha = fInit ? (fAct >= fInit && fAct <= fEnd) : true;
            let nombreVacBD = String(buscarDato(p, "nombre de vacunador")).trim();
            let nombreRegBD = String(buscarDato(p, "registrador_nombre")).trim();
            
            let matchVac = vac ? (nombreVacBD === vac) : true; 
            let matchReg = reg ? (nombreRegBD === reg) : true; 
            let matchCaso = casoSeleccionado ? (buscarDato(p, "nombre del caso").trim() === casoSeleccionado) : true; 
            let matchInst = (instSeleccionada === "TODAS" || !instSeleccionada) ? true : instReg.includes(instSeleccionada);

            return matchFecha && matchVac && matchReg && matchCaso && matchInst;
        });

        if (pacientesFiltrados.length === 0) {
            alert("⚠️ No hay registros que coincidan con los filtros seleccionados.");
            btn.innerText = "Generar Reporte Seleccionado";
            return;
        }

        // CRUCE RELACIONAL BLINDADO
        const datosUnificados = pacientesFiltrados.map(p => ({
            ...p, 
            _historialVacunas: vacunasSeguras.filter(v => buscarDato(v, "id_paciente") == buscarDato(p, "id")) 
        }));

        // ENRUTAMIENTO Y RENDERIZADO (Reemplaza con tus funciones reales)
        if (tipoRep === "censo") generarAnexosCenso(datosUnificados, fInit, fEnd);
        else if (tipoRep === "informe") generarInformeActividad(datosUnificados, fInit, fEnd);
        else if (tipoRep === "bloqueo") generarAccionesBloqueo(datosUnificados, fInit, fEnd);
        else if (tipoRep === "mapa_diario") generarMapaDiarioEnPDF(datosUnificados, fInit, idActivo);

        btn.innerText = "Generar Reporte Seleccionado";

    } catch (error) {
        console.error("Fallo crítico detectado en el hilo de ejecución:", error);
        alert("Ocurrió un error:\n" + error.message);
        btn.innerText = "Generar Reporte Seleccionado";
    }
}

// 4. GENERACIÓN DE ANEXOS 1-A, 1-B, 1-C
function generarAnexosCenso(datosUnificados, fInit, fEnd) {
    const grupos = { "1-A": [], "1-B": [], "1-C": [] };
    datosUnificados.forEach(f => {
        let nombrePaciente = buscarDato(f, "quien recibe atencion") || buscarDato(f, "nombre del paciente");
        
        if (!nombrePaciente || String(nombrePaciente).trim() === "") {
            return; 
        }
        let catEdad = String(buscarDato(f, "tipo de vacunacion")).toLowerCase();
        let tipo = (catEdad.includes("0 a 9") || catEdad.includes("infante")) ? "1-A" : (catEdad.includes("10 a 19") || catEdad.includes("adolescente")) ? "1-B" : "1-C";
        grupos[tipo].push(f);
    });
    
    let labelRango = fInit === fEnd ? fInit : `${fInit}_al_${fEnd}`;
    Object.keys(grupos).forEach(tipo => {
        if (grupos[tipo].length > 0) procesarAnexoBase(tipo, grupos[tipo], fInit, fEnd, labelRango);
    });
    alert("✅ Anexos generados correctamente.");
}

function procesarAnexoBase(tipo, datos, fInit, fEnd, labelRango) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'pt', 'legal');
    const esquema = ESQUEMAS[tipo];
    
    const bodyData = [];
    datos.forEach(p => {
        if (tipo === "1-C") { bodyData.push({ t: "UNICO", p: p }); } 
        else { bodyData.push({ t: "NINO", p: p }); bodyData.push({ t: "PARENTESCO", p: p }); }
    });

    const perPage = (tipo === "1-C") ? 12 : 20;
    while (bodyData.length % perPage !== 0) bodyData.push({ t: "VACIO", p: null });

    doc.autoTable({
        head: [['NOMBRE / PARENTESCO', 'CURP', 'F.NAC', 'EDAD', 'SEXO', 'DIRECCIÓN (CALLE Y COLONIA)', '', ...esquema.map(v => v.label)]],
        body: bodyData.map(() => Array(7 + esquema.length).fill("")), 
        startY: 135, margin: { top: 135, bottom: 115 }, theme: 'grid',
        styles: { fontSize: 5, textColor: 0, halign: 'center', lineWidth: 0.5 },
        columnStyles: { 0: { cellWidth: 120, halign: 'left' }, 1: { cellWidth: 70 }, 2: { cellWidth: 50 }, 3: { cellWidth: 30 }, 4: { cellWidth: 30 }, 5: { cellWidth: 65 }, 6: { cellWidth: 65 } },
        headStyles: { fillColor: [255, 255, 255], textColor: [159, 34, 65], minCellHeight: 45 },
        didParseCell: function(d) {
            d.cell.text = []; 
            if (d.section === 'body') {
                if (tipo === "1-C") d.cell.styles.minCellHeight = 24;
                else d.cell.styles.minCellHeight = (d.row.index % 2 === 0) ? 14 : 10;
                
                if (Math.floor(d.row.index / (tipo === "1-C" ? 1 : 2)) % 2 !== 0) d.cell.styles.fillColor = [240, 240, 240];
                
                // Req 7: Fusión de celdas para que la dirección quepa completa sin cortes
                if (tipo !== "1-C" && (d.column.index === 5 || d.column.index === 6)) {
                    let rType = bodyData[d.row.index].t;
                    if (rType === "NINO") { d.cell.rowSpan = 2; d.cell.styles.valign = 'middle'; } // FUSIONA HACIA ABAJO
                }
            }
        },
        didDrawCell: function(d) {
            const col = d.column.index;
            if (d.section === 'head') {
                doc.saveGraphicsState(); doc.setFontSize(6); doc.setTextColor(159, 34, 65);
                if (col === 5) {
                    // Req 6: Letrero DIRECCIÓN abarca Calle y Colonia
                    doc.text("DIRECCIÓN", d.cell.x + d.cell.width, d.cell.y + 12, { align: 'center' });
                    doc.setDrawColor(180); doc.setLineWidth(0.5); doc.line(d.cell.x, d.cell.y + 16, d.cell.x + d.cell.width * 2, d.cell.y + 16);
                    doc.text("CALLE", d.cell.x + (d.cell.width/2), d.cell.y + 35, { align: 'center' });
                } else if (col === 6) {
                    doc.text("COLONIA", d.cell.x + (d.cell.width/2), d.cell.y + 35, { align: 'center' });
                } else if (col >= 7) {
                    doc.text(esquema[col-7].label, d.cell.x + (d.cell.width/2), d.cell.y + 15, { align: 'center' });
                    doc.setDrawColor(180); doc.setLineWidth(0.5);
                    doc.line(d.cell.x, d.cell.y + 20, d.cell.x + d.cell.width, d.cell.y + 20);
                    doc.line(d.cell.x + (d.cell.width/2), d.cell.y + 20, d.cell.x + (d.cell.width/2), d.cell.y + d.cell.height);
                    doc.setFontSize(4); doc.text("FECHA", d.cell.x + 2, d.cell.y + 35); doc.text("LOTE", d.cell.x + (d.cell.width/2) + 2, d.cell.y + 35);
                } else {
                    const tits = ['NOMBRE / PARENTESCO', 'CURP', 'F.NAC', 'EDAD', 'SEXO'];
                    doc.text(tits[col], d.cell.x + (d.cell.width/2), d.cell.y + 25, { align: 'center' });
                }
                doc.restoreGraphicsState();
            }

            if (d.section === 'body') {
                const rowInfo = bodyData[d.row.index];
                if (rowInfo.t === "VACIO") return;
                const p = rowInfo.p;
                const isMain = (rowInfo.t === "NINO" || rowInfo.t === "UNICO");
                
                if (col >= 7) { doc.setDrawColor(180); doc.setLineWidth(0.5); doc.line(d.cell.x + (d.cell.width/2), d.cell.y, d.cell.x + (d.cell.width/2), d.cell.y + d.cell.height); }
                doc.setTextColor(0);
                
                if (isMain) {
                    doc.setFontSize(5.5);
                    // Llaves Exactas 3, 4, 5, 6, 7, 8, 9
                    if(col === 0) doc.text(buscarDato(p, "quien recibe atencion") || "", d.cell.x + 2, d.cell.y + 10);
                    
                    // Columna 1: CURP (Horizontal, letra pequeña para ajustar)
                    if(col === 1) {
                        let curp = buscarDato(p, "curp");
                        if (curp) {
                            doc.setFontSize(4.5); // Reducción de fuente crítica para ajustar 18 caracteres
                            doc.text(String(curp).toUpperCase(), d.cell.x + 1, d.cell.y + 10);
                            doc.setFontSize(5.5); // Restaurar fuente base del documento
                        }
                    }
                    
                    // Columna 2: F.NAC (Renderizado Horizontal y Centrado)
                    if(col === 2) {
                        let fNac = normalizarFecha(buscarDato(p, "fecha ingresada")); 
                        if (fNac) {
                            doc.setFontSize(5.5); // Ajuste de fuente para garantizar que la fecha no desborde
                            // Se elimina el angle: 90 y el cálculo de zigzag. 
                            // Se posiciona desde arriba (y + 10) y se centra horizontalmente.
                            doc.text(String(fNac), d.cell.x + (d.cell.width / 2), d.cell.y + 10, { align: 'center' });
                        }
                    }

                    // Columna 3: EDAD (Horizontal y Abreviada "10 a 5 m")
                    if(col === 3) {
                        let edadStr = buscarDato(p, "edad");
                        let edadAbreviada = abreviarEdad(edadStr);
                        if (edadAbreviada) {
                            doc.setFontSize(5); 
                            // Centrado horizontal aproximado para la celda de edad
                            doc.text(edadAbreviada, d.cell.x + (d.cell.width/2), d.cell.y + 10, { align: 'center' });
                            doc.setFontSize(5.5);
                        }
                    }

                    if(col === 4) {
                        let sx = parseSexo(buscarDato(p, "sexo"));
                        doc.text(sx === "M" ? "Masc" : (sx === "F" ? "Fem" : ""), d.cell.x + (d.cell.width/2), d.cell.y + 10, { align: 'center' });
                    }
                    
                    if (col === 5) { doc.text(doc.splitTextToSize(buscarDato(p, "direccion") || "", d.cell.width - 2), d.cell.x + 1, d.cell.y + 8); }
                    if (col === 6) { doc.text(doc.splitTextToSize(buscarDato(p, "colonia") || "", d.cell.width - 2), d.cell.x + 1, d.cell.y + 8); }
                } 
                else if (rowInfo.t === "PARENTESCO") {
                    if(col === 0) {
                        // Llaves Exactas 14 y 15
                        let txtPar = `${buscarDato(p, "tipo de parentesco")} - ${buscarDato(p, "nombre pariente")}`;
                        doc.setFontSize(4.5); doc.text(txtPar, d.cell.x + 2, d.cell.y + 7);
                    }
                    if(col === 2) {
                        // Llave Exacta 16
                        doc.setFontSize(5.5); doc.text(normalizarFecha(buscarDato(p, "fecha nacimiento de pariente")), d.cell.x + (d.cell.width/2), d.cell.y + 7, { align: 'center' });
                    }
                }

                if (col >= 7 && (rowInfo.t === "PARENTESCO" || rowInfo.t === "UNICO")) {
                    // Llaves Exactas 22 y 23 procesadas dentro de buscarFechaVacuna
                    let fv = buscarFechaVacuna(p._historialVacunas, esquema[col-7].key); 
                    if (fv) {
                        let pIndex = Math.floor(d.row.index / (tipo === "1-C" ? 1 : 2));
                        let offsetHorizontal = (pIndex % 2 === 0) ? -5 : 5;
                        let tX = d.cell.x + (d.cell.width/2) + offsetHorizontal;
                        let tY = d.cell.y + d.cell.height - 2; 
                        
                        if (fv >= fInit && fv <= fEnd) { // REGLA CONDICIONAL: ROJO SI ES FECHA ACTUAL
                            doc.setTextColor(255, 0, 0); 
                            doc.text(fv, tX, tY, { angle: 90 });
                            doc.setDrawColor(255, 0, 0); doc.setLineWidth(0.6);
                            doc.line(tX + 2, tY, tX + 2, tY - 25); 
                            doc.setTextColor(0); doc.setDrawColor(180); doc.setLineWidth(0.5);
                        } else {
                            doc.text(fv, tX, tY, { angle: 90 });
                        }
                    }
                }
            }
        },
        addPageContent: (data) => dibujarFormatoBase(doc, data, tipo)
    });
    doc.save(`Anexo_${tipo}_${labelRango}.pdf`);
}

function dibujarFormatoBase(doc, data, tipo) {
    const pW = doc.internal.pageSize.width, pH = doc.internal.pageSize.height;
    doc.setFontSize(10); doc.setTextColor(0); doc.setFont(undefined, 'bold');
    doc.text(`ANEXO ${tipo}`, pW / 2, 25, { align: 'center' });
    doc.text("CENTRO NACIONAL PARA LA SALUD DE LA INFANCIA Y LA ADOLESCENCIA", pW / 2, 40, { align: 'center' });
    doc.setFontSize(8);
    let sub = tipo === "1-A" ? "DE 0 A 9 AÑOS" : tipo === "1-B" ? "DE 10 A 19 AÑOS" : "POBLACIÓN ADULTA (20 AÑOS Y MÁS) Y MUJERES EMBARAZADAS";
    doc.text(`CENSO NOMINAL PARA REGISTRO DE ESQUEMAS DE VACUNACIÓN ${sub}`, pW / 2, 53, { align: 'center' });
    
    doc.setFontSize(6.5); doc.setFont(undefined, 'normal');
    const yFields = 75;
    doc.text("INSTITUCIÓN: _______________________", 40, yFields);
    doc.text("ESTADO: ____________________________", 40, yFields + 15);
    doc.text("JURISDICCIÓN: ______________________", 40, yFields + 30);
    doc.text("DELEGACIÓN: ________________________", 220, yFields);
    doc.text("ZONA: _____________________________", 220, yFields + 15);
    doc.text("MUNICIPIO: _________________________", 400, yFields);
    doc.text("LOCALIDAD: _________________________", 400, yFields + 15);
    doc.text("AGEB: _____________________________", 400, yFields + 30);
    doc.text("SECTOR: ___________________________", 590, yFields);
    doc.text("MANZANA: __________________________", 590, yFields + 15);
    doc.text("CLAVE CLUES: ______________________", 590, yFields + 30);
    doc.text("UNIDAD DE SALUD: ________________________________________________", 760, yFields + 30);

    const yPie = pH - 110;
    doc.setFontSize(5.5);
    if (tipo !== "1-C") {
        doc.setFont(undefined, 'bold'); doc.text("NOTA: (1).- REGISTRAR DATOS DEL MENOR.   (2).- REGISTRAR DATOS DEL ACOMPAÑANTE", 40, yPie);
        doc.setFont(undefined, 'normal'); doc.text("PARENTESCO: (1).- Madre  (2).- Padre  (3).- Abuelo  (4).- Abuela  (5).- Tío  (6).- Tía  (7).- Hija  (8).- Hijo  (9).- Prima", 40, yPie + 10);
        doc.text("(10).- Primo  (11).- Vecino (a)  (12).- Otro parentesco", 88, yPie + 18);
    }
    const yAjuste = (tipo === "1-C") ? yPie : yPie + 30;
    doc.text("(a) SEXO: Fem: Femenino, Masc: Masculino", 40, yAjuste);
    doc.text("( b ) DERECHOHABIENCIA: 1.- SS, 2.- IMSS, 3.- ISSSTE, 4.- IMSS BIENESTAR, 5.- SEDENA, 6.- SEMAR", 40, yAjuste + 10);
    doc.text("( c ) ESTATUS MIGRATORIO - REGULAR: Extranjero con estancia legal. IRREGULAR: Estancia no documentada.", 380, yPie);
    doc.text("( d ) CÓDIGOS: A.- AUSENTE, I.- INMIGRÓ, D.- DEFUNCIÓN, R.- RENUENTE, E.- EMIGRÓ, F.- ENFERMO", 380, yPie + 10);
    doc.setFontSize(7);
    doc.text("__________________________________________", 200, pH - 30); doc.text("Nombre y Firma del Vacunador", 235, pH - 20);
    doc.text("__________________________________________", 600, pH - 30); doc.text("Nombre, Cargo y Firma de quien Valida", 620, pH - 20);
    doc.setFontSize(6); doc.text(`Hoja ${doc.internal.getNumberOfPages()}`, pW - 50, pH - 20);
}

// ==========================================
// 5. INFORME FINAL (Resumen)
// ==========================================
function generarInformeActividad(datosUnificados, fInit, fEnd) {
    // 1. Inicialización de contadores en 0
    let stats = { 
        fechaJornada: fInit === fEnd ? fInit : `${fInit} a ${fEnd}`, 
        people: 0, 
        totalDoses: 0, 
        masc: 0, 
        fem: 0, 
        grupos: { "1-A": 0, "1-B": 0, "1-C": 0 }, 
        vacunasDetalle: {} 
    };
    
    // 2. Poblado Matemático con Escudos
    datosUnificados.forEach(f => {
        let historial = f._historialVacunas || [];
        
        if (historial.length === 0) return; // ESCUDO 1: Ignora pacientes sin vacunas
        
        stats.people++;

        let catEdad = String(buscarDato(f, "tipo de vacunacion")).toLowerCase();
        let tipo = catEdad.includes("0 a 9") ? "1-A" : catEdad.includes("10 a 19") ? "1-B" : "1-C";
        stats.grupos[tipo]++;
        
        let s = buscarDato(f, "sexo").toUpperCase().startsWith("M") ? "M" : "F";
        if (s === "M") stats.masc++; else stats.fem++;

        let fechaActividad = normalizarFecha(buscarDato(f, "fecha de la actividad"));

        ESQUEMAS[tipo].forEach(v => {
            let fv = buscarFechaVacuna(historial, v.key);
            
            let esDosisDeHoy = (fInit && fEnd && fInit !== fEnd) 
                               ? (fv >= fInit && fv <= fEnd) 
                               : (fv === fechaActividad || fv === fInit);

            if (fv !== "" && esDosisDeHoy) {  // ESCUDO 2: Solo suma vacunas aplicadas hoy
                stats.totalDoses++;
                
                if(!stats.vacunasDetalle[v.label]) {
                    stats.vacunasDetalle[v.label] = { total: 0, F09: 0, F1019: 0, F20: 0, TotalF: 0, M09: 0, M1019: 0, M20: 0, TotalM: 0 };
                }
                
                let d = stats.vacunasDetalle[v.label];
                d.total++;
                
                if (s === "F") { 
                    d.TotalF++; 
                    if (tipo === "1-A") d.F09++; else if (tipo === "1-B") d.F1019++; else d.F20++; 
                } else { 
                    d.TotalM++; 
                    if (tipo === "1-A") d.M09++; else if (tipo === "1-B") d.M1019++; else d.M20++; 
                }
            }
        });
    });

    // 3. RENDERIZADO DEL PDF RESTAURADO
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'pt', 'letter');
    const pW = doc.internal.pageSize.width;
    
    doc.setFontSize(14); doc.setFont(undefined, 'bold'); doc.setTextColor(159, 34, 65);
    doc.text("CÉDULA DE EVALUACIÓN Y SEGUIMIENTO DIARIO", pW / 2, 90, { align: 'center' });
    doc.setFontSize(10); doc.setTextColor(0); doc.text(`FECHA DE JORNADA (REGISTRO): ${stats.fechaJornada}`, pW / 2, 105, { align: 'center' });
    
    doc.autoTable({
        startY: 130,
        head: [['POBLACIÓN ATENDIDA', 'CANTIDAD']],
        body: [ 
            ['Total de Personas Registradas', stats.people], 
            ['Hombres', stats.masc], 
            ['Mujeres', stats.fem], 
            ['Infantes (0 a 9 años)', stats.grupos["1-A"]], 
            ['Adolescentes (10 a 19 años)', stats.grupos["1-B"]], 
            ['Adultos (20+ años)', stats.grupos["1-C"]] 
        ],
        theme: 'striped', headStyles: { fillColor: [159, 34, 65] }
    });

    const bodyVacunas = Object.keys(stats.vacunasDetalle).map(v => {
        const d = stats.vacunasDetalle[v]; 
        return [v, d.F09, d.F1019, d.F20, d.TotalF, d.M09, d.M1019, d.M20, d.TotalM, d.total];
    });

    doc.setFontSize(12); doc.setFont(undefined, 'bold'); doc.text(`PRODUCTIVIDAD DE BIOLÓGICOS`, 40, doc.lastAutoTable.finalY + 40);
    doc.autoTable({
        startY: doc.lastAutoTable.finalY + 50,
        head: [['VACUNA', 'M 0-9A', 'M 10-19A', 'M 20+A', 'TOTAL M.', 'H 0-9A', 'H 10-19A', 'H 20+A', 'TOTAL H.', 'TOTAL DOSIS']],
        body: bodyVacunas.length > 0 ? bodyVacunas : [['Ninguna', '0', '0', '0', '0', '0', '0', '0', '0', '0']],
        theme: 'grid', headStyles: { fillColor: [188, 149, 92], fontSize: 6, halign: 'center' }, styles: { fontSize: 7, halign: 'center' }
    });

    doc.setFontSize(14); doc.setFont(undefined, 'bold'); doc.setTextColor(159, 34, 65);
    doc.text(`GRAN TOTAL DE DOSIS HOY: ${stats.totalDoses}`, 40, doc.lastAutoTable.finalY + 40);
    doc.save(`Informe_Jornada_${stats.fechaJornada}.pdf`);
    alert("✅ Informe generado.");
} 

// ==========================================
// 6. REPORTE: ACCIONES REALIZADAS EN BLOQUEO VACUNAL
// ==========================================
function generarAccionesBloqueo(unificados, fInit, fEnd) {
    if (unificados.length === 0) {
        alert("No hay registros para procesar.");
        return;
    }

    // 1. DATOS GENERALES (Tomados del primer registro, ya que se repiten)
    const repBase = unificados[0];
    const datosGen = {
        entidad: buscarDato(repBase, "entidad de residencia"),
        municipio: buscarDato(repBase, "municipio"),
        localidad: buscarDato(repBase, "localidad"),
        colonia: buscarDato(repBase, "colonia"),
        ageb: buscarDato(repBase, "ageb"),
        area: "", // Se deja en blanco por instrucción
        caso: buscarDato(repBase, "nombre del caso") || "Brote_ND",
        fNotif: normalizarFecha(buscarDato(repBase, "fecha de notificación")),
        fInicio: normalizarFecha(buscarDato(repBase, "fecha de inicio de actividades")),
        fEnvio: normalizarFecha(buscarDato(repBase, "fecha de envío"))
    };

    // 2. ESTADO DEL BLOQUEO Y MANZANAS RECORRIDAS
    let manzanasTXT = "Bloqueo aún no se ha cerrado, está como pendiente";
    const registroCierre = unificados.find(p => String(buscarDato(p, "último registro")).toLowerCase().includes("s"));
    if (registroCierre) {
        manzanasTXT = buscarDato(registroCierre, "número de manzanas recorridas") || "0";
    }

    // 3. MÉTRICAS OPERATIVAS Y BRIGADAS
    const casasVisitadas = unificados.length; 
    let famAus = 0, casaDes = 0, famRen = 0, lotBal = 0, negocios = 0, cSosp = 0, cProb = 0;
    let familiasEntrevistadas = 0; // Se inicializa como contador directo
    const brigadasSet = new Set();

    unificados.forEach(p => {
        let dom = String(buscarDato(p, "domicilio visitado")).toLowerCase(); 
        let caso = String(buscarDato(p, "caso en domicilio")).toLowerCase();

        if (dom === 'a' || dom.includes('ausente')) famAus++;
        if (dom === 'r' || dom.includes('renuente')) famRen++;
        if (dom.includes('deshabitada')) casaDes++;
        if (dom.includes('baldio') || dom.includes('baldío')) lotBal++;
        if (dom.includes('negocio')) negocios++;

        if (dom.includes('CN') || dom.includes('SN') || dom.includes('NEGOCIO CON PERSONAS')) {
            familiasEntrevistadas++;
        }

        if (caso.includes('sospechoso')) cSosp++;
        if (caso.includes('probable')) cProb++;

        let reg = buscarDato(p, "registrador_nombre");
        let vac = buscarDato(p, "nombre de vacunador");
        brigadasSet.add(`${datosGen.caso}_${reg}_${vac}`);
    });

    //const familiasEntrevistadas = casasVisitadas - (famAus + casaDes + famRen + lotBal + negocios);

    // 4. ESTRUCTURAS DE CONTEO (POBLACIÓN Y VACUNAS)
    const matriz = {
        "menores 1 @": { t: 0, m: 0, f: 0, cA: 0, sA: 0, srp: 0, sr: 0 },
        "1-4 @":       { t: 0, m: 0, f: 0, cA: 0, sA: 0, srp: 0, sr: 0 },
        "5-9 @":       { t: 0, m: 0, f: 0, cA: 0, sA: 0, srp: 0, sr: 0 },
        "10-12 @":     { t: 0, m: 0, f: 0, cA: 0, sA: 0, srp: 0, sr: 0 },
        "13-14 @":     { t: 0, m: 0, f: 0, cA: 0, sA: 0, srp: 0, sr: 0 },
        "15-24 @":     { t: 0, m: 0, f: 0, cA: 0, sA: 0, srp: 0, sr: 0 },
        "25-39 @":     { t: 0, m: 0, f: 0, cA: 0, sA: 0, srp: 0, sr: 0 },
        "40-44 @":     { t: 0, m: 0, f: 0, cA: 0, sA: 0, srp: 0, sr: 0 },
        "45-64 @":     { t: 0, m: 0, f: 0, cA: 0, sA: 0, srp: 0, sr: 0 },
        "65 y más":    { t: 0, m: 0, f: 0, cA: 0, sA: 0, srp: 0, sr: 0 }
    };

    const conteoVacs = {
        hexa: 0, rota: 0, srp: 0, dpt: 0, hepB: 0, neumo13: 0, td: 0,
        influ: 0, sr: 0, hepA: 0, vari: 0, tdpa: 0, neumo23: 0, covid: 0, vph: 0, otras: 0
    };
    let totalDosisGeneral = 0;

    // 5. POBLADO MATEMÁTICO
    unificados.forEach(p => {
        let edadAnios = parseEdadEnAnios(buscarDato(p, "edad"));
        
        if (edadAnios === -1) return; 

        let bk = "";
        if (edadAnios < 1) bk = "menores 1 @"; 
        else if (edadAnios <= 4) bk = "1-4 @"; 
        else if (edadAnios <= 9) bk = "5-9 @"; 
        else if (edadAnios <= 12) bk = "10-12 @"; 
        else if (edadAnios <= 14) bk = "13-14 @"; 
        else if (edadAnios <= 24) bk = "15-24 @"; 
        else if (edadAnios <= 39) bk = "25-39 @"; 
        else if (edadAnios <= 44) bk = "40-44 @"; 
        else if (edadAnios <= 64) bk = "45-64 @"; 
        else bk = "65 y más";

        matriz[bk].t++;
        let sx = parseSexo(buscarDato(p, "sexo"));
        if (sx === "M") matriz[bk].m++; else if (sx === "F") matriz[bk].f++;

        let cartilla = false;
        let recibioSRPSRHoy = false; // VARIABLE DE ANULACIÓN LÓGICA
        let fechaActividadPaciente = normalizarFecha(buscarDato(p, "fecha de la actividad"));

        p._historialVacunas.forEach(v => {
            let fV = normalizarFecha(buscarDato(v, "fecha_ingresada"));
            let nV = String(buscarDato(v, "vacuna_aplicada")).toUpperCase();
            
            // Antecedente
            if (fV !== "" && (fV < fechaActividadPaciente)) {
                cartilla = true; 
            }
            
            // Aplicación en la actividad actual
            if (fV !== "" && fV === fechaActividadPaciente) { 
                totalDosisGeneral++; 

                // Restricción por Edad y Activación de la Anulación
                if (nV.includes("SRP") && edadAnios < 10) {
                    matriz[bk].srp++;
                    recibioSRPSRHoy = true;
                }
                if (nV.includes("SR") && !nV.includes("SRP") && edadAnios >= 10) {
                    matriz[bk].sr++;
                    recibioSRPSRHoy = true;
                }

                // Desglose Global de Vacunas
                if (nV.includes("HEXA")) conteoVacs.hexa++;
                else if (nV.includes("ROTA")) conteoVacs.rota++;
                else if (nV.includes("SRP") || nV.includes("TRIPLE VIRAL")) conteoVacs.srp++;
                else if (nV.includes("DPT")) conteoVacs.dpt++;
                else if (nV.includes("HEP") && nV.includes("B")) conteoVacs.hepB++;
                else if (nV.includes("NEUMO") && nV.includes("13")) conteoVacs.neumo13++;
                else if (nV.includes("TDPA")) conteoVacs.tdpa++;
                else if (nV.includes("TD") && !nV.includes("TDPA")) conteoVacs.td++;
                else if (nV.includes("INFLU")) conteoVacs.influ++;
                else if (nV.includes("SR") && !nV.includes("SRP")) conteoVacs.sr++;
                else if (nV.includes("HEP") && nV.includes("A")) conteoVacs.hepA++;
                else if (nV.includes("VARI")) conteoVacs.vari++;
                else if (nV.includes("NEUMO") && nV.includes("23")) conteoVacs.neumo23++;
                else if (nV.includes("COVID")) conteoVacs.covid++;
                else if (nV.includes("VPH")) conteoVacs.vph++;
                else conteoVacs.otras++;
            }
        });
        
        // REGLA DE NEGOCIO: Si recibió SRP o SR hoy, cuenta obligatoriamente como SIN ANTECEDENTE
        if (recibioSRPSRHoy) {
            cartilla = false;
        }

        if (cartilla) matriz[bk].cA++; else matriz[bk].sA++;
    });

    // 6. RENDERIZADO VISUAL DEL REPORTE (PDF EN PARALELO)
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'pt', 'letter');
    const pW = doc.internal.pageSize.width;

    doc.setFontSize(12); doc.setFont(undefined, 'bold'); doc.setTextColor(159, 34, 65);
    doc.text("ACCIONES REALIZADAS EN BLOQUEO VACUNAL", pW / 2, 30, { align: 'center' });

    let textoRango = (fInit && fEnd && fInit !== fEnd) ? `${fInit} a ${fEnd}` : (fInit ? fInit : "Histórico Completo");
    doc.setFontSize(8); doc.setTextColor(0); doc.text(`RANGO / FECHA: ${textoRango}`, 40, 50);

    const startYTablas = 60;
    
    // TABLA 1: DATOS GENERALES (Izquierda)
    doc.autoTable({
        startY: startYTablas, margin: { left: 40 }, tableWidth: 220,
        body: [
            ['ENTIDAD:', datosGen.entidad], ['MUNICIPIO:', datosGen.municipio],
            ['LOCALIDAD / COLONIA:', `${datosGen.localidad} / ${datosGen.colonia}`],
            ['AGEBS TRABAJADOS:', datosGen.ageb], ['ÁREA RESPONSABILIDAD:', datosGen.area],
            ['NOMBRE DEL CASO:', datosGen.caso], ['FECHA NOTIFICACIÓN:', datosGen.fNotif],
            ['INICIO ACTIVIDADES:', datosGen.fInicio], ['FECHA DE ENVÍO:', datosGen.fEnvio]
        ],
        theme: 'grid', styles: { fontSize: 7, cellPadding: 2 }, columnStyles: { 0: { fontStyle: 'bold', fillColor: [240, 240, 240] } }
    });

    // TABLA 2: MÉTRICAS OPERATIVAS (Centro)
    doc.autoTable({
        startY: startYTablas, margin: { left: 270 }, tableWidth: 220,
        body: [
            ['MANZANAS RECORRIDAS', manzanasTXT], ['CASAS VISITADAS', casasVisitadas],
            ['FAMILIAS ENTREVISTADAS', familiasEntrevistadas], ['FAMILIAS AUSENTES', famAus], 
            ['CASAS DESHABITADAS', casaDes], ['FAMILIAS RENUENTES', famRen],
            ['LOTES BALDÍOS', lotBal], ['NEGOCIOS', negocios], 
            ['CASOS SOSPECHOSOS', cSosp], ['CASOS PROBABLES', cProb]
        ],
        theme: 'grid', styles: { fontSize: 7, cellPadding: 2 }, columnStyles: { 0: { fontStyle: 'bold', fillColor: [240, 240, 240] } }
    });

    // TABLA 3: DESGLOSE DE VACUNAS (Derecha)
    doc.autoTable({
        startY: startYTablas, margin: { left: 500 }, tableWidth: 250,
        body: [
            ['No. DE BRIGADAS', brigadasSet.size || 1], ['DOSIS APLICADAS (Total)', totalDosisGeneral],
            ['VACUNA HEXAVALENTE', conteoVacs.hexa], ['VACUNA ROTAVIRUS', conteoVacs.rota],
            ['VACUNA TRIPLE VIRAL (SRP)', conteoVacs.srp], ['VACUNA DPT', conteoVacs.dpt],
            ['VACUNA HEPATITIS B', conteoVacs.hepB], ['VACUNA NEUMO 13', conteoVacs.neumo13],
            ['VACUNA TD', conteoVacs.td], ['VACUNA INFLUENZA', conteoVacs.influ],
            ['VACUNA SR', conteoVacs.sr], ['VACUNA HEPATITIS A', conteoVacs.hepA],
            ['VACUNA VARICELA', conteoVacs.vari], ['VACUNA TDPA', conteoVacs.tdpa],
            ['VACUNA NEUMO 23', conteoVacs.neumo23], ['VACUNA COVID', conteoVacs.covid],
            ['VACUNA VPH', conteoVacs.vph], ['OTRAS', conteoVacs.otras]
        ],
        theme: 'grid', styles: { fontSize: 7, cellPadding: 2 }, columnStyles: { 0: { fontStyle: 'bold', fillColor: [240, 240, 240] } }
    });

    // 7. TABLA DE POBLACIÓN ENCUESTADA (Abajo)
    let keys = Object.keys(matriz);
    let sTot=0, sMasc=0, sFem=0, sCa=0, sSa=0, sSrp=0, sSr=0, sDos=0;

    const tablaPoblacion = keys.map(k => {
        let r = matriz[k];
        let dosis = r.srp + r.sr;
        
        let provac = r.t > 0 ? (dosis / r.t) * 100 : 0;
        let encuesta = r.t > 0 ? (r.cA / r.t) * 100 : 0;
        let final = provac + encuesta;

        sTot+=r.t; sMasc+=r.m; sFem+=r.f; sCa+=r.cA; sSa+=r.sA; sSrp+=r.srp; sSr+=r.sr; sDos+=dosis;

        return [
            k, r.t, r.m, r.f, r.cA, r.sA, r.srp, r.sr, dosis, 
            provac.toFixed(2) + "%", 
            encuesta.toFixed(2) + "%", 
            final.toFixed(2) + "%"
        ];
    });

    // CÁLCULOS PONDERADOS PARA LA FILA TOTAL
    let totalProvacGeneral = sTot > 0 ? (sDos / sTot) * 100 : 0;
    let totalEncuestaGeneral = sTot > 0 ? (sCa / sTot) * 100 : 0;
    let totalCoberturaFinalGeneral = totalProvacGeneral + totalEncuestaGeneral;

    tablaPoblacion.push([
        "TOTAL", sTot, sMasc, sFem, sCa, sSa, sSrp, sSr, sDos, 
        totalProvacGeneral.toFixed(2) + "%", 
        totalEncuestaGeneral.toFixed(2) + "%", 
        totalCoberturaFinalGeneral.toFixed(2) + "%"
    ]);

    let YTablasSuperiores = Math.max(doc.previousAutoTable.finalY, startYTablas + 120);

    doc.autoTable({
        startY: YTablasSuperiores + 15,
        head: [[
            'GRUPOS DE\nEDAD', 
            'TOTAL', 
            'MASC.', 
            'FEM.', 
            'CON\nANTECEDENTE\nVACUNAL', 
            'SIN\nANTECEDENTE\nVACUNAL', 
            'APLICACIÓN DE\nVACUNA PARA\nESQUEMA\nTRIPLE VIRAL', 
            'APLICACIÓN DE\nVACUNA PARA\nESQUEMA SR', 
            'DOSIS\nAPLICADAS', 
            'COBERTURA\nPROVAC', 
            'ENCUESTA\nRAPIDA DE\nCOBERTURA', 
            'COBERTURA\nFINAL'
        ]],
        body: tablaPoblacion,
        theme: 'grid', 
        styles: { 
            fontSize: 6, 
            halign: 'center', 
            valign: 'middle', 
            cellPadding: 1 
        }, 
        headStyles: { 
            fillColor: [255, 255, 255], 
            textColor: [0, 0, 0], 
            lineWidth: 0.5, 
            lineColor: [0, 0, 0] 
        },
        bodyStyles: { 
            lineWidth: 0.5, 
            lineColor: [0, 0, 0] 
        }
    });

    let fName = (fInit && fEnd && fInit !== fEnd) ? `${fInit}_${fEnd}` : (fInit ? fInit : "Historico");
    doc.save(`Bloqueo_Vacunal_${fName}.pdf`);
    alert("✅ Formato de Bloqueo generado exitosamente.");
}

// ==========================================
// 8. BITÁCORA DIARIA, MAPA Y ANEXO
// ==========================================

// Funciones auxiliares del mapa (Web Mercator y renderizado)
function latLngToPx(lat, lng, zoom) {
    const x = ((lng + 180) / 360) * 256 * Math.pow(2, zoom);
    const y = ((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2) * 256 * Math.pow(2, zoom);
    return { x, y };
}

async function cargarTileOSM(url) {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = url;
    });
}

function drawCanvasShape(ctx, x, y, meta) {
    let r = meta.radius;
    ctx.beginPath();
    if (meta.isOutline) { ctx.fillStyle = "#FFFFFF"; ctx.strokeStyle = meta.color; ctx.lineWidth = 1.5; } 
    else { ctx.fillStyle = meta.color; ctx.strokeStyle = "#FFFFFF"; ctx.lineWidth = 0.8; }

    if (meta.shape === 'circle') ctx.arc(x, y, r, 0, 2 * Math.PI);
    else if (meta.shape === 'square') ctx.rect(x - r, y - r, r * 2, r * 2);
    else if (meta.shape === 'triangle') { ctx.moveTo(x, y - r); ctx.lineTo(x + r, y + r); ctx.lineTo(x - r, y + r); ctx.closePath(); }
    else if (meta.shape === 'triangle-down') { ctx.moveTo(x, y + r); ctx.lineTo(x + r, y - r); ctx.lineTo(x - r, y - r); ctx.closePath(); }
    else if (meta.shape === 'diamond') { ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.closePath(); }
    else if (meta.shape === 'cross') { ctx.moveTo(x - r, y - r); ctx.lineTo(x + r, y + r); ctx.moveTo(x + r, y - r); ctx.lineTo(x - r, y + r); }

    if (meta.shape === 'cross') { ctx.strokeStyle = meta.color; ctx.lineWidth = 2; ctx.stroke(); } 
    else { ctx.fill(); ctx.stroke(); }
}

function drawPdfShape(doc, x, y, meta) {
    let r = meta.radius;
    let style = meta.isOutline ? 'D' : 'FD';
    if (meta.shape === 'cross') style = 'D';

    doc.setFillColor(meta.isOutline ? '#FFFFFF' : meta.color); doc.setDrawColor(meta.color);
    doc.setLineWidth(meta.isOutline || meta.shape === 'cross' ? 1 : 0.3);

    if (meta.shape === 'circle') doc.circle(x, y, r, style);
    else if (meta.shape === 'square') doc.rect(x - r, y - r, r * 2, r * 2, style);
    else if (meta.shape === 'triangle') doc.triangle(x, y - r, x + r, y + r, x - r, y + r, style);
    else if (meta.shape === 'triangle-down') doc.triangle(x, y + r, x + r, y - r, x - r, y - r, style);
    else if (meta.shape === 'diamond') { doc.triangle(x - r, y, x + r, y, x, y - r, style); doc.triangle(x - r, y, x + r, y, x, y + r, style); } 
    else if (meta.shape === 'cross') { doc.line(x - r, y - r, x + r, y + r); doc.line(x + r, y - r, x - r, y + r); }
}

// Función Maestra
async function generarMapaDiarioEnPDF(datosUnificados, fecha, identificadorSeleccionado) {
    try {
        // 1. FILTRADO ESTRICTO Y SIMBOLOGÍA
        const accionesDelDia = datosUnificados.filter(p => {
            let matchFecha = normalizarFecha(buscarDato(p, "fecha de la actividad")) === fecha;
            let matchId = String(buscarDato(p, "identificador") || "").trim() === String(identificadorSeleccionado).trim();
            return matchFecha && matchId;
        });

        if (accionesDelDia.length === 0) throw new Error("No hay acciones registradas para esta selección.");

        let puntos = [];
        let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;

        const evaluarSimbologia = (registro) => {
            let dom = String(buscarDato(registro, "domicilio visitado") || "").toLowerCase().trim();
            let sit = String(buscarDato(registro, "situación familiar") || buscarDato(registro, "situacion familiar") || "").toLowerCase().trim();
            let huboVacuna = false;
            
            if (registro._historialVacunas) {
                registro._historialVacunas.forEach(v => {
                    if (normalizarFecha(buscarDato(v, "fecha_ingresada")) === fecha) huboVacuna = true;
                });
            }
            
            if (huboVacuna) return { label: "Vacuna Aplicada", color: "#006400", shape: "circle", isOutline: false, radius: 4 };
            if (dom.includes("baldío") || dom.includes("baldio") || dom.includes("deshabitada")) return { label: "Deshabitadas / Baldíos", color: "#9E9E9E", shape: "square", isOutline: false, radius: 2.5 };
            if (dom.includes("negocio")) return { label: "Negocio", color: "#800080", shape: "diamond", isOutline: false, radius: 2.5 };
            if (sit.includes("ausente")) return { label: "Fam. Ausente", color: "#FF8C00", shape: "triangle", isOutline: false, radius: 2.5 };
            if (sit.includes("renuente")) return { label: "Fam. Renuente", color: "#8B0000", shape: "cross", isOutline: false, radius: 2.5 };
            if (sit.includes("con niños") && sit.includes("no se registran")) return { label: "Con Niños (No Reg.)", color: "#D4AC0D", shape: "triangle-down", isOutline: false, radius: 2.5 };
            if (sit.includes("con niños")) return { label: "Con Niños (Registrados)", color: "#2E86C1", shape: "circle", isOutline: false, radius: 2.5 };
            if (sit.includes("sin niños") && (sit.includes("ninguna") || sit.includes("no se registra"))) return { label: "Sin Niños (Nadie Reg.)", color: "#000000", shape: "square", isOutline: true, radius: 2.5 };
            if (sit.includes("sin niños")) return { label: "Sin Niños (Sí Reg.)", color: "#E74C3C", shape: "circle", isOutline: true, radius: 2.5 };
            return { label: "Otro / Indefinido", color: "#333333", shape: "circle", isOutline: true, radius: 2 };
        };

        accionesDelDia.forEach(p => {
            let latlong = buscarDato(p, "ubicacion") || buscarDato(p, "coordenadas"); 
            if (latlong && String(latlong).includes(",")) {
                let partes = String(latlong).split(",");
                if (partes.length >= 2) {
                    let lat = parseFloat(partes[0].replace(/[^0-9.-]/g, ""));
                    let lng = parseFloat(partes[1].replace(/[^0-9.-]/g, ""));
                    if (!isNaN(lat) && !isNaN(lng)) {
                        puntos.push({ lat, lng, meta: evaluarSimbologia(p) });
                        if (lat < minLat) minLat = lat; if (lat > maxLat) maxLat = lat;
                        if (lng < minLng) minLng = lng; if (lng > maxLng) maxLng = lng;
                    }
                }
            }
        });

        if (puntos.length === 0) throw new Error("Registros sin coordenadas GPS válidas.");
        if (maxLat - minLat < 0.0005) { maxLat += 0.002; minLat -= 0.002; }
        if (maxLng - minLng < 0.0005) { maxLng += 0.002; minLng -= 0.002; }

        // 2. RENDERIZADO DEL MAPA
        let zoom = 19; let minPx, maxPx;
        while(zoom > 10) {
            minPx = latLngToPx(maxLat, minLng, zoom);
            maxPx = latLngToPx(minLat, maxLng, zoom);
            if ((maxPx.x - minPx.x) < 650 && (maxPx.y - minPx.y) < 280) break; 
            zoom--;
        }
        zoom = Math.min(zoom + 1, 19);

        const centerPx = latLngToPx((minLat + maxLat) / 2, (minLng + maxLng) / 2, zoom);
        const mapW = 800; const mapH = 380; 
        const tlPx = { x: centerPx.x - mapW/2, y: centerPx.y - mapH/2 }; 

        const tMinX = Math.floor(tlPx.x / 256), tMaxX = Math.floor((tlPx.x + mapW) / 256);
        const tMinY = Math.floor(tlPx.y / 256), tMaxY = Math.floor((tlPx.y + mapH) / 256);

        const promesasTiles = [];
        for (let tx = tMinX; tx <= tMaxX; tx++) {
            for (let ty = tMinY; ty <= tMaxY; ty++) {
                let url = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/${zoom}/${ty}/${tx}`;
                promesasTiles.push(cargarTileOSM(url).then(img => ({ img, tx, ty })));
            }
        }
        const tiles = await Promise.all(promesasTiles);

        const canvas = document.createElement("canvas");
        canvas.width = mapW; canvas.height = mapH;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#e5e3df"; ctx.fillRect(0, 0, mapW, mapH);
        
        tiles.forEach(t => { if(t && t.img) ctx.drawImage(t.img, (t.tx * 256) - tlPx.x, (t.ty * 256) - tlPx.y, 256, 256); });
        puntos.forEach(pt => { drawCanvasShape(ctx, latLngToPx(pt.lat, pt.lng, zoom).x - tlPx.x, latLngToPx(pt.lat, pt.lng, zoom).y - tlPx.y, pt.meta); });
        
        const mapaImagenBase64 = canvas.toDataURL("image/png");

        // 3. EXTRACCIÓN DE METADATOS Y CREACIÓN DEL PDF
        let ref = accionesDelDia[0]; 
        let v_inst = buscarDato(ref, "institución que reporta la actividad") || buscarDato(ref, "institución") || "N/A";
        let v_tipo = buscarDato(ref, "tipo de actividad") || "N/A";
        let v_vac1 = buscarDato(ref, "nombre de vacunador") || "N/A";
        let v_vac2 = buscarDato(ref, "nombre de vacunador / responsable 2") || "N/A";
        let v_reg_nombre = buscarDato(ref, "registrador_nombre") || "N/A";
        let v_reg_inst = buscarDato(ref, "registrador_institucion") || "N/A";

        let arrAgebs = [...new Set(accionesDelDia.map(p => buscarDato(p, "ageb")).filter(Boolean))];
        let v_agebs = arrAgebs.length > 0 ? arrAgebs.join(", ") : "N/A";
        let arrColonias = [...new Set(accionesDelDia.map(p => { let val = buscarDato(p, "colonia"); return val ? String(val).trim() : null; }).filter(Boolean))];
        let v_colonias = arrColonias.length > 0 ? arrColonias.join(", ") : "N/A";

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('l', 'pt', 'letter');
        const pW = doc.internal.pageSize.width;

        // PAGINA 1: ENCABEZADOS Y MAPA
        doc.setFontSize(14); doc.setFont(undefined, 'bold'); doc.setTextColor(159, 34, 65);
        doc.text("BITÁCORA DIARIA DE ACCIONES EN TERRENO", pW / 2, 30, { align: 'center' });
        doc.setFontSize(9); doc.setTextColor(0);
        
        doc.setFont(undefined, 'bold'); doc.text("Fecha:", 40, 50); doc.setFont(undefined, 'normal'); doc.text(fecha, 120, 50);
        doc.setFont(undefined, 'bold'); doc.text("Institución:", 40, 65); doc.setFont(undefined, 'normal'); doc.text(v_inst, 120, 65);
        doc.setFont(undefined, 'bold'); doc.text("Tipo Activ.:", 40, 80); doc.setFont(undefined, 'normal'); doc.text(v_tipo, 120, 80);
        doc.setFont(undefined, 'bold'); doc.text("Vacunador 1:", 40, 95); doc.setFont(undefined, 'normal'); doc.text(v_vac1, 120, 95);
        doc.setFont(undefined, 'bold'); doc.text("Vacunador 2:", 40, 110); doc.setFont(undefined, 'normal'); doc.text(v_vac2, 120, 110);

        doc.setFont(undefined, 'bold'); doc.text("Identificador:", pW/2, 50); doc.setFont(undefined, 'normal'); doc.text(identificadorSeleccionado, pW/2 + 100, 50);
        doc.setFont(undefined, 'bold'); doc.text("AGEB(s):", pW/2, 65); doc.setFont(undefined, 'normal'); doc.text(v_agebs, pW/2 + 100, 65);
        doc.setFont(undefined, 'bold'); doc.text("Registrador:", pW/2, 80); doc.setFont(undefined, 'normal'); doc.text(v_reg_nombre, pW/2 + 100, 80);
        doc.setFont(undefined, 'bold'); doc.text("Inst. Reg.:", pW/2, 95); doc.setFont(undefined, 'normal'); doc.text(v_reg_inst, pW/2 + 100, 95);
        
        doc.setFont(undefined, 'bold'); doc.text("Colonia(s):", pW/2, 110);
        let colLines = doc.splitTextToSize(v_colonias, pW/2 - 100);
        doc.setFont(undefined, 'normal'); doc.text(colLines, pW/2 + 100, 110);

        // Inyección del mapa
        let yMapStart = 110 + (colLines.length * 10) + 5; 
        let anchoRender = pW - 80;
        let altoRender = mapH * (anchoRender / mapW);
        doc.addImage(mapaImagenBase64, 'PNG', 40, yMapStart, anchoRender, altoRender);

        let conteos = {};
        puntos.forEach(p => { let key = JSON.stringify(p.meta); if(!conteos[key]) conteos[key] = { meta: p.meta, count: 0 }; conteos[key].count++; });
        let col = 0, fila = 0; const yLeyendaInicio = yMapStart + altoRender + 25;
        Object.values(conteos).forEach(item => {
            let x = 40 + (col * 240); let y = yLeyendaInicio + (fila * 16);
            drawPdfShape(doc, x + 5, y - 3, item.meta);
            doc.setTextColor(0); doc.setFontSize(9); doc.setFont(undefined, 'normal');
            doc.text(`${item.meta.label} (${item.count})`, x + 16, y);
            col++; if (col > 2) { col = 0; fila++; } 
        });

        // 4. BIFURCACIÓN DE DOMICILIOS Y DESGLOSE ESTADÍSTICO
        let conVacuna = []; let sinVacuna = [];
        let totalDosisGral = 0; let desgloseBiologicos = {};

        accionesDelDia.forEach(p => {
            let vacsHoy = [];
            if (p._historialVacunas) {
                p._historialVacunas.forEach(v => {
                    if (normalizarFecha(buscarDato(v, "fecha_ingresada")) === fecha) {
                        let nombreVac = String(buscarDato(v, "biologico") || buscarDato(v, "biológico") || "").trim();
                        vacsHoy.push(nombreVac);
                        totalDosisGral++;
                        desgloseBiologicos[nombreVac] = (desgloseBiologicos[nombreVac] || 0) + 1;
                    }
                });
            }
            p._vacunasImprimir = vacsHoy; 
            if (vacsHoy.length > 0) conVacuna.push(p); else sinVacuna.push(p);
        });

        let accionesOrdenadas = [...conVacuna, ...sinVacuna]; // Agrupamos: Vacunados primero

        doc.addPage();
        doc.setFontSize(14); doc.setFont(undefined, 'bold'); doc.setTextColor(159, 34, 65);
        doc.text("ANEXO: LISTADO DE DOMICILIOS VISITADOS", pW / 2, 40, { align: 'center' });
        
        let yList = 70;
        const drawTableHeader = (y) => {
            doc.setFontSize(9); doc.setTextColor(0); doc.setFont(undefined, 'bold');
            doc.text("DIRECCIÓN (CALLE, NÚMERO, COLONIA)", 40, y);
            doc.text("DOMICILIO", 320, y);
            doc.text("SITUACIÓN FAMILIAR", 450, y);
            doc.text("VACUNAS (HOY)", 600, y);
            doc.setDrawColor(0); doc.setLineWidth(1); doc.line(40, y + 5, pW - 40, y + 5);
            return y + 20;
        };
        
        yList = drawTableHeader(yList);
        doc.setFontSize(8); doc.setFont(undefined, 'normal');
        
        accionesOrdenadas.forEach(p => {
            if (yList > doc.internal.pageSize.height - 40) {
                doc.addPage(); yList = drawTableHeader(40); doc.setFontSize(8); doc.setFont(undefined, 'normal');
            }

            let dirBruta = buscarDato(p, "dirección") || buscarDato(p, "direccion") || "S/D";
            let colName = buscarDato(p, "colonia") || "";
            let direccion = colName ? `${String(dirBruta).trim()}, ${String(colName).trim()}` : String(dirBruta).trim();
            let dom = buscarDato(p, "domicilio visitado") || "S/D";
            let sit = buscarDato(p, "situación familiar") || buscarDato(p, "situacion familiar") || "S/D";
            
            let vacsStr = p._vacunasImprimir.length > 0 ? p._vacunasImprimir.join(", ") : "Ninguna";
            
            let dirLines = doc.splitTextToSize(direccion, 260);
            let domLines = doc.splitTextToSize(dom, 110);
            let sitLines = doc.splitTextToSize(sit, 130);
            let vacsLines = doc.splitTextToSize(vacsStr, 150);

            let maxLines = Math.max(dirLines.length, domLines.length, sitLines.length, vacsLines.length);

            doc.setTextColor(0);
            doc.text(dirLines, 40, yList); doc.text(domLines, 320, yList); doc.text(sitLines, 450, yList);
            
            // Regla de color para tabla: Vacunas en rojo, sin subrayado rompe-tablas.
            if (p._vacunasImprimir.length > 0) doc.setTextColor(255, 0, 0); 
            doc.text(vacsLines, 600, yList);

            yList += (maxLines * 10) + 5;
            doc.setDrawColor(200); doc.setLineWidth(0.5); doc.line(40, yList - 3, pW - 40, yList - 3);
            yList += 8;
        });

        // 5. TOTALES Y DESGLOSE ESTADÍSTICO
        if (yList > doc.internal.pageSize.height - 120) { doc.addPage(); yList = 40; }

        yList += 15; doc.setDrawColor(0); doc.setLineWidth(1.5); doc.line(40, yList, pW - 40, yList);
        yList += 15;
        
        doc.setFontSize(10); doc.setFont(undefined, 'bold'); doc.setTextColor(0);
        doc.text("RESUMEN ESTADÍSTICO DE LA JORNADA", pW / 2, yList, { align: 'center' });
        
        yList += 20; doc.setFontSize(9);
        doc.text(`Total Domicilios Visitados: ${accionesOrdenadas.length}`, 40, yList);
        doc.text(`Domicilios con Vacunación: ${conVacuna.length}`, 260, yList);
        doc.text(`Domicilios sin Vacunación: ${sinVacuna.length}`, 480, yList);
        
        yList += 20;
        doc.setTextColor(255, 0, 0); doc.setFont(undefined, 'bold');
        doc.text(`Total Dosis Aplicadas: ${totalDosisGral}`, 40, yList);
        
        let xDesglose = 260; let yDesglose = yList; doc.setFont(undefined, 'normal');
        
        if(Object.keys(desgloseBiologicos).length > 0) {
            Object.entries(desgloseBiologicos).forEach(([vacuna, cantidad]) => {
                doc.text(`- ${vacuna}: ${cantidad} dosis`, xDesglose, yDesglose);
                yDesglose += 12;
            });
        } else {
            doc.text("Ninguna vacuna aplicada.", xDesglose, yDesglose);
        }

        doc.save(`Bitacora_${fecha}_${identificadorSeleccionado}.pdf`);
    } catch (error) {
        console.error("Error:", error);
        alert(error.message);
    }
}