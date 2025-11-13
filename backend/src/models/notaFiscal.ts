export type NotaStatus = "AUTORIZADA" | "REJEITADA";

export interface NotaFiscal {
  id: number;
  empresa_id: number;
  chave_acesso: string;
  numero: number;
  serie: number;
  destinatario_nome: string;
  destinatario_cpf: string;
  destinatario_endereco: string;
  destinatario_uf: string;
  total: number;
  xml_autorizado: Buffer | string;
  status: NotaStatus;
  codigo_rejeicao?: string;
  mensagem_rejeicao?: string;
  criado_em: string;
}
