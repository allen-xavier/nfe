import https from "https";
import axios from "axios";
import { XMLParser } from "fast-xml-parser";
import { DOMParser } from "xmldom";
import { SignedXml, FileKeyInfo } from "xml-crypto";
import { parsePfx, Certificado } from "../utils/certificado";
import { UF_CODES } from "../utils/chaveAcesso";

type SefazServiceEndpoints = {
  autorizacao: string;
  recibo: string;
};

const SEFAZ_ENDPOINTS: Record<string, { homologacao: SefazServiceEndpoints; producao: SefazServiceEndpoints }> = {
  MG: {
    homologacao: {
      autorizacao: "https://hnfe.fazenda.mg.gov.br/nfe2/services/NFeAutorizacao4",
      recibo: "https://hnfe.fazenda.mg.gov.br/nfe2/services/NFeRetAutorizacao4",
    },
    producao: {
      autorizacao: "https://nfe.fazenda.mg.gov.br/nfe2/services/NFeAutorizacao4",
      recibo: "https://nfe.fazenda.mg.gov.br/nfe2/services/NFeRetAutorizacao4",
    },
  },
  SP: {
    homologacao: {
      autorizacao: "https://nfe.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx",
      recibo: "https://nfe.fazenda.sp.gov.br/ws/nferetautorizacao4.asmx",
    },
    producao: {
      autorizacao: "https://nfe.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx",
      recibo: "https://nfe.fazenda.sp.gov.br/ws/nferetautorizacao4.asmx",
    },
  },
  RS: {
    homologacao: {
      autorizacao: "https://nfe.sefazrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx",
      recibo: "https://nfe.sefazrs.rs.gov.br/ws/NfeRetAutorizacao/NFeRetAutorizacao4.asmx",
    },
    producao: {
      autorizacao: "https://nfe.sefazrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx",
      recibo: "https://nfe.sefazrs.rs.gov.br/ws/NfeRetAutorizacao/NFeRetAutorizacao4.asmx",
    },
  },
  BA: {
    homologacao: {
      autorizacao: "https://nfe.sefaz.ba.gov.br/webservices/NFeAutorizacao4/NFeAutorizacao4.asmx",
      recibo: "https://nfe.sefaz.ba.gov.br/webservices/NFeRetAutorizacao4/NFeRetAutorizacao4.asmx",
    },
    producao: {
      autorizacao: "https://nfe.sefaz.ba.gov.br/webservices/NFeAutorizacao4/NFeAutorizacao4.asmx",
      recibo: "https://nfe.sefaz.ba.gov.br/webservices/NFeRetAutorizacao4/NFeRetAutorizacao4.asmx",
    },
  },
  PR: {
    homologacao: {
      autorizacao: "https://nfe.sefa.pr.gov.br/nfe/NFeAutorizacao4?wsdl",
      recibo: "https://nfe.sefa.pr.gov.br/nfe/NFeRetAutorizacao4?wsdl",
    },
    producao: {
      autorizacao: "https://nfe.sefa.pr.gov.br/nfe/NFeAutorizacao4?wsdl",
      recibo: "https://nfe.sefa.pr.gov.br/nfe/NFeRetAutorizacao4?wsdl",
    },
  },
  PE: {
    homologacao: {
      autorizacao: "https://nfe.sefaz.pe.gov.br/nfe-service/services/NFeAutorizacao4",
      recibo: "https://nfe.sefaz.pe.gov.br/nfe-service/services/NFeRetAutorizacao4",
    },
    producao: {
      autorizacao: "https://nfe.sefaz.pe.gov.br/nfe-service/services/NFeAutorizacao4",
      recibo: "https://nfe.sefaz.pe.gov.br/nfe-service/services/NFeRetAutorizacao4",
    },
  },
  GO: {
    homologacao: {
      autorizacao: "https://nfe.sefaz.go.gov.br/nfe/services/NFeAutorizacao4?wsdl",
      recibo: "https://nfe.sefaz.go.gov.br/nfe/services/NFeRetAutorizacao4?wsdl",
    },
    producao: {
      autorizacao: "https://nfe.sefaz.go.gov.br/nfe/services/NFeAutorizacao4?wsdl",
      recibo: "https://nfe.sefaz.go.gov.br/nfe/services/NFeRetAutorizacao4?wsdl",
    },
  },
  MS: {
    homologacao: {
      autorizacao: "https://nfe.sefaz.ms.gov.br/ws/NFeAutorizacao4",
      recibo: "https://nfe.sefaz.ms.gov.br/ws/NFeRetAutorizacao4",
    },
    producao: {
      autorizacao: "https://nfe.sefaz.ms.gov.br/ws/NFeAutorizacao4",
      recibo: "https://nfe.sefaz.ms.gov.br/ws/NFeRetAutorizacao4",
    },
  },
  MT: {
    homologacao: {
      autorizacao: "https://nfe.sefaz.mt.gov.br/nfews/v2/services/NfeAutorizacao4?wsdl",
      recibo: "https://nfe.sefaz.mt.gov.br/nfews/v2/services/NfeRetAutorizacao4?wsdl",
    },
    producao: {
      autorizacao: "https://nfe.sefaz.mt.gov.br/nfews/v2/services/NfeAutorizacao4?wsdl",
      recibo: "https://nfe.sefaz.mt.gov.br/nfews/v2/services/NfeRetAutorizacao4?wsdl",
    },
  },
  AM: {
    homologacao: {
      autorizacao: "https://nfe.sefaz.am.gov.br/services2/services/NfeAutorizacao4",
      recibo: "https://nfe.sefaz.am.gov.br/services2/services/NfeRetAutorizacao4",
    },
    producao: {
      autorizacao: "https://nfe.sefaz.am.gov.br/services2/services/NfeAutorizacao4",
      recibo: "https://nfe.sefaz.am.gov.br/services2/services/NfeRetAutorizacao4",
    },
  },
  SVAN: {
    homologacao: {
      autorizacao: "https://www.sefazvirtual.fazenda.gov.br/NFeAutorizacao4/NFeAutorizacao4.asmx",
      recibo: "https://www.sefazvirtual.fazenda.gov.br/NFeRetAutorizacao4/NFeRetAutorizacao4.asmx",
    },
    producao: {
      autorizacao: "https://www.sefazvirtual.fazenda.gov.br/NFeAutorizacao4/NFeAutorizacao4.asmx",
      recibo: "https://www.sefazvirtual.fazenda.gov.br/NFeRetAutorizacao4/NFeRetAutorizacao4.asmx",
    },
  },
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  ignoreDeclaration: true,
  removeNSPrefix: true,
});

