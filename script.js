// 1. ESQUEMAS ORIGINALES CENSIA
const LOGO_BASE64 = ""; 
const ESQUEMAS = {
    "1-A": [
        { label: "BCG", key: "bcg" }, 
        { label: "HepB", key: "hepatitis b" }, 
        { label: "Hexa 1", key: "hexavalente acelular (dpat-vip-hb-hib) 1" }, 
        { label: "Hexa 2", key: "hexavalente acelular (dpat-vip-hb-hib) 2" }, 
        { label: "Hexa 3", key: "hexavalente acelular (dpat-vip-hb-hib) 3" }, 
        { label: "Hexa R", key: "hexavalente acelular (dpat-vip-hb-hib) refuerzo" },
        { label: "DPT", key: "dpt" },
        { label: "Rota 1", key: "rotavirus 1" }, 
        { label: "Rota 2", key: "rotavirus 2" }, 
        { label: "Neumo 1", key: "neumococica conjugada (13 serotipos) 1" }, 
        { label: "Neumo 2", key: "neumococica conjugada (13 serotipos) 2" }, 
        { label: "Neumo 3", key: "neumococica conjugada (13 serotipos) 3" }, 
        { label: "Influ 1", key: "influenza 1" }, 
        { label: "Influ 2", key: "influenza 2" }, 
        { label: "Influ R", key: "influenza refuerzo" }, 
        { label: "SRP 0", key: "srp 0" }, 
        { label: "SRP 1", key: "srp 1" }, 
        { label: "SRP 2", key: "srp 2" }, 
        { label: "Otras", key: "otras" }
    ],
    "1-B": [
        { label: "HepB 1", key: "hepatitis b 1" }, 
        { label: "HepB 2", key: "hepatitis b 2" }, 
        { label: "TD 1", key: "td 1" }, 
        { label: "TD 2", key: "td 2" }, 
        { label: "TD 3", key: "td 3" }, 
        { label: "TD R", key: "td refuerzo" }, 
        { label: "TDPA", key: "tdpa" }, 
        { label: "INFLU", key: "influenza" }, 
        { label: "SR 1", key: "sr 1" }, 
        { label: "SR 2", key: "sr 2" }, 
        { label: "SR R", key: "sr refuerzo" }, 
        { label: "VPH", key: "vph" }, 
        { label: "VARICELA", key: "varicela" }, 
        { label: "HEP A", key: "hepatitis a" }, 
        { label: "COVID", key: "covid" }, 
        { label: "Neumo", key: "neumococica conjugada (refuerzo)" }, 
        { label: "Neumo 23", key: "neumo 23" }, 
        { label: "Otras", key: "otras" }
    ],
    "1-C": [
        { label: "HepB 1", key: "hepatitis b 1" }, 
        { label: "HepB 2", key: "hepatitis b 2" }, 
        { label: "TD 1", key: "td 1" }, 
        { label: "TD 2", key: "td 2" }, 
        { label: "TD 3", key: "td 3" }, 
        { label: "TD R", key: "td refuerzo" }, 
        { label: "TDPA", key: "tdpa" }, 
        { label: "INFLU", key: "influenza" }, 
        { label: "SR 1", key: "sr 1" }, 
        { label: "SR 2", key: "sr 2" }, 
        { label: "SR R", key: "sr refuerzo" }, 
        { label: "VARICELA", key: "varicela" }, 
        { label: "HEP A", key: "hepatitis a" }, 
        { label: "COVID", key: "covid" }, 
        { label: "Neumo", key: "neumococica conjugada (refuerzo)" }, 
        { label: "Neumo 23", key: "neumo 23" }, 
        { label: "Otras", key: "otras" }
    ]
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
    return `${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}/${anio}`;
};

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzkQq4qseUqDSGsNvf7d1EcsE6qh0yNFZz5JGE9nLGkBpeCRdSZckAvDlk1P5GLGVZEiw/exec';

