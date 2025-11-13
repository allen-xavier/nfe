import fs from "fs/promises";
import path from "path";
import { query } from "../db";
import { generateDanfe } from "./pdfService";
import { resolveCfop } from "../utils/cfop";
import { incrementNumeroNota } from "./empresaService";
import { create } from "xmlbuilder2";

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

const montarChaveAcesso = (cnpj: string, numero: number, serie: number): string => {
  const data = new Date();
  const cnpjPadded = cnpj.padStart(14, "0");
  const anoMes = `${data.getFullYear().toString().slice(-2)}${("0" + (data.getMonth() + 1)).slice(-2)}`;
  const numeroPadded = numero.toString().padStart(9, "0");
  return `${anoMes}${cnpjPadded}${serie.toString().padStart(3, "0")}55${numeroPadded}12345678`; // Simplificado
};

export const emitirNota = async (
  empresa: { id: number; razao_social: string; uf: string; numero_atual_nfe: number; serie_nfe: number },
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
  const chave_acesso = montarChaveAcesso("00000000000000", nextNumero, empresa.serie_nfe);

  const xml = create({ version: "1.0", encoding: "UTF-8" })
    .ele("NFe")
    .ele("infNFe", {
      Id: `NFe${chave_acesso}`,
      versao: "4.00",
    })
    .ele("dest")
    .ele("xNome")
    .txt(dto.destinatario.nome)
    .up()
    .ele("CPF")
    .txt(dto.destinatario.cpf)
    .up()
    .ele("enderDest")
    .ele("UF")
    .txt(dto.destinatario.uf)
    .up()
    .ele("xLgr")
    .txt(dto.destinatario.endereco)
    .up()
    .up()
    .up()
    .up()
    .ele("det")
    .txt("Itens adicionados")
    .up()
    .up()
    .end({ prettyPrint: true });

  await fs.writeFile(path.join(storageXml, `${chave_acesso}.xml`), xml, { encoding: "utf8" });

  const notaResult = await query(
    `INSERT INTO notas_fiscais (
      empresa_id, chave_acesso, numero, serie, destinatario_nome, destinatario_cpf,
      destinatario_endereco, destinatario_uf, total, xml_autorizado, status, criado_em
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW())
    RETURNING *`,
    [
      empresa.id,
      chave_acesso,
      nextNumero,
      empresa.serie_nfe,
      dto.destinatario.nome,
      dto.destinatario.cpf,
      dto.destinatario.endereco,
      dto.destinatario.uf,
      total,
      Buffer.from(xml),
      "AUTORIZADA",
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