export interface AutorizacaoResponse {
  status: "AUTORIZADA" | "REJEITADA" | "PENDENTE";
  protocolo?: string;
  recibo?: string;
  motivo?: string;
}

const getAmbiente = () => (process.env.SEFAZ_AMBIENTE ?? "homologacao") === "producao" ? "producao" : "homologacao";

const normalizeUf = (uf?: string) => (uf ?? "SVAN").toUpperCase();

const getEndpointFor = (uf: string, key: "autorizacao" | "recibo") => {
  const ambiente = getAmbiente();
  const normalized = normalizeUf(uf);
  const entry = SEFAZ_ENDPOINTS[normalized] ?? SEFAZ_ENDPOINTS["SVAN"];
  return entry[ambiente][key];
};

const padNumber = (value: number, length: number) => `${value}`.padStart(length, "0");

const buildCabecMsg = (uf: string) => {
  const normalized = normalizeUf(uf);
  const cUF = UF_CODES[normalized] ?? UF_CODES["MG"];
  const versaoDados = process.env.SEFAZ_VERSAO_DADOS ?? "4.00";
  return `<nfeCabecMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NfeAutorizacao"><cUF>${padNumber(
    cUF,
    2
  )}</cUF><versaoDados>${versaoDados}</versaoDados></nfeCabecMsg>`;
};

const normalizePem = (pem: string) => pem.replace(/-----BEGIN CERTIFICATE-----|-----END CERTIFICATE-----|\n/g, "");

const SOAP_ACTION_LOTE = "http://www.portalfiscal.inf.br/nfe/wsdl/NfeAutorizacao/NfeAutorizacaoLote";
const SOAP_ACTION_RECIBO = "http://www.portalfiscal.inf.br/nfe/wsdl/NfeAutorizacao/NFeRetAutorizacaoLote";

const buildAutorizacaoBody = (payload: string) => `
    <nfe:nfeAutorizacaoLote xmlns:nfe="http://www.portalfiscal.inf.br/nfe/wsdl/NfeAutorizacao">
      <nfe:nfeDadosMsg>
        ${payload}
      </nfe:nfeDadosMsg>
    </nfe:nfeAutorizacaoLote>`;

const buildSoapEnvelope = (cabecMsg: string, bodyContent: string) => `
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:nfe="http://www.portalfiscal.inf.br/nfe/wsdl/NfeAutorizacao">
      <soapenv:Header>
        ${cabecMsg}
      </soapenv:Header>
      <soapenv:Body>
        ${bodyContent}
      </soapenv:Body>
    </soapenv:Envelope>`;

class CertKeyInfo implements FileKeyInfo {
  public file = "";
  constructor(private certPem: string, private keyPem: string) {}
  getKeyInfo(/* key: any */) {
    return `<X509Data><X509Certificate>${normalizePem(this.certPem)}</X509Certificate></X509Data>`;
  }
  getKey() {
    return Buffer.from(this.keyPem);
  }
}

