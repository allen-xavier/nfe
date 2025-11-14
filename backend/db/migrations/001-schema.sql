CREATE TABLE empresas (
  id SERIAL PRIMARY KEY,
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT NOT NULL,
  cnpj VARCHAR(14) NOT NULL UNIQUE,
  ie TEXT NOT NULL,
  endereco TEXT NOT NULL,
  cidade TEXT NOT NULL,
  uf VARCHAR(2) NOT NULL,
  cep VARCHAR(20) NOT NULL,
  crt TEXT NOT NULL,
  serie_nfe INTEGER NOT NULL DEFAULT 1,
  numero_atual_nfe INTEGER NOT NULL DEFAULT 0,
  certificado_pfx BYTEA,
  certificado_senha TEXT,
  token_empresa UUID NOT NULL UNIQUE,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE notas_fiscais (
  id SERIAL PRIMARY KEY,
  empresa_id INTEGER REFERENCES empresas(id),
  chave_acesso VARCHAR(44) NOT NULL UNIQUE,
  numero INTEGER NOT NULL,
  serie INTEGER NOT NULL,
  destinatario_nome TEXT NOT NULL,
  destinatario_cpf VARCHAR(11) NOT NULL,
  destinatario_endereco TEXT NOT NULL,
  destinatario_uf VARCHAR(2) NOT NULL,
  total NUMERIC(12,2) NOT NULL,
  xml_autorizado BYTEA,
  status VARCHAR(20) NOT NULL,
  codigo_rejeicao TEXT,
  mensagem_rejeicao TEXT,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE itens_nota (
  id SERIAL PRIMARY KEY,
  nota_id INTEGER REFERENCES notas_fiscais(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  ncm VARCHAR(8) NOT NULL,
  cfop VARCHAR(4) NOT NULL,
  quantidade NUMERIC NOT NULL,
  valor_unitario NUMERIC(12,2) NOT NULL,
  csosn VARCHAR(3) NOT NULL DEFAULT '102',
  total_item NUMERIC(12,2) NOT NULL
);
