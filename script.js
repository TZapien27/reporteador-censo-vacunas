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
            let v = buscarDato(row, "nombre_vacunador"); if (v) vacs.add(v);
            let r = buscarDato(row, "registrador_nombre"); if (r) regs.add(r);
        });
        const sVac = document.getElementById("filtro-vacunador");
        const sReg = document.getElementById("filtro-registrador");
        vacs.forEach(val => sVac.add(new Option(val, val)));
        regs.forEach(val => sReg.add(new Option(val, val)));
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

const normalizarFecha = (f) => {
    if (!f) return "";
    let soloFecha = String(f).split(' ')[0]; 
    let partes = soloFecha.split(/[\/\-]/); 
    if (partes.length !== 3) return soloFecha;
    let dia = parseInt(partes[0], 10), mes = parseInt(partes[1], 10), anio = parseInt(partes[2], 10);
    if (anio < 100) anio += 2000;
    return `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`; // Estandarizado YYYY-MM-DD para filtrado fácil
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
    const tipoRep = document.getElementById("filtro-tipo").value;
    const fInit = document.getElementById("filtro-fecha-inicio").value;
    let fEnd = document.getElementById("filtro-fecha-fin").value;
    if (!fInit) return alert("❌ Seleccione Fecha Inicial.");
    if (!fEnd) fEnd = fInit; // Si no hay fecha fin, asume mismo día

    const vac = document.getElementById("filtro-vacunador").value;
    const reg = document.getElementById("filtro-registrador").value;
    const caso = document.getElementById("filtro-caso").value.toLowerCase();
    
    btn.innerText = "Procesando Datos...";
    
    const datosBD = await obtenerDatosDesdeGoogle();
    if (!datosBD || !datosBD.censo) { alert("Error de BD"); btn.innerText = "Generar Reporte Seleccionado"; return; }

    // FILTRADO MAESTRO
    const pacientesFiltrados = datosBD.censo.filter(p => {
        let fAct = normalizarFecha(buscarDato(p, "fecha de la actividad"));
        let matchFecha = (fAct >= fInit && fAct <= fEnd);
        let matchVac = vac ? (buscarDato(p, "nombre_vacunador").includes(vac)) : true;
        let matchReg = reg ? (buscarDato(p, "registrador_nombre").includes(reg)) : true;
        let matchCaso = caso ? (JSON.stringify(p).toLowerCase().includes(caso)) : true;
        return matchFecha && matchVac && matchReg && matchCaso;
    });

    if (pacientesFiltrados.length === 0) {
        alert("⚠️ No hay registros que coincidan con estos filtros.");
        btn.innerText = "Generar Reporte Seleccionado";
        return;
    }

    const datosUnificados = pacientesFiltrados.map(p => ({
        ...p, _historialVacunas: datosBD.historial_vacunas.filter(v => (buscarDato(v, "id_paciente") || buscarDato(v, "id")) == buscarDato(p, "id"))
    }));

    if (tipoRep === "censo") generarAnexosCenso(datosUnificados, fInit, fEnd);
    else if (tipoRep === "informe") generarInformeActividad(datosUnificados, fInit, fEnd);
    else if (tipoRep === "bloqueo") generarAccionesBloqueo(datosUnificados, fInit, fEnd);

    btn.innerText = "Generar Reporte Seleccionado";
}

