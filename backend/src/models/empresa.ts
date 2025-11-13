export interface Empresa {
  id: number;
  razao_social: string;
  nome_fantasia: string;
  cnpj: string;
  ie: string;
  endereco: string;
  cidade: string;
  uf: string;
  cep: string;
  crt: string;
  serie_nfe: number;
  numero_atual_nfe: number;
  certificado_pfx: Buffer | string;
  certificado_senha: string;
  token_empresa: string;
  criado_em: string;
}
