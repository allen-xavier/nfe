import { query } from "../db";
import { encrypt } from "../utils/security";
import { generateToken } from "../utils/token";

export interface CreateEmpresaDTO {
  razao_social: string;
  nome_fantasia: string;
  cnpj: string;
  ie: string;
  endereco: string;
  cidade: string;
  uf: string;
  cep: string;
  crt: string;
  certificado_pfx: string;
  certificado_senha: string;
}

export const createEmpresa = async (payload: CreateEmpresaDTO) => {
  const token_empresa = generateToken();
  const encryptedSenha = encrypt(payload.certificado_senha);

  const result = await query(
    `INSERT INTO empresas (
      razao_social, nome_fantasia, cnpj, ie, endereco, cidade, uf, cep, crt,
      serie_nfe, numero_atual_nfe, certificado_pfx, certificado_senha, token_empresa
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
    RETURNING *`,
    [
      payload.razao_social,
      payload.nome_fantasia,
      payload.cnpj,
      payload.ie,
      payload.endereco,
      payload.cidade,
      payload.uf,
      payload.cep,
      payload.crt,
      1,
      0,
      Buffer.from(payload.certificado_pfx, "base64"),
      encryptedSenha,
      token_empresa,
    ]
  );

  return result.rows[0];
};

export const findEmpresaByToken = async (token: string) => {
  const result = await query("SELECT * FROM empresas WHERE token_empresa = $1", [token]);
  return result.rows[0];
};

export const incrementNumeroNota = async (empresaId: number) => {
  const result = await query(
    "UPDATE empresas SET numero_atual_nfe = numero_atual_nfe + 1 WHERE id = $1 RETURNING numero_atual_nfe",
    [empresaId]
  );
  return result.rows[0].numero_atual_nfe;
};
