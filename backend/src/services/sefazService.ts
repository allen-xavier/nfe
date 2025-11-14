import https from "https";
import axios from "axios";
import { XMLParser } from "fast-xml-parser";
import { DOMParser } from "xmldom";
import { SignedXml, FileKeyInfo } from "xml-crypto";
import { parsePfx, Certificado } from "../utils/certificado";

const HOMOLOG_ENDPOINT = "https://hnfews.sefazvirtual.fazenda.gov.br/ws/NFeAutorizacao4";
const PROD_ENDPOINT = "https://nfews.sefazvirtual.fazenda.gov.br/ws/NFeAutorizacao4";
const HOMOLOG_RET_ENDPOINT = "https://hnfews.sefazvirtual.fazenda.gov.br/ws/NFeRetAutorizacao4";
const PROD_RET_ENDPOINT = "https://nfews.sefazvirtual.fazenda.gov.br/ws/NFeRetAutorizacao4";

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

const getEndpoint = () => {
  const env = process.env.SEFAZ_AMBIENTE ?? "homologacao";
  return env === "producao" ? PROD_ENDPOINT : HOMOLOG_ENDPOINT;
};

const getReciboEndpoint = () => {
  const env = process.env.SEFAZ_AMBIENTE ?? "homologacao";
  return env === "producao" ? PROD_RET_ENDPOINT : HOMOLOG_RET_ENDPOINT;
};

const normalizePem = (pem: string) => pem.replace(/-----BEGIN CERTIFICATE-----|-----END CERTIFICATE-----|\n/g, "");

class CertKeyInfo implements FileKeyInfo {
  public file = "";
  constructor(private certPem: string, private keyPem: string) {}
  getKeyInfo(/* key: any */) {
    return `<X509Data><X509Certificate>${normalizePem(this.certPem)}</X509Certificate></X509Data>`;
  }
  getKey() {
    return this.keyPem;
  }
}

const buildSoapEnvelope = (signedXml: string) => {
  return `
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:nfe="http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4">
      <soapenv:Header/>
      <soapenv:Body>
        <nfe:nfeDadosMsg>
          ${signedXml}
        </nfe:nfeDadosMsg>
      </soapenv:Body>
    </soapenv:Envelope>`;
};

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

export const autorizarNotaSefaz = async (xml: string, chNFe: string, certificado: Buffer, senha: string): Promise<AutorizacaoResponse> => {
  const cert = parsePfx(certificado, senha);
  const signedXml = signXml(xml, cert);
  const envelope = buildSoapEnvelope(signedXml);

  const response = await axios.post(getEndpoint(), envelope, {
    headers: { "Content-Type": "text/xml; charset=UTF-8" },
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

export const consultarRecibo = async (recibo: string, certificado: Buffer, senha: string): Promise<AutorizacaoResponse> => {
  const cert = parsePfx(certificado, senha);
  const envelope = `
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ret="http://www.portalfiscal.inf.br/nfe/wsdl/NFeRetAutorizacao4">
      <soapenv:Header/>
      <soapenv:Body>
        <ret:nfeDadosMsg>
          <consReciNFe versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe">
            <tpAmb>${process.env.SEFAZ_AMBIENTE === "producao" ? "1" : "2"}</tpAmb>
            <nRec>${recibo}</nRec>
          </consReciNFe>
        </ret:nfeDadosMsg>
      </soapenv:Body>
    </soapenv:Envelope>`;

  const response = await axios.post(getReciboEndpoint(), envelope, {
    headers: { "Content-Type": "text/xml; charset=UTF-8" },
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