/*async function obtenerDatosDesdeGoogle() {
    try {
        console.log("Iniciando descarga de datos desde Google Sheets...");
        
        const respuesta = await fetch(APPS_SCRIPT_URL);
        if (!respuesta.ok) throw new Error('Error en la petición de red');
        
        // El JSON ya viene con dos arreglos: censo y historial_vacunas
        const datosBD = await respuesta.json(); 
        
        console.log("Datos descargados correctamente:", datosBD);
        
        // Retornamos ambos arreglos para que el resto de tu código los use
        return {
            datosCenso: datosBD.censo,
            datosVacunas: datosBD.historial_vacunas
        };
        
    } catch (error) {
        console.error("Fallo al obtener los datos:", error);
        alert("Hubo un error al descargar la base de datos.");
    }
} */
async function obtenerDatosDesdeGoogle() {
    try {
        console.log("Iniciando descarga de datos desde Google Sheets...");
        
        // La petición DEBE ir completamente limpia, sin headers ni modes raros.
        const response = await fetch(APPS_SCRIPT_URL);
        
        if (!response.ok) {
            throw new Error(`Error de red: ${response.status}`);
        }

        const datos = await response.json();
        console.log("Datos descargados correctamente");
        return datos;

    } catch (error) {
        console.error("Fallo al obtener los datos:", error);
        return null; // Devuelve null para que el "seguro de vida" atrape el error
    }
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

// 3. FUNCIÓN MAESTRA
async function generarPDF() {
    // 1. PREGUNTAR LA FECHA SIEMPRE AL USUARIO
    const fFiltro = prompt("¿De qué fecha quieres generar el reporte? (Ej. 29/05/2026):");
    if(!fFiltro) return; // Si cancela, detenemos la ejecución
    
    const fechaBusqueda = normalizarFecha(fFiltro);
    const btn = document.querySelector(".btn-principal");
    if(btn) btn.innerText = "Descargando datos...";

    try {
        // 2. OBTENER DATOS DE LA BASE DE DATOS (Google Sheets)
        const datosBD = await obtenerDatosDesdeGoogle();
        
        // --- INYECCIÓN DE DIAGNÓSTICO ---
        console.log("Paquete íntegro recibido desde Google:", datosBD);
        
        if (!datosBD) {
            if(btn) btn.innerText = "Generar Reporte por Fecha";
            return; 
        }

        // Interceptar errores nativos emitidos desde el backend (Apps Script)
        if (datosBD.error) {
            alert("Error devuelto por la Base de Datos: " + datosBD.error);
            if(btn) btn.innerText = "Generar Reporte por Fecha";
            return;
        }
        
        // Extracción estricta de propiedades usando las llaves exactas del JSON actual
        const datosPacientes = datosBD.censo;
        const datosVacunas = datosBD.historial_vacunas;

        // Blindaje de tipo: Validar que el parseo devolvió un Array antes de ejecutar .filter()
        if (!Array.isArray(datosPacientes)) {
            console.error("El objeto 'censo' no es un arreglo válido. Contenido recibido:", datosPacientes);
            alert("Fallo estructural: Los datos del censo no llegaron correctamente.");
            if(btn) btn.innerText = "Generar Reporte por Fecha";
            return;
        }

        if(btn) btn.innerText = "Procesando reporte...";

        // 3. LÓGICA DE NEGOCIO (Preservada intacta para el mapeo relacional)
        const pacientesJornada = datosPacientes.filter(f => normalizarFecha(buscarDato(f, "fecha de la actividad")) === fechaBusqueda);
        
        if (pacientesJornada.length === 0) { 
            alert("No se encontraron registros para la fecha: " + fechaBusqueda); 
            if(btn) btn.innerText = "Generar Reporte"; 
            return; 
        }

        const datosUnificados = pacientesJornada.map(paciente => ({
            ...paciente,
            _historialVacunas: datosVacunas.filter(v => (buscarDato(v, "id_paciente") || buscarDato(v, "id")) == buscarDato(paciente, "id"))
        }));

        const grupos = { "1-A": [], "1-B": [], "1-C": [] };
        let stats = { fechaJornada: fechaBusqueda, people: datosUnificados.length, totalDoses: 0, masc: 0, fem: 0, grupos: { "1-A": 0, "1-B": 0, "1-C": 0 }, vacunasDetalle: {} };

        datosUnificados.forEach(f => {
            let catEdad = String(buscarDato(f, "tipo de vacunacion")).toLowerCase();
            let tipo = null;
            if (catEdad.includes("0 a 9") || catEdad.includes("infante")) tipo = "1-A";
            else if (catEdad.includes("10 a 19") || catEdad.includes("adolescente")) tipo = "1-B";
            else if (catEdad.includes("20 a") || catEdad.includes("60") || catEdad.includes("adulto")) tipo = "1-C";
            
            if (tipo) {
                grupos[tipo].push(f);
                stats.grupos[tipo]++;
                let s = buscarDato(f, "sexo").toUpperCase().startsWith("M") ? "M" : "F";
                if (s === "M") stats.masc++; else stats.fem++;

                ESQUEMAS[tipo].forEach(v => {
                    let fv = buscarFechaVacuna(f._historialVacunas, v.key);
                    if (fv === fechaBusqueda) {
                        stats.totalDoses++;
                        if(!stats.vacunasDetalle[v.label]) {
                            stats.vacunasDetalle[v.label] = { total: 0, F09: 0, F1019: 0, F20: 0, TotalF: 0, M09: 0, M1019: 0, M20: 0, TotalM: 0 };
                        }
                        let d = stats.vacunasDetalle[v.label];
                        d.total++;
                        
                        if (s === "F") {
                            d.TotalF++;
                            if (tipo === "1-A") d.F09++;
                            else if (tipo === "1-B") d.F1019++;
                            else d.F20++;
                        } else {
                            d.TotalM++;
                            if (tipo === "1-A") d.M09++;
                            else if (tipo === "1-B") d.M1019++;
                            else d.M20++;
                        }
                    }
                });
            }
        });

        Object.keys(grupos).forEach(tipo => {
            if (grupos[tipo].length > 0) procesarAnexo(tipo, grupos[tipo], fechaBusqueda);
        });

        generarPDFResumen(stats);

        if(btn) btn.innerText = "Generar Reporte por Fecha";
        alert("¡Reporte y anexos generados con éxito!");

    } catch (e) {
        console.error(e); 
        alert("Error: " + e.message);
        if(btn) btn.innerText = "Generar Reporte por Fecha";
    }
}

// 4. DIBUJADO DE ANEXOS
function procesarAnexo(tipo, datos, fechaBusqueda) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'pt', 'legal');
    const esquema = ESQUEMAS[tipo];
    
    const bodyData = [];
    datos.forEach((p, i) => {
        if (tipo === "1-C") {
            bodyData.push({ t: "UNICO", p: p });
        } else {
            bodyData.push({ t: "NINO", p: p });
            bodyData.push({ t: "PARENTESCO", p: p });
        }
    });

    const perPage = (tipo === "1-C") ? 12 : 20;
    while (bodyData.length % perPage !== 0) bodyData.push({ t: "VACIO", p: null });

    doc.autoTable({
        head: [['NOMBRE / PARENTESCO', 'CURP', 'F.NAC', 'EDAD', 'SEXO', 'CALLE', 'COLONIA', ...esquema.map(v => v.label)]],
        body: bodyData.map(() => Array(7 + esquema.length).fill("")), 
        startY: 135,
        margin: { top: 135, bottom: 115 },
        theme: 'grid',
        styles: { fontSize: 5, textColor: 0, halign: 'center', lineWidth: 0.5 },
        columnStyles: { 0: { cellWidth: 130, halign: 'left' }, 5: { cellWidth: 55 }, 6: { cellWidth: 55 } },
        headStyles: { fillColor: [255, 255, 255], textColor: [159, 34, 65], minCellHeight: 45 },
        didParseCell: function(d) {
            d.cell.text = []; 
            if (d.section === 'body') {
                if (tipo === "1-C") d.cell.styles.minCellHeight = 24;
                else d.cell.styles.minCellHeight = (d.row.index % 2 === 0) ? 14 : 10;
                
                if (Math.floor(d.row.index / (tipo === "1-C" ? 1 : 2)) % 2 !== 0) d.cell.styles.fillColor = [240, 240, 240];
                
                if (tipo !== "1-C" && (d.column.index === 5 || d.column.index === 6)) {
                    let rType = bodyData[d.row.index].t;
                    if (rType === "NINO") d.cell.styles.lineWidth = { top: 0.5, bottom: 0, left: 0.5, right: 0.5 };
                    if (rType === "PARENTESCO") d.cell.styles.lineWidth = { top: 0, bottom: 0.5, left: 0.5, right: 0.5 };
                }
            }
        },
        didDrawCell: function(d) {
            const col = d.column.index;
            
            // --- DIBUJO DE CABECERA ---
            if (d.section === 'head') {
                doc.saveGraphicsState(); doc.setFontSize(6); doc.setTextColor(159, 34, 65);
                const tit = ['NOMBRE / PARENTESCO', 'CURP', 'F.NAC', 'EDAD', 'SEXO', 'CALLE', 'COLONIA', ...esquema.map(v => v.label)][col];
                
                if (col < 5) {
                    doc.text(tit, d.cell.x + (d.cell.width/2), d.cell.y + 25, { align: 'center' });
                }
                else if (col === 5) {
                    doc.setDrawColor(255, 255, 255); doc.setLineWidth(1.5);
                    doc.line(d.cell.x + d.cell.width, d.cell.y + 1, d.cell.x + d.cell.width, d.cell.y + 15); 
                    
                    doc.setTextColor(159, 34, 65);
                    doc.text("DIRECCIÓN", d.cell.x + d.cell.width, d.cell.y + 12, { align: 'center' });
                    doc.setDrawColor(180); doc.setLineWidth(0.5);
                    doc.line(d.cell.x, d.cell.y + 16, d.cell.x + d.cell.width * 2, d.cell.y + 16);
                    doc.text("CALLE", d.cell.x + (d.cell.width/2), d.cell.y + 35, { align: 'center' });
                } else if (col === 6) {
                    doc.text("COLONIA", d.cell.x + (d.cell.width/2), d.cell.y + 35, { align: 'center' });
                } 
                else if (col >= 7) {
                    doc.text(tit, d.cell.x + (d.cell.width/2), d.cell.y + 15, { align: 'center' });
                    doc.setDrawColor(180); doc.setLineWidth(0.5);
                    doc.line(d.cell.x, d.cell.y + 20, d.cell.x + d.cell.width, d.cell.y + 20);
                    doc.line(d.cell.x + (d.cell.width/2), d.cell.y + 20, d.cell.x + (d.cell.width/2), d.cell.y + d.cell.height);
                    doc.setFontSize(4); doc.text("FECHA", d.cell.x + 2, d.cell.y + 35); doc.text("LOTE", d.cell.x + (d.cell.width/2) + 2, d.cell.y + 35);
                }
                doc.restoreGraphicsState();
            }

            // --- DIBUJO DEL CUERPO ---
            if (d.section === 'body') {
                const rowInfo = bodyData[d.row.index];
                if (rowInfo.t === "VACIO") return;
                const p = rowInfo.p;
                const isMain = (rowInfo.t === "NINO" || rowInfo.t === "UNICO");
                
                if (col >= 7) { doc.setDrawColor(180); doc.setLineWidth(0.5); doc.line(d.cell.x + (d.cell.width/2), d.cell.y, d.cell.x + (d.cell.width/2), d.cell.y + d.cell.height); }
                
                doc.setTextColor(0);
                
                if (isMain) {
                    doc.setFontSize(5.5);
                    if(col === 0) doc.text(buscarDato(p, "quién recibe atención") || "", d.cell.x + 2, d.cell.y + 10);
                    if(col === 1) doc.text(buscarDato(p, "curp") || "", d.cell.x + (d.cell.width/2), d.cell.y + 10, { align: 'center' });
                    
                    if(col === 2) {
                        let fnac = buscarDato(p, "fecha ingresada") || buscarDato(p, "fecha de nacimiento");
                        doc.text(normalizarFecha(fnac), d.cell.x + (d.cell.width/2), d.cell.y + 10, { align: 'center' });
                    }
                    if(col === 3) doc.text(buscarDato(p, "edad") || "", d.cell.x + (d.cell.width/2), d.cell.y + 10, { align: 'center' });
                    if(col === 4) doc.text(buscarDato(p, "sexo").toUpperCase().startsWith("M") ? "Masc" : "Fem", d.cell.x + (d.cell.width/2), d.cell.y + 10, { align: 'center' });
                    
                    // Solo imprimimos la dirección aquí para el anexo 1-C. Para los 1-A y 1-B se imprime más abajo.
                    if (tipo === "1-C") {
                        if(col === 5) doc.text(doc.splitTextToSize(buscarDato(p, "dirección") || "", d.cell.width - 2), d.cell.x + 1, d.cell.y + 8);
                        if(col === 6) doc.text(doc.splitTextToSize(buscarDato(p, "colonia") || "", d.cell.width - 2), d.cell.x + 1, d.cell.y + 8);
                    }
                } 
                else if (rowInfo.t === "PARENTESCO") {
                    if(col === 0) {
                        let tPar = buscarDato(p, "tipo de parentesco");
                        let nPar = buscarDato(p, "nombre pariente");
                        let textP = (tPar || nPar) ? `${tPar} - ${nPar}` : "";
                        doc.setFontSize(4.5); doc.text(textP, d.cell.x + 2, d.cell.y + 7);
                    }
                    if(col === 2) {
                        doc.setFontSize(5.5); 
                        doc.text(normalizarFecha(buscarDato(p, "fecha nacimiento de pariente")), d.cell.x + (d.cell.width/2), d.cell.y + 7, { align: 'center' });
                    }
                    
                    // CORRECCIÓN DE DIRECCIÓN: Imprimimos la calle y colonia del NINO en el turno del PARENTESCO
                    // Esto evita que el sombreado de la tabla ampute el texto. Arrancamos las coordenadas desde la celda de arriba (NINO)
                    if(col === 5 || col === 6) {
                        const pNino = bodyData[d.row.index - 1].p;
                        let valor = buscarDato(pNino, col === 5 ? "dirección" : "colonia") || "";
                        doc.setFontSize(5.5);
                        doc.text(doc.splitTextToSize(valor, d.cell.width - 2), d.cell.x + 1, d.cell.y - 14 + 8);
                    }
                }

                if (col >= 7 && (rowInfo.t === "PARENTESCO" || rowInfo.t === "UNICO")) {
                    let fv = buscarFechaVacuna(p._historialVacunas, esquema[col-7].key); 
                    if (fv) {
                        // CORRECCIÓN ZIGZAG: Se alterna el margen X dependiendo de qué número de paciente sea. 
                        // Paciente 1 imprime a la izq (-5), Paciente 2 a la der (+5).
                        let patientIndex = Math.floor(d.row.index / (tipo === "1-C" ? 1 : 2));
                        let offset = (patientIndex % 2 === 0) ? -5 : 5;
                        
                        let textX = d.cell.x + (d.cell.width/2) + offset;
                        let textY = d.cell.y + d.cell.height - 2; 
                        
                        if (fv === fechaBusqueda) {
                            doc.setTextColor(255, 0, 0); 
                            doc.text(fv, textX, textY, { angle: 90 });
                            doc.setDrawColor(255, 0, 0); doc.setLineWidth(0.6);
                            doc.line(textX + 2, textY, textX + 2, textY - 25); 
                            doc.setTextColor(0); doc.setDrawColor(180); doc.setLineWidth(0.5);
                        } else {
                            doc.text(fv, textX, textY, { angle: 90 });
                        }
                    }
                }
            }
        },
        addPageContent: (data) => dibujarFormatoBase(doc, data, tipo)
    });
    doc.save(`Anexo_${tipo}_${fechaBusqueda.replace(/\//g,'-')}.pdf`);
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
        doc.setFont(undefined, 'bold');
        doc.text("NOTA: (1).- REGISTRAR DATOS DEL MENOR.   (2).- REGISTRAR DATOS DEL ACOMPAÑANTE", 40, yPie);
        doc.setFont(undefined, 'normal');
        doc.text("PARENTESCO: (1).- Madre  (2).- Padre  (3).- Abuelo  (4).- Abuela  (5).- Tío  (6).- Tía  (7).- Hija  (8).- Hijo  (9).- Prima", 40, yPie + 10);
        doc.text("(10).- Primo  (11).- Vecino (a)  (12).- Otro parentesco", 88, yPie + 18);
    }

    const yAjuste = (tipo === "1-C") ? yPie : yPie + 30;
    doc.text("(a) SEXO: Fem: Femenino, Masc: Masculino", 40, yAjuste);
    doc.text("( b ) DERECHOHABIENCIA: 1.- SS, 2.- IMSS, 3.- ISSSTE, 4.- IMSS BIENESTAR, 5.- SEDENA, 6.- SEMAR", 40, yAjuste + 10);
    doc.text("( c ) ESTATUS MIGRATORIO - REGULAR: Extranjero con estancia legal. IRREGULAR: Estancia no documentada.", 380, yPie);
    doc.text("( d ) CÓDIGOS: A.- AUSENTE, I.- INMIGRÓ, D.- DEFUNCIÓN, R.- RENUENTE, E.- EMIGRÓ, F.- ENFERMO", 380, yPie + 10);

    doc.setFontSize(7);
    doc.text("__________________________________________", 200, pH - 30);
    doc.text("Nombre y Firma del Vacunador", 235, pH - 20);
    doc.text("__________________________________________", 600, pH - 30);
    doc.text("Nombre, Cargo y Firma de quien Valida", 620, pH - 20);
    doc.setFontSize(6); doc.text(`Hoja ${doc.internal.getNumberOfPages()}`, pW - 50, pH - 20);
}

