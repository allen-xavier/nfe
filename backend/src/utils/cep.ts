import axios from "axios";

const MUNICIPIO_CACHE = new Map<string, string>();

const sanitizeCep = (cep: string) => cep.replace(/\D/g, "");

export const resolveMunicipioPorCep = async (cep: string): Promise<string> => {
  const normalized = sanitizeCep(cep);
  if (normalized.length !== 8) {
    throw new Error(`CEP inválido: ${cep}`);
  }

  if (MUNICIPIO_CACHE.has(normalized)) {
    return MUNICIPIO_CACHE.get(normalized)!;
  }

  const response = await axios.get(`https://viacep.com.br/ws/${normalized}/json/`);
  const data = response.data;
  if (data?.erro) {
    throw new Error(`CEP não encontrado: ${cep}`);
  }

  const ibgeCode = data?.ibge;
  if (!ibgeCode) {
    throw new Error(`Viacep não retornou o código IBGE para o CEP ${cep}`);
  }

  MUNICIPIO_CACHE.set(normalized, ibgeCode);
  return ibgeCode;
};