// 4. GENERACIÓN DE ANEXOS 1-A, 1-B, 1-C
function generarAnexosCenso(datosUnificados, fInit, fEnd) {
    const grupos = { "1-A": [], "1-B": [], "1-C": [] };
    datosUnificados.forEach(f => {
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
                    if(col === 0) doc.text(buscarDato(p, "quién recibe atención"), d.cell.x + 2, d.cell.y + 10);
                    
                    // Req 5: Textos Rotados 90 Grados con Desfase en Y
                    if(col === 1 || col === 2 || col === 3) {
                        let val = "";
                        if (col === 1) val = buscarDato(p, "curp");
                        if (col === 2) val = buscarDato(p, "fecha ingresada") || buscarDato(p, "fecha de nacimiento");
                        if (col === 3) val = buscarDato(p, "edad");
                        
                        let idxPaciente = Math.floor(d.row.index / (tipo === "1-C" ? 1 : 2));
                        let desfaseVertical = (idxPaciente % 2 === 0) ? 0 : 8; // Zigzag arriba/abajo
                        
                        doc.text(val, d.cell.x + (d.cell.width/2) + 2, d.cell.y + d.cell.height - 2 - desfaseVertical, { angle: 90 });
                    }
                    if(col === 4) doc.text(buscarDato(p, "sexo").toUpperCase().startsWith("M") ? "Masc" : "Fem", d.cell.x + (d.cell.width/2), d.cell.y + 10, { align: 'center' });
                    
                    // Req 7: Inyección en Celdas Fusionadas (aprovechan doble alto)
                    if (col === 5) { doc.text(doc.splitTextToSize(buscarDato(p, "dirección"), d.cell.width - 2), d.cell.x + 1, d.cell.y + 8); }
                    if (col === 6) { doc.text(doc.splitTextToSize(buscarDato(p, "colonia"), d.cell.width - 2), d.cell.x + 1, d.cell.y + 8); }
                } 
                else if (rowInfo.t === "PARENTESCO") {
                    if(col === 0) {
                        let txtPar = `${buscarDato(p, "tipo de parentesco")} - ${buscarDato(p, "nombre pariente")}`;
                        doc.setFontSize(4.5); doc.text(txtPar, d.cell.x + 2, d.cell.y + 7);
                    }
                    if(col === 2) {
                        doc.setFontSize(5.5); doc.text(buscarDato(p, "fecha nacimiento de pariente"), d.cell.x + (d.cell.width/2), d.cell.y + 7, { align: 'center' });
                    }
                }

                // Req de Colores de Vacuna: Rojo subrayado para hoy (rango actual), negro para antecedentes
                if (col >= 7 && (rowInfo.t === "PARENTESCO" || rowInfo.t === "UNICO")) {
                    let fv = buscarFechaVacuna(p._historialVacunas, esquema[col-7].key); 
                    if (fv) {
                        let pIndex = Math.floor(d.row.index / (tipo === "1-C" ? 1 : 2));
                        let offsetHorizontal = (pIndex % 2 === 0) ? -5 : 5;
                        let tX = d.cell.x + (d.cell.width/2) + offsetHorizontal;
                        let tY = d.cell.y + d.cell.height - 2; 
                        
                        // Si la vacuna aplicada cae dentro del rango buscado en el filtro, es ROJA.
                        if (fv >= fInit && fv <= fEnd) {
                            doc.setTextColor(255, 0, 0); 
                            doc.text(fv, tX, tY, { angle: 90 });
                            doc.setDrawColor(255, 0, 0); doc.setLineWidth(0.6);
                            doc.line(tX + 2, tY, tX + 2, tY - 25); // Underline (rotado)
                            doc.setTextColor(0); doc.setDrawColor(180); doc.setLineWidth(0.5);
                        } else { // Antecedente histórico: NEGRO
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
// 6. NUEVO REPORTE: ACCIONES REALIZADAS EN BLOQUEO VACUNAL (Req 2)
// ==========================================
function generarAccionesBloqueo(unificados, fInit, fEnd) {
    const casasVisitadas = unificados.length; // Cada registro del array general equivale a 1 domicilio censado
    let famAus = 0, casaDes = 0, famRen = 0, lotBal = 0, negocios = 0, cSosp = 0, cProb = 0;
    const brigadasSet = new Set();

    unificados.forEach(p => {
        let dom = String(buscarDato(p, "domicilio_visitado")).toLowerCase();
        let sit = String(buscarDato(p, "situacion_domicilio")).toUpperCase();
        let caso = String(buscarDato(p, "caso_en_domicilio"));

        if (sit === 'A') famAus++;
        if (sit === 'R') famRen++;
        if (dom.includes('deshabitada')) casaDes++;
        if (dom.includes('baldio') || dom.includes('baldío')) lotBal++;
        if (dom.includes('negocio')) negocios++;
        if (caso.includes('Sospechoso')) cSosp++;
        if (caso.includes('Probable')) cProb++;

        // Req 2: Calculo de brigadas por combinación [caso + reg + vac]
        let reg = buscarDato(p, "registrador_nombre");
        let vac = buscarDato(p, "nombre_vacunador");
        let casoN = buscarDato(p, "bloqueo_nombre_caso") || "Brote_ND";
        brigadasSet.add(`${casoN}_${reg}_${vac}`);
    });

    const familiasEntrevistadas = casasVisitadas - (famAus + casaDes + famRen + lotBal + negocios);
    
    // BUCKETING (Algoritmo de Matriz Poblacional)
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

    unificados.forEach(p => {
        let edad = parseInt(buscarDato(p, "edad")) || 0;
        let bk = "";
        if (edad < 1) bk = "menores 1 @"; else if (edad <= 4) bk = "1-4 @"; else if (edad <= 9) bk = "5-9 @"; else if (edad <= 12) bk = "10-12 @"; else if (edad <= 14) bk = "13-14 @"; else if (edad <= 24) bk = "15-24 @"; else if (edad <= 39) bk = "25-39 @"; else if (edad <= 44) bk = "40-44 @"; else if (edad <= 64) bk = "45-64 @"; else bk = "65 y más";

        matriz[bk].t++;
        if (buscarDato(p, "sexo").toUpperCase().startsWith("M")) matriz[bk].m++; else matriz[bk].f++;

        let cartilla = false;
        p._historialVacunas.forEach(v => {
            let fV = normalizarFecha(v.Fecha_Ingresada || buscarDato(v, "fecha_ingresada"));
            let nV = String(v.vacuna_aplicada || Object.values(v)[1]).toUpperCase();
            
            if (fV !== "" && (fV < fInit)) cartilla = true; // Antecedente comprobado (fecha pasada)
            
            if (fV >= fInit && fV <= fEnd) { // Dosis de esta campaña
                if (nV.includes("SRP") && edad < 10) matriz[bk].srp++;
                if (nV.includes("SR") && !nV.includes("SRP") && edad >= 10) matriz[bk].sr++;
            }
        });
        if (cartilla) matriz[bk].cA++; else matriz[bk].sA++;
    });

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'pt', 'letter');
    const pW = doc.internal.pageSize.width;

    doc.setFontSize(12); doc.setFont(undefined, 'bold'); doc.setTextColor(159, 34, 65);
    doc.text("ACCIONES REALIZADAS EN BLOQUEO VACUNAL", pW / 2, 30, { align: 'center' });

    doc.setFontSize(8); doc.setTextColor(0); doc.setFont(undefined, 'normal');
    doc.text(`FECHA / RANGO: ${fInit} a ${fEnd}`, 40, 50);
    doc.text(`BRIGADAS ACTIVAS: ${brigadasSet.size || 1}`, 40, 65);
    
    // Tabla Operativa Superior
    doc.autoTable({
        startY: 75, margin: { left: 40 }, tableWidth: 300,
        body: [
            ['Casas Visitadas (Censo App)', casasVisitadas], ['Familias Entrevistadas (Efectivas)', familiasEntrevistadas],
            ['Familias Ausentes (A)', famAus], ['Casas Deshabitadas (DH)', casaDes], ['Familias Renuentes (R)', famRen],
            ['Lotes Baldíos', lotBal], ['Negocios', negocios], ['Casos Sospechosos', cSosp], ['Casos Probables', cProb]
        ],
        theme: 'grid', styles: { fontSize: 7 }
    });

    // Renderizado Matriz Inferior
    let keys = Object.keys(matriz);
    let sTot=0, sMasc=0, sFem=0, sCa=0, sSa=0, sSrp=0, sSr=0, sDos=0;
    let sumProv=0, sumEnc=0, sumFin=0;

    const tablaPoblacion = keys.map(k => {
        let r = matriz[k];
        let dosis = r.srp + r.sr;
        let provac = r.t > 0 ? (dosis / r.t) * 100 : 0;
        let encuesta = r.t > 0 ? (r.cA / r.t) * 100 : 0;
        let final = provac + encuesta;

        sTot+=r.t; sMasc+=r.m; sFem+=r.f; sCa+=r.cA; sSa+=r.sA; sSrp+=r.srp; sSr+=r.sr; sDos+=dosis;
        sumProv+=provac; sumEnc+=encuesta; sumFin+=final;

        return [k, r.t, r.m, r.f, r.cA, r.sA, r.srp, r.sr, dosis, provac.toFixed(2)+"%", encuesta.toFixed(2)+"%", final.toFixed(2)+"%"];
    });

    tablaPoblacion.push([
        "TOTAL", sTot, sMasc, sFem, sCa, sSa, sSrp, sSr, sDos, 
        (sumProv/keys.length).toFixed(2)+"%", (sumEnc/keys.length).toFixed(2)+"%", (sumFin/keys.length).toFixed(2)+"%" // Promedios de promedios
    ]);

    doc.autoTable({
        startY: doc.lastAutoTable.finalY + 20,
        head: [['GRUPOS DE EDAD', 'TOTAL', 'MASC', 'FEM', 'CON ANTECEDENTE', 'SIN ANTECEDENTE', 'APLIC. TRIPLE VIRAL', 'APLIC. SR', 'DOSIS APLICADAS', 'COB. PROVAC', 'ENCUESTA RÁPIDA', 'COB. FINAL']],
        body: tablaPoblacion,
        theme: 'grid', styles: { fontSize: 7, halign: 'center' }, headStyles: { fillColor: [188, 149, 92] }
    });

    let fName = fInit === fEnd ? fInit : `${fInit}_${fEnd}`;
    doc.save(`Bloqueo_Vacunal_${fName}.pdf`);
    alert("✅ Formato de Bloqueo generado.");
}