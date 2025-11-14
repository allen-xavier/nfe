import { Request, Response } from "express";
import { EmitirNotaDTO, emitirNota, buscarPDF, findNotaFiscal } from "../services/nfeService";
import { findEmpresaByToken } from "../services/empresaService";
import { decrypt } from "../utils/security";

const extractToken = (header?: string) => header?.split(" ")[1];

export const emitirNotaController = async (req: Request, res: Response) => {
  try {
    const token = extractToken(req.headers.authorization);
    if (!token) {
      return res.status(401).json({ error: "Token obrigatório" });
    }

    const empresa = await findEmpresaByToken(token);
    if (!empresa) {
      return res.status(401).json({ error: "Empresa não encontrada" });
    }

    const payload: EmitirNotaDTO = req.body;
    payload.empresa_id = empresa.id;

    const certificadoSenha = decrypt(empresa.certificado_senha);
    const certificadoPfx = empresa.certificado_pfx;
    const result = await emitirNota(
      {
        id: empresa.id,
        razao_social: empresa.razao_social,
        nome_fantasia: empresa.nome_fantasia,
        uf: empresa.uf,
        cidade: empresa.cidade,
        endereco: empresa.endereco,
        cep: empresa.cep,
        ie: empresa.ie,
        crt: empresa.crt,
        numero_atual_nfe: empresa.numero_atual_nfe,
        serie_nfe: empresa.serie_nfe,
        cnpj: empresa.cnpj,
      },
      {
        pfx: certificadoPfx,
        senha: certificadoSenha,
      },
      payload
    );

    return res
      .status(200)
      .contentType("application/pdf")
      .sendFile(result.pdf_path, { headers: { "X-Chave-Acesso": result.chave_acesso } });
  } catch (error) {
    console.error("Erro ao emitir nota", error);
    return res.status(500).json({
      error: "Erro ao emitir nota fiscal.",
      detail: error instanceof Error ? error.message : undefined,
    });
  }
};

export const downloadPdfController = async (req: Request, res: Response) => {
  try {
    const token = extractToken(req.headers.authorization);
    if (!token) {
      return res.status(401).json({ error: "Token obrigatório" });
    }

    const empresa = await findEmpresaByToken(token);
    if (!empresa) {
      return res.status(401).json({ error: "Empresa não encontrada" });
    }

    const nota = await findNotaFiscal(Number(req.params.id));
    if (!nota || nota.empresa_id !== empresa.id) {
      return res.status(404).json({ error: "Nota não encontrada" });
    }

    const pdfPath = await buscarPDF(nota.id);
    return res.status(200).contentType("application/pdf").sendFile(pdfPath);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao recuperar PDF" });
  }
};