// 6. INFORME FINAL
function generarPDFResumen(stats) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'pt', 'letter');
    const pW = doc.internal.pageSize.width;
    
    doc.setFontSize(14); doc.setFont(undefined, 'bold'); doc.setTextColor(159, 34, 65);
    doc.text("CÉDULA DE EVALUACIÓN Y SEGUIMIENTO DIARIO", pW / 2, 90, { align: 'center' });
    doc.setFontSize(10); doc.setTextColor(0);
    doc.text(`FECHA DE JORNADA (REGISTRO): ${stats.fechaJornada}`, pW / 2, 105, { align: 'center' });
    
    doc.autoTable({
        startY: 130,
        head: [['POBLACIÓN ATENDIDA', 'CANTIDAD']],
        body: [
            ['Total de Personas Registradas', stats.people],
            ['Hombres', stats.masc],
            ['Mujeres', stats.fem],
            ['Infantes (0 a 9 años)', stats.grupos["1-A"]],
            ['Adolescentes (10 a 19 años)', stats.grupos["1-B"]],
            ['Adultos / Embarazadas (20+ años)', stats.grupos["1-C"]]
        ],
        theme: 'striped', headStyles: { fillColor: [159, 34, 65] }
    });

    const bodyVacunas = Object.keys(stats.vacunasDetalle).map(v => {
        const d = stats.vacunasDetalle[v]; 
        return [v, d.F09, d.F1019, d.F20, d.TotalF, d.M09, d.M1019, d.M20, d.TotalM, d.total];
    });

    doc.setFontSize(12); doc.setFont(undefined, 'bold');
    doc.text(`PRODUCTIVIDAD DE BIOLÓGICOS (Al ${stats.fechaJornada})`, 40, doc.lastAutoTable.finalY + 40);

    doc.autoTable({
        startY: doc.lastAutoTable.finalY + 50,
        head: [['VACUNA', 'M 0-9A', 'M 10-19A', 'M 20+A', 'TOTAL M.', 'H 0-9A', 'H 10-19A', 'H 20+A', 'TOTAL H.', 'TOTAL DOSIS']],
        body: bodyVacunas.length > 0 ? bodyVacunas : [['Ninguna', '0', '0', '0', '0', '0', '0', '0', '0', '0']],
        theme: 'grid', headStyles: { fillColor: [188, 149, 92], fontSize: 6, halign: 'center' }, styles: { fontSize: 7, halign: 'center' }, columnStyles: { 0: { halign: 'left', fontStyle: 'bold' } }
    });

    doc.setFontSize(14); doc.setFont(undefined, 'bold'); doc.setTextColor(159, 34, 65);
    doc.text(`GRAN TOTAL DE DOSIS HOY: ${stats.totalDoses}`, 40, doc.lastAutoTable.finalY + 40);
    doc.save(`Informe_Jornada_${stats.fechaJornada.replace(/\//g,'-')}.pdf`);
}