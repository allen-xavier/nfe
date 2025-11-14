import crypto from "crypto";

const UF_CODES: Record<string, number> = {
  AC: 12,
  AL: 27,
  AP: 16,
  AM: 13,
  BA: 29,
  CE: 23,
  DF: 53,
  ES: 32,
  GO: 52,
  MA: 21,
  MT: 51,
  MS: 50,
  MG: 31,
  PA: 15,
  PB: 25,
  PR: 41,
  PE: 26,
  PI: 22,
  RJ: 33,
  RN: 24,
  RS: 43,
  RO: 11,
  RR: 14,
  SC: 42,
  SP: 35,
  SE: 28,
  TO: 17,
};

export interface ChaveAcessoOptions {
  cnpj: string;
  serie: number;
  numero: number;
  uf?: string;
  data?: Date;
  formaEmissao?: string;
  codigoNumerico?: string;
}

const pad = (value: string | number, length: number) => `${value}`.padStart(length, "0");

const calcularDigito = (base: string): number => {
  const digits = base.split("").map((char) => Number(char));
  let soma = 0;
  let peso = 2;

  for (let index = digits.length - 1; index >= 0; index -= 1) {
    soma += digits[index] * peso;
    peso += 1;
    if (peso > 9) {
      peso = 2;
    }
  }

  const resto = soma % 11;
  const digito = 11 - resto;
  if (digito === 10 || digito === 11) {
    return 0;
  }
  return digito;
};

export const gerarChaveAcesso = ({
  cnpj,
  serie,
  numero,
  uf = "MG",
  data = new Date(),
  formaEmissao = "1",
  codigoNumerico,
}: ChaveAcessoOptions): string => {
  const codigoUf = UF_CODES[uf.toUpperCase()] ?? UF_CODES["MG"];
  const anoMes = `${data.getFullYear().toString().slice(-2)}${pad(data.getMonth() + 1, 2)}`;
  const cnpjPadded = pad(cnpj.replace(/\D/g, ""), 14);
  const codigoNum = codigoNumerico ?? crypto.randomInt(0, 100_000_000).toString().padStart(8, "0");
  const modelo = process.env.NFE_MODELO ?? "55";
  const base = `${pad(codigoUf, 2)}${anoMes}${cnpjPadded}${modelo}${pad(serie, 3)}${pad(
    numero,
    9
  )}${pad(formaEmissao, 1)}${codigoNum}`;

  const digito = calcularDigito(base);
  return `${base}${digito}`;
};
