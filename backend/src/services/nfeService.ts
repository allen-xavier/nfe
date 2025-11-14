import fs from "fs/promises";
import path from "path";
import { query } from "../db";
import { generateDanfe } from "./pdfService";
import { resolveCfop } from "../utils/cfop";
import { incrementNumeroNota } from "./empresaService";
import { create } from "xmlbuilder2";
import { gerarChaveAcesso } from "../utils/chaveAcesso";
import { autorizarNotaSefaz, consultarRecibo, AutorizacaoResponse } from "./sefazService";

const storageXml = path.resolve(__dirname, "../../storage/xml");
const storagePdf = path.resolve(__dirname, "../../storage/pdf");

export interface EmitirNotaDTO {
  empresa_id?: number;
  destinatario: {
    nome: string;
    cpf: string;
    endereco: string;
    uf: string;
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
    uf: string;
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

  const xmlBuilder = create({ version: "1.0", encoding: "UTF-8" })
    .ele("NFe", { xmlns: "http://www.portalfiscal.inf.br/nfe" });
  const infNFe = xmlBuilder.ele("infNFe", {
    Id: `NFe${chave_acesso}`,
    versao: "4.00",
  });

  const dest = infNFe.ele("dest");
  dest.ele("xNome").txt(dto.destinatario.nome);
  dest.ele("CPF").txt(dto.destinatario.cpf);
  const enderDest = dest.ele("enderDest");
  enderDest.ele("UF").txt(dto.destinatario.uf);
  enderDest.ele("xLgr").txt(dto.destinatario.endereco);

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
