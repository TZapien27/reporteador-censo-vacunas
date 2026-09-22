// ==========================================
// 0. MÓDULO DE SEGURIDAD Y CREDENCIALES
// ==========================================
const USUARIOS_SISTEMA = [
    { usr: "admin", pass: "1234", inst: "SSA" },
    { usr: "operador", pass: "imss2026", inst: "IMSS" }
];

let DATOS_CACHE = null;

async function validarAcceso() {
    const u = document.getElementById("login-usuario").value.trim();
    const p = document.getElementById("login-password").value.trim();
    const i = document.getElementById("login-institucion").value;

    const valido = USUARIOS_SISTEMA.find(x => x.usr === u && x.pass === p && x.inst === i);
    if (!valido) return alert("❌ Credenciales inválidas o Institución incorrecta.");

    document.getElementById("seccion-login").classList.add("oculto");
    document.getElementById("seccion-dashboard").classList.remove("oculto");
    document.getElementById("filtro-institucion").value = valido.inst;

    // Precargar BD al iniciar sesión para llenar selectores
    document.querySelector(".panel-acciones .btn-principal").innerText = "Sincronizando Base de Datos...";
    DATOS_CACHE = await obtenerDatosDesdeGoogle();
    
    if (DATOS_CACHE && DATOS_CACHE.censo) {
        const vacs = new Set(); const regs = new Set();
        
        DATOS_CACHE.censo.forEach(row => {
            let v = buscarDato(row, "nombre de vacunador");
            if (v && String(v).trim() !== "") vacs.add(String(v).trim());
            
            let r = buscarDato(row, "registrador_nombre");
            if (r && String(r).trim() !== "") regs.add(String(r).trim());
        });
        
        const sVac = document.getElementById("filtro-vacunador");
        const sReg = document.getElementById("filtro-registrador");
        
        // Limpiar opciones anteriores por si el usuario recarga la BD, conservando la opción "-- Todos --"
        sVac.options.length = 1; 
        sReg.options.length = 1;
        
        // Convertir el Set a Array, ordenar alfabéticamente e inyectar en el DOM
        [...vacs].sort().forEach(val => sVac.add(new Option(val, val)));
        [...regs].sort().forEach(val => sReg.add(new Option(val, val)));
    }
    document.querySelector(".panel-acciones .btn-principal").innerText = "Generar Reporte Seleccionado";
}

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

