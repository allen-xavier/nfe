import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { query } from "../db";
import { generateDanfe } from "./pdfService";
import { resolveCfop } from "../utils/cfop";
import { incrementNumeroNota } from "./empresaService";
import { create } from "xmlbuilder2";
import { gerarChaveAcesso, UF_CODES } from "../utils/chaveAcesso";
import { resolveMunicipioPorCep } from "../utils/cep";
import { autorizarNotaSefaz, consultarRecibo, AutorizacaoResponse } from "./sefazService";

const storageXml = path.resolve(__dirname, "../../storage/xml");
const storagePdf = path.resolve(__dirname, "../../storage/pdf");

const sanitizeDigits = (value?: string) => (value ?? "").replace(/\D/g, "");

const formatMunicipioCode = (value: string) => value.padStart(7, "0");

const formatDateTime = (date: Date) => {
  const pad = (value: number) => value.toString().padStart(2, "0");
  const timezoneOffsetMinutes = date.getTimezoneOffset();
  const offsetSign = timezoneOffsetMinutes <= 0 ? "+" : "-";
  const absOffset = Math.abs(timezoneOffsetMinutes);
  const hours = Math.floor(absOffset / 60);
  const minutes = absOffset % 60;
  const timezone = `${offsetSign}${pad(hours)}:${pad(minutes)}`;
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}${timezone}`;
};

const normalizeCrtCode = (value?: string) => {
  if (!value) {
    return "1";
  }
  const digits = value.replace(/\D/g, "");
  if (["1", "2", "3"].includes(digits)) {
    return digits;
  }
  const lower = value.toLowerCase();
  if (lower.includes("simples")) {
    return "1";
  }
  if (lower.includes("presumido")) {
    return "2";
  }
  if (lower.includes("real")) {
    return "3";
  }
  return "1";
};

const padNumber = (value: number | string, length: number) => `${value}`.padStart(length, "0");

const normalizeUf = (uf?: string) => (uf ?? "MG").toUpperCase();

const getTpAmb = () => (process.env.SEFAZ_AMBIENTE === "producao" ? "1" : "2");

export interface EmitirNotaDTO {
  empresa_id?: number;
  destinatario: {
    nome: string;
    cpf: string;
    endereco: string;
    uf: string;
    cidade: string;
    cep: string;
    numero: string;
    bairro: string;
  };
  itens: {
    descricao: string;
    ncm: string;
    quantidade: number;
    valor_unitario: number;
  }[];
  transporte?: {
    modFrete?: number;
  };
}

export const emitirNota = async (
  empresa: {
    id: number;
    razao_social: string;
    nome_fantasia: string;
    uf: string;
    cidade: string;
    endereco: string;
    cep: string;
    ie: string;
    crt: string;
    numero_atual_nfe: number;
    serie_nfe: number;
    cnpj: string;
  },
  certificado: {
    pfx: Buffer | string;
    senha: string;
  },
  dto: EmitirNotaDTO
) => {
  const nextNumero = await incrementNumeroNota(empresa.id);
  const itensComCfop = dto.itens.map((item) => {
    const cfop = resolveCfop(empresa.uf, dto.destinatario.uf);
    return {
      ...item,
      cfop,
      total_item: item.quantidade * item.valor_unitario,
    };
  });
  const total = itensComCfop.reduce((sum, item) => sum + item.total_item, 0);
  const chave_acesso = gerarChaveAcesso({
    cnpj: empresa.cnpj,
    serie: empresa.serie_nfe,
    numero: nextNumero,
    uf: empresa.uf,
    formaEmissao: process.env.NFE_FORMA_EMISSAO ?? "1",
  });

  const emitterMunicipio = await resolveMunicipioPorCep(empresa.cep);
  const destinatarioMunicipio = await resolveMunicipioPorCep(dto.destinatario.cep);
  const emitenteUf = normalizeUf(empresa.uf);
  const destinatarioUf = normalizeUf(dto.destinatario.uf);
  const tpAmb = getTpAmb();
  const agora = new Date();
  const cUF = padNumber(UF_CODES[emitenteUf] ?? UF_CODES["MG"], 2);
  const cNF = padNumber(crypto.randomInt(0, 100000000), 8);
  const dhEmi = formatDateTime(agora);
  const dhSaiEnt = dhEmi;
  const destinoInterno = emitenteUf === destinatarioUf;
  const cDV = chave_acesso.slice(-1);
  const verProc = process.env.APP_VERSION ?? process.env.npm_package_version ?? "1.0.0";

  const MAX_ID_LOTE = 281_474_976_710_655;
  const idLote = padNumber(crypto.randomInt(1, MAX_ID_LOTE + 1), 15);
  const xmlBuilder = create({ version: "1.0", encoding: "UTF-8" })
    .ele("enviNFe", { versao: "4.00", xmlns: "http://www.portalfiscal.inf.br/nfe" });
  xmlBuilder.ele("idLote").txt(idLote);
  xmlBuilder.ele("indSinc").txt("0");
  const NFe = xmlBuilder.ele("NFe");
  const infNFe = NFe.ele("infNFe", {
    Id: `NFe${chave_acesso}`,
    versao: "4.00",
  });

  const ide = infNFe.ele("ide");
  ide.ele("cUF").txt(cUF);
  ide.ele("cNF").txt(cNF);
  ide.ele("natOp").txt("VENDA DE MERCADORIA");
  ide.ele("mod").txt(process.env.NFE_MODELO ?? "55");
  ide.ele("serie").txt(empresa.serie_nfe.toString());
  ide.ele("nNF").txt(nextNumero.toString());
  ide.ele("dhEmi").txt(dhEmi);
  ide.ele("dhSaiEnt").txt(dhSaiEnt);
  ide.ele("tpNF").txt("1");
  ide.ele("idDest").txt(destinoInterno ? "1" : "2");
  ide.ele("cMunFG").txt(formatMunicipioCode(emitterMunicipio));
  ide.ele("tpImp").txt("1");
  ide.ele("tpEmis").txt(process.env.NFE_FORMA_EMISSAO ?? "1");
  ide.ele("cDV").txt(cDV);
  ide.ele("tpAmb").txt(tpAmb);
  ide.ele("finNFe").txt("1");
  ide.ele("indFinal").txt("0");
  ide.ele("indPres").txt("2");
  ide.ele("procEmi").txt("0");
  ide.ele("verProc").txt(verProc);

  const emit = infNFe.ele("emit");
  emit.ele("CNPJ").txt(sanitizeDigits(empresa.cnpj));
  emit.ele("xNome").txt(empresa.razao_social);
  emit.ele("xFant").txt(empresa.nome_fantasia ?? empresa.razao_social);
  emit.ele("IE").txt(empresa.ie);
  emit.ele("CRT").txt(normalizeCrtCode(empresa.crt));
  const enderEmit = emit.ele("enderEmit");
  enderEmit.ele("xLgr").txt(empresa.endereco);
  enderEmit.ele("nro").txt("S/N");
  enderEmit.ele("xBairro").txt("Centro");
  enderEmit.ele("xMun").txt(empresa.cidade);
  enderEmit.ele("UF").txt(emitenteUf);
  enderEmit.ele("CEP").txt(sanitizeDigits(empresa.cep));
  enderEmit.ele("cMun").txt(formatMunicipioCode(emitterMunicipio));
  enderEmit.ele("cPais").txt("1058");
  enderEmit.ele("xPais").txt("BRASIL");

  const dest = infNFe.ele("dest");
  dest.ele("xNome").txt(dto.destinatario.nome);
  dest.ele("CPF").txt(sanitizeDigits(dto.destinatario.cpf));
  const enderDest = dest.ele("enderDest");
  enderDest.ele("xLgr").txt(dto.destinatario.endereco);
  enderDest.ele("nro").txt(dto.destinatario.numero?.trim() || "S/N");
  enderDest.ele("xBairro").txt(dto.destinatario.bairro?.trim() || "Centro");
  enderDest.ele("xMun").txt(dto.destinatario.cidade);
  enderDest.ele("UF").txt(destinatarioUf);
  enderDest.ele("CEP").txt(sanitizeDigits(dto.destinatario.cep));
  enderDest.ele("cMun").txt(formatMunicipioCode(destinatarioMunicipio));
  enderDest.ele("cPais").txt("1058");
  enderDest.ele("xPais").txt("BRASIL");

  itensComCfop.forEach((item, index) => {
    const det = infNFe.ele("det", { nItem: (index + 1).toString().padStart(2, "0") });
    const prod = det.ele("prod");
    prod.ele("xProd").txt(item.descricao);
    prod.ele("NCM").txt(item.ncm);
    prod.ele("CFOP").txt(item.cfop);
    prod.ele("uCom").txt("un");
    prod.ele("qCom").txt(item.quantidade.toString());
    prod.ele("vUnCom").txt(item.valor_unitario.toFixed(2));
    prod.ele("vProd").txt(item.total_item.toFixed(2));
    det.ele("imposto")
      .ele("ICMS")
      .ele("ICMS00")
      .ele("orig")
      .txt("0")
      .up()
      .ele("CST")
      .txt("00")
      .up()
      .up()
      .up();
  });

  const totalTag = infNFe.ele("total");
  const icmsTot = totalTag.ele("ICMSTot");
  icmsTot.ele("vBC").txt("0.00");
  icmsTot.ele("vICMS").txt("0.00");
  icmsTot.ele("vProd").txt(total.toFixed(2));
  icmsTot.ele("vNF").txt(total.toFixed(2));

  const xml = xmlBuilder.end({ prettyPrint: true });

  await fs.writeFile(path.join(storageXml, `${chave_acesso}.xml`), xml, { encoding: "utf8" });

  const certificadoBuffer = Buffer.isBuffer(certificado.pfx) ? certificado.pfx : Buffer.from(certificado.pfx);
  const footer = await autorizarNotaSefaz(xml, chave_acesso, certificadoBuffer, certificado.senha, empresa.uf);
  let finalStatus: AutorizacaoResponse = footer;
  if (footer.status === "PENDENTE" && footer.recibo) {
    finalStatus = await consultarRecibo(footer.recibo, certificadoBuffer, certificado.senha, empresa.uf);
  }
  const statusDb = finalStatus.status === "AUTORIZADA" ? "AUTORIZADA" : "REJEITADA";
  const protocolo = finalStatus.protocolo ?? footer.protocolo;
  const motivo = finalStatus.motivo ?? footer.motivo;
  const recibo = finalStatus.recibo ?? footer.recibo;

  const notaResult = await query(
    `INSERT INTO notas_fiscais (
      empresa_id, chave_acesso, protocolo, recibo, numero, serie, destinatario_nome, destinatario_cpf,
      destinatario_endereco, destinatario_uf, total, xml_autorizado, status, codigo_rejeicao,
      mensagem_rejeicao, criado_em
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,NOW())
    RETURNING *`,
    [
      empresa.id,
      chave_acesso,
      protocolo,
      recibo,
      nextNumero,
      empresa.serie_nfe,
      dto.destinatario.nome,
      dto.destinatario.cpf,
      dto.destinatario.endereco,
      dto.destinatario.uf,
      total,
      Buffer.from(xml),
      statusDb,
      statusDb === "REJEITADA" ? finalStatus.motivo : null,
      statusDb === "REJEITADA" ? finalStatus.motivo : null,
    ]
  );

  const nota = notaResult.rows[0];
  for (const item of itensComCfop) {
    await query(
      `INSERT INTO itens_nota (
        nota_id, descricao, ncm, cfop, quantidade, valor_unitario, csosn, total_item
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [nota.id, item.descricao, item.ncm, item.cfop, item.quantidade, item.valor_unitario, "102", item.total_item]
    );
  }

  const pdf = await generateDanfe({
    empresa: empresa.razao_social,
    destinatario: dto.destinatario.nome,
    cpf: dto.destinatario.cpf,
    uf: dto.destinatario.uf,
    total,
    chave_acesso,
    itens: itensComCfop,
  });

  await fs.writeFile(path.join(storagePdf, `${nota.id}.pdf`), pdf);

  return {
    status: nota.status,
    pdf_path: path.join(storagePdf, `${nota.id}.pdf`),
    chave_acesso,
    total,
  };
};

export const buscarPDF = async (notaId: number) => {
  const caminho = path.join(storagePdf, `${notaId}.pdf`);
  return caminho;
};

export const findNotaFiscal = async (id: number) => {
  const result = await query("SELECT * FROM notas_fiscais WHERE id = $1", [id]);
  return result.rows[0];
};