const signXml = (xml: string, cert: Certificado): string => {
  const doc = new DOMParser().parseFromString(xml);
  const signed = new SignedXml();
  signed.addReference("//*[local-name()='infNFe']", ["http://www.w3.org/2000/09/xmldsig#enveloped-signature"], "http://www.w3.org/2001/04/xmlenc#sha256");
  signed.signingKey = cert.keyPem;
  signed.keyInfoProvider = new CertKeyInfo(cert.certPem, cert.keyPem);
  signed.computeSignature(xml, {
    location: { reference: "//*[local-name()='infNFe']", action: "append" },
  });
  const signatureXml = signed.getSignedXml();
  return signatureXml;
};

const parseSoapResponse = (xml: string) => {
  const parsed = parser.parse(xml);
  const retorno = parsed.Envelope?.Body?.nfeResultMsg?.retEnviNFe;
  if (!retorno) {
    return null;
  }
  const cStat = Number(retorno.infRec?.cStat ?? retorno.cStat);
  const xMotivo = retorno.infRec?.xMotivo ?? retorno.xMotivo;
  const nRec = retorno.infRec?.nRec;
  const protocol = retorno.protNFe?.infProt?.nProt;
  return {
    cStat,
    xMotivo,
    nRec,
    protocol,
  };
};

const logSoapResponse = (label: string, endpoint: string, parsed: ReturnType<typeof parseSoapResponse> | null) => {
  if (!parsed) {
    console.warn(`[SEFAZ ${label}] ${endpoint} responded without retEnviNFe`);
    return;
  }
  console.info(
    `[SEFAZ ${label}] ${endpoint} cStat=${parsed.cStat} motivo=${parsed.xMotivo ?? "sem motivo"} nRec=${parsed.nRec ?? "-"} protocolo=${parsed.protocol ?? "-"}`
  );
};

export const autorizarNotaSefaz = async (
  xml: string,
  chNFe: string,
  certificado: Buffer,
  senha: string,
  uf: string
): Promise<AutorizacaoResponse> => {
  const cert = parsePfx(certificado, senha);
  const signedXml = signXml(xml, cert);
  const payload = signedXml.replace(/^<\?xml.*?\?>\s*/i, "");
  const cabecMsg = buildCabecMsg(uf);
  const body = buildAutorizacaoBody(payload);
  const endpoint = getEndpointFor(uf, "autorizacao");
  const envelope = buildSoapEnvelope(cabecMsg, body);
  const response = await axios.post(endpoint, envelope, {
    headers: {
      "Content-Type": "text/xml; charset=UTF-8",
      SOAPAction: SOAP_ACTION_LOTE,
    },
    httpsAgent: new https.Agent({
      cert: cert.certPem,
      key: cert.keyPem,
      passphrase: senha,
      rejectUnauthorized: false,
    }),
    timeout: 120000,
  });

  const parsed = parseSoapResponse(response.data);
  if (!parsed) {
    throw new Error("Resposta inválida da SEFAZ");
  }
  logSoapResponse("Autorizacao", endpoint, parsed);

  if (parsed.cStat >= 100 && parsed.cStat < 200) {
    return {
      status: "PENDENTE",
      recibo: parsed.nRec,
      motivo: parsed.xMotivo,
    };
  }

  if (parsed.cStat === 100) {
    return {
      status: "AUTORIZADA",
      protocolo: parsed.protocol,
    };
  }

  return {
    status: "REJEITADA",
    motivo: parsed.xMotivo,
  };
};

export const consultarRecibo = async (recibo: string, certificado: Buffer, senha: string, uf: string): Promise<AutorizacaoResponse> => {
  const cert = parsePfx(certificado, senha);
  const cabecMsg = buildCabecMsg(uf);
  const payload = `
    <ret:nfeDadosMsg xmlns:ret="http://www.portalfiscal.inf.br/nfe/wsdl/NFeRetAutorizacao4">
      <consReciNFe versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe">
        <tpAmb>${process.env.SEFAZ_AMBIENTE === "producao" ? "1" : "2"}</tpAmb>
        <nRec>${recibo}</nRec>
      </consReciNFe>
    </ret:nfeDadosMsg>`;
  const endpoint = getEndpointFor(uf, "recibo");
  const response = await axios.post(endpoint, buildSoapEnvelope(cabecMsg, payload), {
    headers: {
      "Content-Type": "text/xml; charset=UTF-8",
      SOAPAction: SOAP_ACTION_RECIBO,
    },
    httpsAgent: new https.Agent({
      cert: cert.certPem,
      key: cert.keyPem,
      passphrase: senha,
      rejectUnauthorized: false,
    }),
    timeout: 120000,
  });

  const parsed = parseSoapResponse(response.data);
  if (!parsed) {
    throw new Error("Resposta inválida da SEFAZ");
  }
  logSoapResponse("Recibo", endpoint, parsed);

  if (parsed.cStat === 100) {
    return {
      status: "AUTORIZADA",
      protocolo: parsed.protocol,
    };
  }

  return {
    status: "REJEITADA",
    motivo: parsed.xMotivo ?? "Recibo não autorizado",
  };
};