// 3. ENRUTADOR PRINCIPAL DE GENERACIÓN
async function ejecutarGeneracionPorFiltros() {
    const btn = document.querySelector(".panel-acciones .btn-principal");
    
    try {
        const tipoRep = document.getElementById("filtro-tipo").value;
        const fInit = document.getElementById("filtro-fecha-inicio").value;
        let fEnd = document.getElementById("filtro-fecha-fin").value;

        // Se ELIMINA la restricción estricta de requerir fecha. 
        // Ahora, si fInit está vacío, se asume extracción histórica total.
        if (!fEnd && fInit) fEnd = fInit; 

        const vac = document.getElementById("filtro-vacunador").value;
        const reg = document.getElementById("filtro-registrador").value;
        const caso = document.getElementById("filtro-caso").value.toLowerCase();
        const instSeleccionada = document.getElementById("filtro-institucion").value;
        
        btn.innerText = "Procesando Datos...";
        
        const datosBD = await obtenerDatosDesdeGoogle();
        
        if (!datosBD) throw new Error("No se recibió respuesta del servidor.");
        if (datosBD.error) throw new Error("Error interno: " + datosBD.error);
        
        const censoSeguro = datosBD.censo || [];
        const vacunasSeguras = datosBD.historial_vacunas || [];
        
        if (censoSeguro.length === 0) throw new Error("La hoja de Censo está vacía.");

        const pacientesFiltrados = censoSeguro.filter(p => {
            let fAct = normalizarFecha(buscarDato(p, "fecha de la actividad"));
            let instReg = String(buscarDato(p, "registrador_institucion")).toUpperCase(); 

            // 1. FLEXIBILIDAD DE FECHAS: Si no hay fecha de inicio, pasa en automático
            let matchFecha = true;
            if (fInit) {
                matchFecha = (fAct >= fInit && fAct <= fEnd);
            }

            // 2. FILTRADO ESTRICTO POR SELECTORES DE PERSONAL
            // Se usa "===" para coincidencia exacta con el dropdown y evitar falsos positivos
            let nombreVacBD = String(buscarDato(p, "nombre de vacunador")).trim();
            let nombreRegBD = String(buscarDato(p, "registrador_nombre")).trim();
            
            let matchVac = vac ? (nombreVacBD === vac) : true; 
            let matchReg = reg ? (nombreRegBD === reg) : true; 
            let matchCaso = caso ? (buscarDato(p, "nombre del caso").toLowerCase().includes(caso)) : true; 
            
            // 3. COMPUERTA TEMPORAL DE INSTITUCIÓN (BYPASS HISTÓRICO)
            // Cualquier registro capturado antes del 10 de Septiembre de 2026 pasa sin importar la institución
            let esRegistroAntiguo = (fAct !== "" && fAct < "2026-09-10");
            
            let matchInst = (instSeleccionada === "TODAS" || tipoRep === "bloqueo" || esRegistroAntiguo) 
                            ? true 
                            : instReg.includes(instSeleccionada); 

            return matchFecha && matchVac && matchReg && matchCaso && matchInst;
        });

        if (pacientesFiltrados.length === 0) {
            alert("⚠️ No hay registros que coincidan con los filtros seleccionados.");
            btn.innerText = "Generar Reporte Seleccionado";
            return;
        }

        // 4. CRUCE RELACIONAL BLINDADO
        const datosUnificados = pacientesFiltrados.map(p => ({
            ...p, 
            _historialVacunas: vacunasSeguras.filter(v => buscarDato(v, "id_paciente") == buscarDato(p, "id")) 
        }));

        // 5. LLAMADA A RENDERIZADO
        if (tipoRep === "censo") generarAnexosCenso(datosUnificados, fInit, fEnd);
        else if (tipoRep === "informe") generarInformeActividad(datosUnificados, fInit, fEnd);
        else if (tipoRep === "bloqueo") generarAccionesBloqueo(datosUnificados, fInit, fEnd);

        // Restaurar estado del botón si todo fue un éxito
        btn.innerText = "Generar Reporte Seleccionado";

    } catch (error) {
        // 6. MANEJO DEL ERROR: Informa al usuario y libera la interfaz
        console.error("Fallo crítico detectado en el hilo de ejecución:", error);
        alert("Ocurrió un error durante el procesamiento:\n" + error.message);
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

// 5. INFORME FINAL (Resumen)
function generarInformeActividad(datosUnificados, fInit, fEnd) {
    let stats = { fechaJornada: fInit === fEnd ? fInit : `${fInit} a ${fEnd}`, people: datosUnificados.length, totalDoses: 0, masc: 0, fem: 0, grupos: { "1-A": 0, "1-B": 0, "1-C": 0 }, vacunasDetalle: {} };
    
    datosUnificados.forEach(f => {
        let catEdad = String(buscarDato(f, "tipo de vacunacion")).toLowerCase();
        let tipo = catEdad.includes("0 a 9") ? "1-A" : catEdad.includes("10 a 19") ? "1-B" : "1-C";
        stats.grupos[tipo]++;
        let s = buscarDato(f, "sexo").toUpperCase().startsWith("M") ? "M" : "F";
        if (s === "M") stats.masc++; else stats.fem++;

        ESQUEMAS[tipo].forEach(v => {
            let fv = buscarFechaVacuna(f._historialVacunas, v.key);
            if (fv >= fInit && fv <= fEnd) { // Entra en el rango de actividad reportada
                stats.totalDoses++;
                if(!stats.vacunasDetalle[v.label]) stats.vacunasDetalle[v.label] = { total: 0, F09: 0, F1019: 0, F20: 0, TotalF: 0, M09: 0, M1019: 0, M20: 0, TotalM: 0 };
                let d = stats.vacunasDetalle[v.label];
                d.total++;
                if (s === "F") { d.TotalF++; if(tipo==="1-A") d.F09++; else if(tipo==="1-B") d.F1019++; else d.F20++; } 
                else { d.TotalM++; if(tipo==="1-A") d.M09++; else if(tipo==="1-B") d.M1019++; else d.M20++; }
            }
        });
    });

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'pt', 'letter');
    const pW = doc.internal.pageSize.width;
    
    doc.setFontSize(14); doc.setFont(undefined, 'bold'); doc.setTextColor(159, 34, 65);
    doc.text("CÉDULA DE EVALUACIÓN Y SEGUIMIENTO DIARIO", pW / 2, 90, { align: 'center' });
    doc.setFontSize(10); doc.setTextColor(0); doc.text(`FECHA DE JORNADA (REGISTRO): ${stats.fechaJornada}`, pW / 2, 105, { align: 'center' });
    
    doc.autoTable({
        startY: 130,
        head: [['POBLACIÓN ATENDIDA', 'CANTIDAD']],
        body: [ ['Total de Personas Registradas', stats.people], ['Hombres', stats.masc], ['Mujeres', stats.fem], ['Infantes (0 a 9 años)', stats.grupos["1-A"]], ['Adolescentes (10 a 19 años)', stats.grupos["1-B"]], ['Adultos (20+ años)', stats.grupos["1-C"]] ],
        theme: 'striped', headStyles: { fillColor: [159, 34, 65] }
    });

    const bodyVacunas = Object.keys(stats.vacunasDetalle).map(v => {
        const d = stats.vacunasDetalle[v]; return [v, d.F09, d.F1019, d.F20, d.TotalF, d.M09, d.M1019, d.M20, d.TotalM, d.total];
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
    const brigadasSet = new Set();

    unificados.forEach(p => {
        let dom = String(buscarDato(p, "domicilio visitado")).toLowerCase(); 
        let caso = String(buscarDato(p, "caso en domicilio")).toLowerCase();

        if (dom === 'a' || dom.includes('ausente')) famAus++;
        if (dom === 'r' || dom.includes('renuente')) famRen++;
        if (dom.includes('deshabitada')) casaDes++;
        if (dom.includes('baldio') || dom.includes('baldío')) lotBal++;
        if (dom.includes('negocio')) negocios++;

        if (caso.includes('sospechoso')) cSosp++;
        if (caso.includes('probable')) cProb++;

        let reg = buscarDato(p, "registrador_nombre");
        let vac = buscarDato(p, "nombre de vacunador");
        brigadasSet.add(`${datosGen.caso}_${reg}_${vac}`);
    });

    const familiasEntrevistadas = casasVisitadas - (famAus + casaDes + famRen + lotBal + negocios);

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