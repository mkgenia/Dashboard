
export interface CatastroData {
  referencia: string;
  ano_construccion: number;
  metros_construidos: number;
  metros_utiles?: number;
  metros_comunes?: number;
  superficie_grafica?: number;
  uso?: string;
  coeficiente?: string;
  habitaciones?: number;
  banos?: number;
  tipo_via: string;
  calle: string;
  numero: string;
  piso?: string;
  puerta?: string;
  escalera?: string;
  ciudad: string;
  provincia: string;
}

export interface CatastroUnit {
  escalera: string;
  planta: string;
  puerta: string;
  referencia: string;
}

export const catastroService = {
  // Busca las unidades disponibles en un edificio real usando el servicio web de la OVC
  getUnitsByAddress: async (calle: string, numero: string, ciudad: string, provincia: string, siglaInput?: string): Promise<CatastroUnit[]> => {
    const normalize = (str: string) => {
      if (!str) return "";
      return str.toUpperCase()
        .replace(/[ÁÀÄ]/g, "A")
        .replace(/[ÉÈË]/g, "E")
        .replace(/[ÍÌÏ]/g, "I")
        .replace(/[ÓÒÖ]/g, "O")
        .replace(/[ÚÙÜ]/g, "U")
        .replace(/Ç/g, "C")
        .trim();
    };

    const ciudadNorm = normalize(ciudad);
    let provinciaNorm = normalize(provincia || ciudad);

    if (provinciaNorm.includes("COMUNITAT VALENCIANA") || provinciaNorm.includes("COMUNIDAD")) {
      provinciaNorm = ciudadNorm;
    }

    const ejecutarConsulta = async (c: string, s: string = "") => {
      const url = `/ovc-api/ovcservweb/OVCSWLocalizacionRC/OVCCallejero.asmx/Consulta_DNPLOC?Provincia=${provinciaNorm}&Municipio=${ciudadNorm}&Sigla=${s}&Calle=${encodeURIComponent(c)}&Numero=${numero}&Bloque=&Escalera=&Planta=&Puerta=`;

      const res = await fetch(url);
      if (!res.ok) throw new Error(`OVC Error ${res.status}`);
      const text = await res.text();

      if (text.includes("LA VÍA NO EXISTE") || text.includes("<err>")) {
        throw new Error("VIA_NOT_FOUND");
      }
      return text;
    };

    try {
      let xmlText: string = "";
      const normalizedCalle = normalize(calle);
      const originalCalle = calle.toUpperCase().trim();
      
      // Eliminamos artículos y títulos comunes para sacar el "núcleo" de la calle
      const coreName = normalizedCalle
        .replace(/^(DOCTOR |DR |DRA |PROFESOR |PROF |MAESTRO |MTRO |GENERAL |GEN |ALMIRANTE |ALM |PINTOR |ESCULTOR )/i, "")
        .replace(/^(DE LA |DE LOS |DE LAS |DEL |DE |EL |LA |LOS |LAS )/i, "")
        .trim();

      const combinaciones = [
        { c: normalizedCalle, s: siglaInput || "CL" }, 
        { c: coreName, s: siglaInput || "CL" },       
        { c: "DR " + coreName, s: siglaInput || "CL" }, 
        { c: "DOCTOR " + coreName, s: siglaInput || "CL" }, 
        { c: originalCalle, s: siglaInput || "CL" },   
      ];

      for (const combo of combinaciones) {
        try {
          console.log(`📡 Intentando variante OVC: ${combo.s} ${combo.c}`);
          const result = await ejecutarConsulta(combo.c, combo.s);
          if (result) {
            xmlText = result;
            break;
          }
        } catch (e) {
          if (combo === combinaciones[combinaciones.length - 1]) throw e;
          continue;
        }
      }

      if (!xmlText) throw new Error("No se pudo obtener respuesta del Catastro");

      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, "text/xml");
      
      let biElements = Array.from(xmlDoc.getElementsByTagName("bi"));
      if (biElements.length === 0) {
        biElements = Array.from(xmlDoc.querySelectorAll('rc, pc, rca')).map(el => el.parentElement as Element).filter(el => el !== null);
      }

      const units: CatastroUnit[] = [];
      console.log(`📦 Procesando ${biElements.length} posibles unidades del XML...`);

      for (let i = 0; i < biElements.length; i++) {
        const bi = biElements[i];
        const rc = bi.getElementsByTagName("rc")[0]?.textContent || 
                   bi.parentElement?.getElementsByTagName("rc")[0]?.textContent || "";
        
        const es = bi.getElementsByTagName("es")[0]?.textContent || "";
        const pt = bi.getElementsByTagName("pt")[0]?.textContent || "";
        const pu = bi.getElementsByTagName("pu")[0]?.textContent || "";

        if (rc) {
          units.push({ 
            escalera: es.trim(), 
            planta: pt.trim(), 
            puerta: pu.trim(), 
            referencia: rc.trim() 
          });
        }
      }

      if (units.length === 0) {
        const pc1 = xmlDoc.getElementsByTagName("pc1")[0]?.textContent || "";
        const pc2 = xmlDoc.getElementsByTagName("pc2")[0]?.textContent || "";
        if (pc1 && pc2) {
          units.push({ escalera: "", planta: "Única", puerta: "", referencia: pc1 + pc2 });
        }
      }

      return units;
    } catch (error) {
      console.error('Error al conectar con la OVC:', error);
      throw error;
    }
  },

  getUnitDetails: async (referencia: string, municipio: string = 'VALENCIA', provincia: string = 'VALENCIA'): Promise<Partial<CatastroData>> => {
    try {
      const url = `/ovc-api/ovcservweb/OVCSWLocalizacionRC/OVCCallejero.asmx/Consulta_DNPRC?Provincia=${encodeURIComponent(provincia)}&Municipio=${encodeURIComponent(municipio)}&RC=${referencia}`;
      const response = await fetch(url);
      const xmlText = await response.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, "text/xml");

      const bi = xmlDoc.getElementsByTagName("bi")[0];
      const debi = bi?.getElementsByTagName("debi")[0];

      // Año construcción
      const ant = debi?.getElementsByTagName("ant")[0]?.textContent || 
                  xmlDoc.getElementsByTagName("ant")[0]?.textContent || "0";

      // Superficie construida
      const scons = debi?.getElementsByTagName("sfc")[0]?.textContent || 
                    xmlDoc.getElementsByTagName("ssum")[0]?.textContent || "0";
      
      // Superficie parcela
      const superficieGrafica = xmlDoc.getElementsByTagName("ssum")[0]?.textContent || 
                                xmlDoc.getElementsByTagName("spt")[0]?.textContent || "0";

      // Metros útiles de la unidad
      const lcons = xmlDoc.getElementsByTagName("lcons")[0];
      const consArr = Array.from(lcons?.getElementsByTagName("cons") || []);
      
      let metrosUtilesCalculados = 0;
      consArr.forEach(c => {
        const usoCons = c.getElementsByTagName("luso")[0]?.textContent || "";
        const metros = parseInt(c.getElementsByTagName("qcons")[0]?.textContent || 
                               c.getElementsByTagName("stl")[0]?.textContent || "0");
        if (usoCons.toUpperCase().includes("VIVIENDA") || usoCons.toUpperCase().includes("RESIDENCIAL")) {
          metrosUtilesCalculados += metros;
        }
      });

      const metrosConstruidos = parseInt(scons) || metrosUtilesCalculados || 0;
      const metrosUtiles = metrosUtilesCalculados > 0 ? metrosUtilesCalculados : Math.round(metrosConstruidos * 0.9);

      // Predicciones basadas en metros
      let habitaciones = 0;
      let banos = 1;
      if (metrosUtiles > 45) habitaciones = 1;
      if (metrosUtiles > 65) habitaciones = 2;
      if (metrosUtiles > 85) { habitaciones = 3; banos = 2; }
      if (metrosUtiles > 120) habitaciones = 4;

      return {
        referencia: referencia,
        metros_construidos: metrosConstruidos,
        metros_utiles: metrosUtiles,
        ano_construccion: parseInt(ant),
        superficie_grafica: parseInt(superficieGrafica),
        uso: debi?.getElementsByTagName("luso")[0]?.textContent || "RESIDENCIAL",
        habitaciones,
        banos
      };
    } catch (error) {
      console.error('Error detalles RC:', error);
      throw error;
    }
  },

  getVias: async (provincia: string, municipio: string, query: string): Promise<{sigla: string, nombre: string, city: string, state: string, label: string, key: string}[]> => {
    const cityBias = municipio || 'VALENCIA';
    const stateBias = provincia || 'VALENCIA';
    
    try {
      const urlOvc = `/ovc-api/ovcservweb/OVCSWLocalizacionRC/OVCCallejero.asmx/Consulta_DNPLOCVias?Provincia=${encodeURIComponent(stateBias)}&Municipio=${encodeURIComponent(cityBias)}&TipoVia=&NombreVia=${encodeURIComponent(query)}`;
      const res = await fetch(urlOvc);
      const xml = await res.text();
      const doc = new DOMParser().parseFromString(xml, "text/xml");
      let vias = Array.from(doc.querySelectorAll('vía, calle, lvia > *'));
      
      if (vias.length > 0) {
        return vias.map((via, idx) => {
          const sigla = via.querySelector('tv')?.textContent || "CL";
          const nombre = via.querySelector('nv')?.textContent || "";
          return {
            sigla: sigla,
            nombre: nombre.toUpperCase().trim(),
            city: cityBias,
            state: stateBias,
            label: `${sigla} ${nombre}`.toUpperCase(),
            key: `ovc-${idx}-${nombre}`
          };
        }).filter(v => v.nombre !== "");
      }
    } catch (e) {
      console.warn('Fallback OSM...');
    }

    try {
      const viewbox = "-0.5435,39.5534,-0.2796,39.3562"; 
      const urlOsm = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ' ' + cityBias)}&format=json&addressdetails=1&limit=8&countrycodes=es&viewbox=${viewbox}&bounded=0`;
      const res = await fetch(urlOsm, { headers: { 'User-Agent': 'GrupoHogares/1.0' } });
      const data = await res.json();
      
      const results = data.map((item: any, idx: number) => {
        const addr = item.address;
        const street = addr.road || addr.pedestrian || addr.suburb || addr.city_district || "";
        const city = addr.city || addr.town || addr.village || cityBias;
        
        let sigla = "CL";
        const lower = street.toLowerCase();
        if (lower.includes('avenida')) sigla = "AV";
        else if (lower.includes('plaza')) sigla = "PZ";
        else if (lower.includes('paseo')) sigla = "PS";

        const cleanName = street
          .replace(/^(Calle|Avenida|Plaza|Paseo|C\/|Avda\.)\s+/i, "")
          .replace(/^(DE LA |DE LOS |DE LAS |DEL |DE |EL |LA |LOS |LAS )/i, "")
          .toUpperCase()
          .trim();

        return {
          sigla,
          nombre: cleanName,
          city: city.toUpperCase(),
          state: (addr.state || stateBias).toUpperCase(),
          label: `${sigla} ${cleanName} (${city})`.toUpperCase(),
          key: `osm-${idx}-${cleanName}`
        };
      }).filter((v: any) => v.nombre !== "");

      const uniqueResults = [];
      const seen = new Set();
      for (const res of results) {
        const identifier = `${res.sigla}-${res.nombre}-${res.city}`;
        if (!seen.has(identifier)) {
          seen.add(identifier);
          uniqueResults.push(res);
        }
      }
      return uniqueResults;
    } catch (error) {
      return [];
    }
  },

  getNumeros: async (provincia: string, municipio: string, sigla: string, calle: string): Promise<string[]> => {
    const url = `/ovc-api/ovcservweb/OVCSWLocalizacionRC/OVCCallejero.asmx/Consulta_DNPLOC?Provincia=${encodeURIComponent(provincia)}&Municipio=${encodeURIComponent(municipio)}&Sigla=${sigla}&Calle=${encodeURIComponent(calle)}&Numero=&Bloque=&Escalera=&Planta=&Puerta=`;
    try {
      const res = await fetch(url);
      const xml = await res.text();
      const doc = new DOMParser().parseFromString(xml, "text/xml");
      const nums = doc.getElementsByTagName("num");
      const results = [];
      for (let i = 0; i < nums.length; i++) {
        const n = nums[i].getElementsByTagName("pnp")[0]?.textContent;
        if (n) results.push(n);
      }
      return results;
    } catch (error) {
      return [];
    }
  }
};
